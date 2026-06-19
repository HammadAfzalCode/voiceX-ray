// Phase 3a: MediaSource mp3 player.
// TODO Phase 3b: swap to Web Audio API PCM player for lower latency.

export class Player {
  private readonly audio: HTMLAudioElement;
  private ms: MediaSource | null = null;
  private sb: SourceBuffer | null = null;
  private readonly queue: ArrayBuffer[] = [];
  private ready = false;
  private playing = false;
  private endOnDrain = false;

  constructor() {
    this.audio = new Audio();
  }

  pushChunk(data: ArrayBuffer, mime: string): void {
    if (!this.ms) {
      this.ms = new MediaSource();
      this.audio.src = URL.createObjectURL(this.ms);
      this.ms.addEventListener('sourceopen', () => {
        const ms = this.ms;
        if (!ms) return;
        this.sb = ms.addSourceBuffer(mime);
        this.sb.addEventListener('updateend', () => {
          this.drainQueue();
        });
        this.ready = true;
        this.drainQueue();
      });
    }
    this.queue.push(data);
    if (this.ready) this.drainQueue();
  }

  endTurn(): void {
    this.endOnDrain = true;
    if (this.ready) this.drainQueue();
  }

  stop(): void {
    this.audio.pause();
    this.audio.src = '';
    this.ms = null;
    this.sb = null;
    this.queue.length = 0;
    this.ready = false;
    this.playing = false;
    this.endOnDrain = false;
  }

  private drainQueue(): void {
    const sb = this.sb;
    if (!sb || sb.updating) return;

    const chunk = this.queue.shift();
    if (chunk) {
      sb.appendBuffer(chunk);
      if (!this.playing) {
        this.playing = true;
        void this.audio.play().catch((err: unknown) => {
          console.warn('[player] autoplay blocked:', err);
        });
      }
      return;
    }

    if (this.endOnDrain && this.ms?.readyState === 'open') {
      this.ms.endOfStream();
      this.endOnDrain = false;
    }
  }
}
