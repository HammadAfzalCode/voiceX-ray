import { describe, expect, it, beforeEach } from 'vitest';

import { SentenceChunkerService } from '@application/services/sentence-chunker.service';

describe('SentenceChunkerService', () => {
  let chunker: SentenceChunkerService;

  beforeEach(() => {
    chunker = new SentenceChunkerService();
  });

  it('emits a sentence when it ends with a period followed by space', () => {
    const result = chunker.feed('Hello world. ');
    expect(result).toEqual([{ text: 'Hello world.' }]);
  });

  it('emits a sentence on exclamation mark', () => {
    const result = chunker.feed('Hello! ');
    expect(result).toEqual([{ text: 'Hello!' }]);
  });

  it('emits a sentence on question mark', () => {
    const result = chunker.feed('Really? ');
    expect(result).toEqual([{ text: 'Really?' }]);
  });

  it('accumulates tokens across multiple feeds', () => {
    chunker.feed('Hello');
    chunker.feed(' world');
    const result = chunker.feed('. ');
    expect(result).toEqual([{ text: 'Hello world.' }]);
  });

  it('emits multiple sentences from one feed call', () => {
    const result = chunker.feed('One. Two. Three! ');
    expect(result.map((s) => s.text)).toEqual(['One.', 'Two.', 'Three!']);
  });

  it('does not split on Dr. abbreviation', () => {
    const result = chunker.feed('Dr. Smith arrived. ');
    expect(result).toEqual([{ text: 'Dr. Smith arrived.' }]);
  });

  it('does not split on Mr. abbreviation', () => {
    chunker.feed('Mr. ');
    const result = chunker.feed('Jones said hello. ');
    expect(result).toEqual([{ text: 'Mr. Jones said hello.' }]);
  });

  it('flush emits remaining buffer as a sentence', () => {
    chunker.feed('Trailing text');
    const result = chunker.flush();
    expect(result).toEqual([{ text: 'Trailing text' }]);
  });

  it('flush on empty buffer returns empty array', () => {
    const result = chunker.flush();
    expect(result).toEqual([]);
  });

  it('feed with empty string returns empty array', () => {
    const result = chunker.feed('');
    expect(result).toEqual([]);
  });

  it('reset clears the buffer', () => {
    chunker.feed('Some text');
    chunker.reset();
    const result = chunker.flush();
    expect(result).toEqual([]);
  });
});
