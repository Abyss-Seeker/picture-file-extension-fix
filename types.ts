export enum ProcessState {
  IDLE = 'IDLE',
  READING = 'READING',
  PROCESSING = 'PROCESSING',
  ZIPPING = 'ZIPPING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface ProcessedFile {
  originalName: string;
  newName: string;
  originalPath: string; // Relative path in folder
  detectedType: 'png' | 'jpg' | 'gif' | 'webp' | 'unknown';
  status: 'fixed' | 'unchanged' | 'skipped';
  blob: Blob;
}

export interface ProcessingStats {
  total: number;
  fixed: number;
  processed: number;
  startTime: number;
}
