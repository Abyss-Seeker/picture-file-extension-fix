import React, { useState, useRef, useCallback } from 'react';
import JSZip from 'jszip';
import FileSaver from 'file-saver';
import { FolderOpen, Download, AlertCircle, FileSearch, Sparkles, Folder } from 'lucide-react';
import { ProcessState, ProcessedFile, ProcessingStats } from './types';
import { detectMimeType, getExtension, shouldSkipFile } from './utils/fileSignatures';
import { ProcessView } from './components/ProcessView';

function App() {
  const [state, setState] = useState<ProcessState>(ProcessState.IDLE);
  const [stats, setStats] = useState<ProcessingStats>({ total: 0, fixed: 0, processed: 0, startTime: 0 });
  const [currentFile, setCurrentFile] = useState<string>("");
  const [logs, setLogs] = useState<ProcessedFile[]>([]);
  const [zipBlob, setZipBlob] = useState<Blob | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFolderSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    // Filter out system files or non-relevant files early to get a count
    // Explicitly casting or typing to ensure TS knows these are Files
    const validFiles = (Array.from(files) as File[]).filter((f) => !shouldSkipFile(f.name));

    if (validFiles.length === 0) {
      setErrorMsg("No valid files found in the selected folder.");
      return;
    }

    startProcessing(validFiles);
  };

  const startProcessing = async (files: File[]) => {
    setState(ProcessState.READING);
    setStats({ total: files.length, fixed: 0, processed: 0, startTime: Date.now() });
    setLogs([]);
    setZipBlob(null);
    setErrorMsg("");

    const processedFiles: ProcessedFile[] = [];
    const zip = new JSZip();

    try {
      setState(ProcessState.PROCESSING);
      
      let fixedCount = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Use webkitRelativePath to maintain folder structure inside the zip
        const relativePath = file.webkitRelativePath || file.name;
        setCurrentFile(relativePath);

        const realType = await detectMimeType(file);
        const currentExt = getExtension(file.name);
        
        let newName = file.name;
        let finalPath = relativePath;
        let status: 'fixed' | 'unchanged' | 'skipped' = 'unchanged';

        // Logic to determine if we need to rename
        if (realType !== 'unknown') {
            // If the extension doesn't match the real type
            // e.g., image.jpg (real: gif) -> mismatch
            // e.g., image (no ext) (real: png) -> mismatch
            
            // Standardize extension checking
            const isMatch = currentExt === realType;
            // Also handle jpeg vs jpg
            const isJpgMatch = (currentExt === 'jpeg' && realType === 'jpg') || (currentExt === 'jpg' && realType === 'jpg');
            
            if (!isMatch && !isJpgMatch) {
                // Determine new filename
                const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                newName = `${nameWithoutExt}.${realType}`;
                
                // Determine new path (replace extension in path)
                const pathParts = relativePath.split('/');
                const fileNameIdx = pathParts.length - 1;
                pathParts[fileNameIdx] = newName;
                finalPath = pathParts.join('/');
                
                status = 'fixed';
                fixedCount++;
            }
        } else {
          // If we can't identify it, we just keep it as is, or skip if it's not what we want?
          // Requirement: "Read folder... fix gif/png/jpg". Implies we keep everything but fix what we can.
          status = 'unchanged';
        }

        // Add to Zip
        // We add the file Blob directly. JSZip handles it efficiently.
        zip.file(finalPath, file);

        const logEntry: ProcessedFile = {
            originalName: file.name,
            newName: newName,
            originalPath: relativePath,
            detectedType: realType,
            status,
            blob: file
        };

        processedFiles.push(logEntry);
        
        // Update Stats (using functional update to ensure fresh state if async causes race, though loop is awaited)
        // For UI performance, maybe update logs in chunks, but for < 1000 files this is fine.
        // We limit log size in UI to avoid DOM explosion
        setLogs(prev => [logEntry, ...prev].slice(0, 500)); 
        setStats(prev => ({ ...prev, processed: i + 1, fixed: fixedCount }));
        
        // Small delay to let UI breathe if needed, or remove for max speed
        // await new Promise(r => setTimeout(r, 0));
      }

      setState(ProcessState.ZIPPING);
      const content = await zip.generateAsync({ type: "blob" });
      setZipBlob(content);
      setState(ProcessState.COMPLETED);

    } catch (err) {
      console.error(err);
      setState(ProcessState.ERROR);
      setErrorMsg("An error occurred while processing files. Please try again.");
    }
  };

  const downloadZip = () => {
    if (zipBlob) {
      // file-saver from esm.sh usually exports the function as default
      const saveAs = (FileSaver as any).saveAs || FileSaver;
      saveAs(zipBlob, "fixed_images.zip");
    }
  };

  const reset = () => {
    setState(ProcessState.IDLE);
    setLogs([]);
    setZipBlob(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-slate-200 p-8 flex flex-col items-center">
      
      {/* Header */}
      <header className="mb-12 text-center max-w-2xl">
        <div className="inline-flex items-center justify-center p-3 bg-indigo-500/10 rounded-2xl mb-4 border border-indigo-500/20 shadow-lg shadow-indigo-500/10">
            <Sparkles className="w-6 h-6 text-indigo-400 mr-2" />
            <span className="text-indigo-300 font-semibold tracking-wide uppercase text-sm">Magic Format Recovery</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 mb-4 tracking-tight">
          Extension Fixer
        </h1>
        <p className="text-lg text-slate-400 leading-relaxed">
          Select a folder. We scan the <strong>magic numbers</strong> (file signatures) of every file. 
          If a GIF is hiding as a JPG, or a PNG has the wrong extension, we fix it and zip it all up for you.
          <br/><span className="text-sm opacity-60">Everything happens locally in your browser.</span>
        </p>
      </header>

      {/* Main Content Area */}
      <main className="w-full max-w-2xl flex flex-col items-center gap-8">
        
        {/* Error State */}
        {state === ProcessState.ERROR && (
          <div className="w-full bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-xl flex items-center gap-3">
            <AlertCircle className="shrink-0" />
            <p>{errorMsg}</p>
            <button onClick={reset} className="ml-auto text-sm underline hover:text-white">Try Again</button>
          </div>
        )}

        {/* Idle State - Dropzone */}
        {state === ProcessState.IDLE && (
          <div 
            className="w-full h-64 border-2 border-dashed border-slate-600 hover:border-indigo-400 hover:bg-slate-800/50 transition-all duration-300 rounded-2xl flex flex-col items-center justify-center cursor-pointer group bg-slate-800/20"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="p-4 bg-slate-800 rounded-full mb-4 group-hover:scale-110 transition-transform shadow-xl">
              <FolderOpen className="w-8 h-8 text-indigo-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Select a Folder</h3>
            <p className="text-slate-400 text-sm max-w-xs text-center">
              Click to browse your local directory. <br/> We'll scan recursively.
            </p>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              {...({ webkitdirectory: "", directory: "" } as any)}
              multiple 
              onChange={handleFolderSelect} 
            />
          </div>
        )}

        {/* Processing State */}
        {(state === ProcessState.READING || state === ProcessState.PROCESSING || state === ProcessState.ZIPPING) && (
          <ProcessView state={state} stats={stats} currentFile={currentFile} logs={logs} />
        )}

        {/* Completed State */}
        {state === ProcessState.COMPLETED && (
          <div className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center shadow-2xl">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-400">
               <Download className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Processing Complete!</h2>
            <p className="text-slate-400 mb-8">
              We processed <span className="text-white font-mono">{stats.total}</span> files and fixed <span className="text-emerald-400 font-mono font-bold">{stats.fixed}</span> incorrect extensions.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={downloadZip}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-lg shadow-indigo-500/25 transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Download ZIP
              </button>
              <button 
                onClick={reset}
                className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <Folder className="w-4 h-4" /> Process New Folder
              </button>
            </div>
          </div>
        )}

        {/* Features Grid (Only show on Idle) */}
        {state === ProcessState.IDLE && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mt-4">
             <FeatureCard 
               icon={<FileSearch className="text-blue-400" />} 
               title="Magic Numbers" 
               desc="Detects actual file signatures (bytes), ignoring misleading extensions."
             />
             <FeatureCard 
               icon={<Sparkles className="text-purple-400" />} 
               title="Auto-Fix" 
               desc="Restores .gif, .png, .jpg, and .webp files to their rightful format."
             />
             <FeatureCard 
               icon={<Download className="text-emerald-400" />} 
               title="Batch Zip" 
               desc="Downloads your entire corrected folder structure as a single ZIP."
             />
          </div>
        )}
      </main>

      <footer className="mt-auto pt-12 text-slate-600 text-sm">
        <p>&copy; {new Date().getFullYear()} Image Format Fixer. Runs locally.</p>
      </footer>
    </div>
  );
}

const FeatureCard = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
  <div className="bg-slate-800/30 border border-slate-700/50 p-4 rounded-xl backdrop-blur-sm">
    <div className="mb-3">{icon}</div>
    <h4 className="text-white font-medium mb-1">{title}</h4>
    <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
  </div>
);

export default App;