export interface RecorderCallbacks {
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (message: string) => void;
}

type WebkitWindow = typeof window & {
  webkitSpeechRecognition?: typeof SpeechRecognition;
};

export class Recorder {
  private recognition: SpeechRecognition | null = null;
  private readonly callbacks: RecorderCallbacks;
  private running = false;

  constructor(callbacks: RecorderCallbacks) {
    this.callbacks = callbacks;
  }

  start(): void {
    if (this.running) return;

    const Ctor =
      window.SpeechRecognition ?? (window as WebkitWindow).webkitSpeechRecognition;

    if (!Ctor) {
      this.callbacks.onError(
        'SpeechRecognition is not supported. Open this in Chrome.',
      );
      return;
    }

    this.recognition = new Ctor();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result) continue;
        const transcript = result[0]?.transcript ?? '';
        if (result.isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (interim) this.callbacks.onInterim(interim);
      if (final.trim()) this.callbacks.onFinal(final.trim());
    };

    this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // no-speech is normal — the recognition restarts automatically.
      if (event.error === 'no-speech') return;
      this.callbacks.onError(`Mic error: ${event.error}`);
    };

    this.recognition.onend = () => {
      // Chrome stops the recognition after silence; restart if we're still active.
      if (this.running && this.recognition) {
        try {
          this.recognition.start();
        } catch {
          // start() throws if called while already running — safe to ignore.
        }
      }
    };

    this.running = true;
    this.recognition.start();
  }

  stop(): void {
    this.running = false;
    this.recognition?.stop();
    this.recognition = null;
  }

  get isRunning(): boolean {
    return this.running;
  }
}
