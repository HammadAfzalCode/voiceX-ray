import { z } from 'zod';

import type { ToolSpec } from '@domain/ports/tool-registry.port';

const argsSchema = z.object({
  question: z.string().describe('The question to look up in the knowledge base'),
});

export const knowledgeSpec: ToolSpec = {
  name: 'lookup_knowledge',
  description:
    'Look up factual information about Voice X-Ray, its architecture, and AI concepts from the knowledge base.',
  parameters: argsSchema,
};

const FAQ = new Map<string, string>([
  [
    'voice x-ray',
    'Voice X-Ray is a real-time voice AI that makes its internal pipeline visible. It shows each stage — speech recognition, LLM thinking, sentence chunking, and TTS synthesis — as a live latency dashboard called the Living Latency Spine.',
  ],
  [
    'living latency spine',
    'The Living Latency Spine is the signature dashboard of Voice X-Ray. Six animated segments — HEAR, THINK, COMPOSE, TOOL, VOICE, SPEAK — each light up in amber when that pipeline stage runs, then freeze with the final millisecond count.',
  ],
  [
    'latency',
    'Voice X-Ray measures latency at seven stages: transcript_received, llm_request_sent, llm_first_token, first_sentence_ready, first_tts_audio, tool_call timing, and turn_complete. End-to-end with ElevenLabs is typically 400–900 ms.',
  ],
  [
    'elevenlabs',
    'ElevenLabs provides the text-to-speech voice in demo mode. Voice X-Ray streams audio chunks before the LLM finishes generating, overlapping synthesis with generation to reduce perceived latency.',
  ],
  [
    'openrouter',
    'OpenRouter is the LLM gateway used by Voice X-Ray. It provides an OpenAI-compatible API routing to models like GPT-4o Mini, Claude, and Gemini.',
  ],
  [
    'sentence chunking',
    'Sentence chunking splits the LLM token stream into complete sentences at punctuation boundaries. Each sentence goes to TTS immediately, so audio starts before the LLM finishes — the primary latency optimization.',
  ],
  [
    'clean architecture',
    'Voice X-Ray uses Clean Architecture: Domain (ports, entities, value objects), Application (use cases), Infrastructure (LLM/TTS/tool adapters), and Interface (WebSocket gateway). The domain layer has zero external dependencies.',
  ],
  [
    'tool calling',
    'Voice X-Ray supports tool calling via OpenRouter. The LLM requests a tool, the TOOL spine segment lights up while it executes, then results feed back for a second LLM pass that produces the spoken answer.',
  ],
]);

export function executeKnowledge(rawArgs: unknown): unknown {
  const { question } = argsSchema.parse(rawArgs);
  const query = question.toLowerCase();

  for (const [key, answer] of FAQ) {
    if (query.includes(key)) {
      return { answer, found: true };
    }
  }

  for (const [key, answer] of FAQ) {
    const words = key.split(' ');
    if (words.some((w) => w.length > 4 && query.includes(w))) {
      return { answer, found: true };
    }
  }

  return {
    answer:
      'No specific information found. Voice X-Ray is a real-time voice AI with a live latency dashboard.',
    found: false,
  };
}
