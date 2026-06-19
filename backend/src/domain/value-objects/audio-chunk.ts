export interface AudioChunk {
  readonly seq: number;
  readonly data: Uint8Array;
  readonly mime: string;
}
