import React from 'react';
import { Loader2, CheckCircle2, FileImage, RefreshCcw } from 'lucide-react';
import { ProcessState, ProcessingStats, ProcessedFile } from '../types';

interface ProcessViewProps {
  state: ProcessState;
  stats: ProcessingStats;
  currentFile: string;
  logs: ProcessedFile[];
}

export const ProcessView: React.FC<ProcessViewProps> = ({ state, stats, currentFile, logs }) => {
  const percent = stats.total > 0 ? Math.round((stats.processed / stats.total) * 100) : 0;

  return (
    <div className="w-full max-w-2xl bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-xl p-6 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            {state === ProcessState.ZIPPING ? (
              <>
                <Loader2 className="animate-spin text-indigo-400" /> Archiving...
              </>
            ) : state === ProcessState.COMPLETED ? (
              <>
                <CheckCircle2 className="text-emerald-400" /> Done
              </>
            ) : (
              <>
                <RefreshCcw className="animate-spin text-blue-400" /> Processing Files
              </>
            )}
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            {state === ProcessState.ZIPPING 
              ? "Compressing your fixed files into a ZIP archive." 
              : `Scanning: ${currentFile}`}
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-mono font-bold text-indigo-400">
            {percent}%
          </div>
          <div className="text-xs text-slate-500 font-mono">
            {stats.processed}/{stats.total} FILES
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden mb-8">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300 ease-out"
          style={{ width: `${percent}%` }}
        ></div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
          <div className="text-xs text-slate-500 uppercase font-semibold">Processed</div>
          <div className="text-xl text-white font-mono">{stats.processed}</div>
        </div>
        <div className="bg-slate-900/50 p-3 rounded-lg border border-emerald-900/30">
          <div className="text-xs text-emerald-500 uppercase font-semibold">Fixed</div>
          <div className="text-xl text-emerald-400 font-mono">{stats.fixed}</div>
        </div>
        <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
          <div className="text-xs text-slate-500 uppercase font-semibold">Elapsed</div>
          <div className="text-xl text-white font-mono">
             {((Date.now() - stats.startTime) / 1000).toFixed(1)}s
          </div>
        </div>
      </div>

      {/* Log Window */}
      <div className="bg-black/40 rounded-lg border border-slate-700/50 h-64 overflow-y-auto p-4 font-mono text-xs">
        {logs.length === 0 && (
          <div className="text-slate-600 text-center italic mt-20">Waiting for logs...</div>
        )}
        {logs.map((log, idx) => (
          <div key={idx} className="flex items-start gap-2 mb-2 border-b border-white/5 pb-2 last:border-0 last:pb-0">
            {log.status === 'fixed' ? (
              <span className="text-emerald-400 font-bold px-1.5 py-0.5 bg-emerald-900/30 rounded text-[10px]">FIXED</span>
            ) : log.status === 'skipped' ? (
              <span className="text-amber-500 font-bold px-1.5 py-0.5 bg-amber-900/30 rounded text-[10px]">SKIP</span>
            ) : (
              <span className="text-slate-500 font-bold px-1.5 py-0.5 bg-slate-800 rounded text-[10px]">OK</span>
            )}
            <div className="flex-1 truncate">
              <span className="text-slate-300">{log.originalPath}</span>
              {log.status === 'fixed' && (
                <div className="text-slate-500 flex items-center gap-1 mt-0.5">
                   ↳ Renamed to <span className="text-emerald-300">{log.newName}</span> (Detected: {log.detectedType.toUpperCase()})
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
