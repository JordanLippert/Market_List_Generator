export type WhisperWorkerStatus = 'idle' | 'loading-model' | 'transcribing';

interface WhisperWorkerClientOptions {
  onStatusChange?(status: WhisperWorkerStatus): void;
}

interface WorkerMessage {
  type: 'progress' | 'model-ready' | 'transcript' | 'error';
  payload?: unknown;
}

interface PendingCall<T> {
  resolve(value: T): void;
  reject(err: Error): void;
}

export class WhisperWorkerClient {
  private worker: Worker | null = null;
  private pendingPreload: PendingCall<void> | null = null;
  private pendingTranscribe: PendingCall<string> | null = null;

  constructor(private options: WhisperWorkerClientOptions = {}) {}

  private ensureWorker(): Worker {
    if (this.worker) return this.worker;
    const worker = new Worker('/workers/whisper-worker.js');
    worker.onmessage = (event: MessageEvent<WorkerMessage>) => this.handleMessage(event.data);
    worker.onerror = (event: ErrorEvent) => {
      const err = new Error(event.message || 'Falha no worker de transcrição');
      this.rejectAll(err);
    };
    this.worker = worker;
    return worker;
  }

  private rejectAll(err: Error): void {
    this.pendingPreload?.reject(err);
    this.pendingPreload = null;
    this.pendingTranscribe?.reject(err);
    this.pendingTranscribe = null;
  }

  private handleMessage(data: WorkerMessage): void {
    if (data.type === 'progress') {
      this.options.onStatusChange?.('loading-model');
      return;
    }
    if (data.type === 'model-ready') {
      this.pendingPreload?.resolve();
      this.pendingPreload = null;
      return;
    }
    if (data.type === 'transcript') {
      this.pendingTranscribe?.resolve(data.payload as string);
      this.pendingTranscribe = null;
      return;
    }
    if (data.type === 'error') {
      this.rejectAll(new Error(String(data.payload)));
    }
  }

  preload(): Promise<void> {
    const worker = this.ensureWorker();
    this.options.onStatusChange?.('loading-model');
    return new Promise((resolve, reject) => {
      this.pendingPreload = { resolve, reject };
      worker.postMessage({ type: 'preload' });
    });
  }

  transcribe(samples: Float32Array): Promise<string> {
    const worker = this.ensureWorker();
    this.options.onStatusChange?.('transcribing');
    return new Promise((resolve, reject) => {
      this.pendingTranscribe = { resolve, reject };
      worker.postMessage({ type: 'transcribe', payload: samples }, [samples.buffer]);
    });
  }

  terminate(): void {
    this.worker?.terminate();
    this.worker = null;
    this.pendingPreload = null;
    this.pendingTranscribe = null;
  }
}
