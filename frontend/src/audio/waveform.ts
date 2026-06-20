export class Waveform {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array<ArrayBuffer> | null = null;
  private rafId: number | null = null;
  private readonly reducedMotion: boolean;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Waveform: canvas 2D context unavailable');
    this.ctx = ctx;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  async start(): Promise<void> {
    if (!this.analyser) {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true },
          video: false,
        });
      } catch {
        return; // mic denied — waveform silently disabled
      }

      const audioCtx = new AudioContext();
      this.analyser = audioCtx.createAnalyser();
      this.analyser.fftSize = 64;
      this.analyser.smoothingTimeConstant = 0.8;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(this.analyser);

      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    }

    if (!this.reducedMotion && this.rafId === null) {
      this.drawLoop();
    }
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private drawLoop(): void {
    const analyser = this.analyser;
    const data = this.dataArray;
    if (!analyser || !data) return;

    analyser.getByteFrequencyData(data);
    this.draw(data);
    this.rafId = requestAnimationFrame(() => {
      this.drawLoop();
    });
  }

  private draw(data: Uint8Array): void {
    const { width, height } = this.canvas;
    this.ctx.clearRect(0, 0, width, height);

    const barCount = 20;
    const barW = 5;
    const gap = 1;

    this.ctx.fillStyle = '#ffb454'; // --spark

    for (let i = 0; i < barCount; i++) {
      const bin = Math.floor((i / barCount) * data.length);
      const value = data[bin] ?? 0;
      const barH = Math.max(2, (value / 255) * height);
      this.ctx.fillRect(i * (barW + gap), height - barH, barW, barH);
    }
  }
}
