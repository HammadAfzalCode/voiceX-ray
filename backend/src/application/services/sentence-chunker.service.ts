import type { Sentence } from '@domain/value-objects/sentence';

const ABBREVIATIONS = new Set([
  'mr',
  'mrs',
  'ms',
  'dr',
  'prof',
  'sr',
  'jr',
  'vs',
  'etc',
  'ie',
  'eg',
  'approx',
  'dept',
  'est',
  'govt',
  'inc',
  'ltd',
  'corp',
  'fig',
  'vol',
  'no',
  'pp',
]);

const SENTENCE_END_RE = /[.!?]+\s/g;

export class SentenceChunkerService {
  private buffer = '';

  feed(token: string): Sentence[] {
    this.buffer += token;
    return this.extractSentences();
  }

  flush(): Sentence[] {
    const trimmed = this.buffer.trim();
    this.buffer = '';
    if (trimmed.length === 0) return [];
    return [{ text: trimmed }];
  }

  reset(): void {
    this.buffer = '';
  }

  private extractSentences(): Sentence[] {
    const sentences: Sentence[] = [];
    let lastIndex = 0;
    SENTENCE_END_RE.lastIndex = 0;

    let match: RegExpExecArray | null;
    while ((match = SENTENCE_END_RE.exec(this.buffer)) !== null) {
      const end = match.index + match[0].length;
      const candidate = this.buffer.slice(lastIndex, end).trim();

      if (this.isAbbreviation(candidate)) continue;

      if (candidate.length > 0) {
        sentences.push({ text: candidate });
        lastIndex = end;
      }
    }

    if (lastIndex > 0) {
      this.buffer = this.buffer.slice(lastIndex);
    }

    return sentences;
  }

  private isAbbreviation(candidate: string): boolean {
    const words = candidate.split(/\s+/);
    const lastWord = words[words.length - 1];
    if (!lastWord) return false;
    const stem = lastWord.replace(/\.$/, '').toLowerCase();
    return ABBREVIATIONS.has(stem);
  }
}
