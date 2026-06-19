// Phase 3a: MediaSource mp3 player.
// Phase 3b: swap to Web Audio API PCM player for lower latency.

export class Player {
  // Implemented in Phase 3.
  play(_base64: string, _mime: string): void {
    throw new Error('Not yet implemented — Phase 3');
  }

  stop(): void {
    // no-op until Phase 3
  }
}
