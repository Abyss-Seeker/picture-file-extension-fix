/**
 * Reads the first few bytes of a blob to determine its file signature (Magic Numbers).
 * We do not read the whole file to save memory.
 */
export const detectMimeType = async (file: File): Promise<'png' | 'jpg' | 'gif' | 'webp' | 'unknown'> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    // We only need the first 12 bytes to cover our cases
    const blobSlice = file.slice(0, 12);

    reader.onloadend = (e) => {
      if (!e.target || !e.target.result) {
        resolve('unknown');
        return;
      }

      const arr = (new Uint8Array(e.target.result as ArrayBuffer)).subarray(0, 4);
      let header = "";
      for (let i = 0; i < arr.length; i++) {
        header += arr[i].toString(16).toUpperCase();
      }

      // Check against known signatures
      
      // PNG: 89 50 4E 47
      if (header.startsWith("89504E47")) {
        resolve('png');
        return;
      }

      // JPG: FF D8 FF
      // (Often FF D8 FF E0, FF D8 FF E1, etc., but FF D8 FF is standard start)
      if (header.startsWith("FFD8FF")) {
        resolve('jpg');
        return;
      }

      // GIF: 47 49 46 38 (GIF87a or GIF89a)
      if (header.startsWith("47494638")) {
        resolve('gif');
        return;
      }

      // WEBP: RIFF....WEBP
      // The first 4 bytes are '52 49 46 46' ("RIFF")
      // The bytes 8-11 are '57 45 42 50' ("WEBP")
      // We need to check the extended slice for WEBP
      const fullArr = new Uint8Array(e.target.result as ArrayBuffer);
      if (fullArr.length >= 12) {
        const riff = fullArr.slice(0, 4);
        const webp = fullArr.slice(8, 12);
        
        const riffHex = Array.from(riff).map(b => b.toString(16).toUpperCase()).join('');
        const webpHex = Array.from(webp).map(b => b.toString(16).toUpperCase()).join('');

        if (riffHex === "52494646" && webpHex === "57454250") {
          resolve('webp');
          return;
        }
      }

      resolve('unknown');
    };

    reader.onerror = () => {
      resolve('unknown');
    };

    reader.readAsArrayBuffer(blobSlice);
  });
};

export const getExtension = (filename: string): string => {
  const parts = filename.split('.');
  if (parts.length === 1) return '';
  return parts.pop()?.toLowerCase() || '';
};

export const shouldSkipFile = (filename: string): boolean => {
  // Skip hidden files or system files
  if (filename.startsWith('.') || filename.startsWith('__MACOSX')) return true;
  return false;
};
