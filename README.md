# VOICE · X-RAY

> Real-time voice AI with a live pipeline dashboard. Every internal stage — speech recognition, LLM reasoning, tool calls, and TTS synthesis — made visible as it happens.

[![CI](https://github.com/your-org/voice-x-ray/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/voice-x-ray/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## What & Why

Most voice AI demos are black boxes. Voice X-Ray shows you the inside: a living latency spine lights up each pipeline stage in real time, tool cards animate in with a shimmer as the LLM calls external APIs, and a waveform responds to your mic instantly. Built for developers who want to understand, demo, and extend production-grade voice AI.

## Architecture

```
┌─────────────────────────────────┐     ┌────────────────────────────────────┐
│           Browser               │     │         NestJS / Fastify            │
│                                 │     │                                     │
│  Web Speech API (STT)           │ WS  │  VoiceGateway                       │
│    ↓ user.transcript ───────────┼────►│    ↓                                │
│                                 │     │  ProcessUserTurnUseCase              │
│  Living Latency Spine           │     │    ├─ OpenRouterLlmAdapter ──► API   │
│    ↑ latency.mark ──────────────┼─────┤    ├─ SentenceChunker               │
│                                 │     │    ├─ ToolRegistry                   │
│  MediaSource (audio)            │     │    │   ├─ weather  ──► Open-Meteo   │
│    ↑ tts.audio ─────────────────┼─────┤    │   ├─ time                      │
│                                 │     │    │   └─ knowledge                  │
│  ToolCards                      │     │    └─ ElevenLabsTtsAdapter ──► API   │
│    ↑ tool.call / tool.result ───┼─────┤                                     │
│                                 │     │  SocketTurnOutputAdapter             │
│  Waveform visualiser            │     │                                     │
└─────────────────────────────────┘     └────────────────────────────────────┘
```

Pipeline stages tracked in the spine: `HEAR → THINK → COMPOSE → TOOL → VOICE → SPEAK`

## Quick Start

### Prerequisites

- Docker 24+ and Docker Compose
- Chrome (Web Speech API for STT — Firefox and Safari are not supported)
- [OpenRouter](https://openrouter.ai/) API key (LLM)
- [ElevenLabs](https://elevenlabs.io/) API key (TTS — optional; falls back to browser speech)

### 1. Clone & configure

```bash
git clone https://github.com/your-org/voice-x-ray.git
cd voice-x-ray
cp .env.example .env
# Fill in OPENROUTER_API_KEY (required)
# Optionally add ELEVENLABS_API_KEY for high-quality TTS
```

### 2. Run

```bash
docker compose up
```

Open <http://localhost> in Chrome. Press **Speak**, ask something, watch the pipeline.

### 3. Demo mode

Add `?demo=1` to the URL to slow spine animations by 1.5× — useful when recording a screen demo.

## Development

```bash
npm install

# Backend — hot-reload on http://localhost:3000
npm run dev --workspace=backend

# Frontend — Vite dev server on http://localhost:5173
npm run dev --workspace=frontend
```

Set `VITE_BACKEND_URL=http://localhost:3000` in `frontend/.env.local` when running separately.

### Lint & typecheck

```bash
npm run lint:backend
npm run lint:frontend
npm run typecheck:backend
npm run typecheck:frontend
```

### Tests

```bash
npm test
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENROUTER_API_KEY` | Yes | — | OpenRouter API key |
| `OPENROUTER_MODEL` | No | `openai/gpt-4o-mini` | Model slug |
| `ELEVENLABS_API_KEY` | No | — | ElevenLabs key; omit for browser TTS |
| `ELEVENLABS_VOICE_ID` | No | first available | ElevenLabs voice ID |
| `PORT` | No | `3000` | Backend HTTP port |

## STT Note

Voice X-Ray uses the **Web Speech API** for speech-to-text, which is currently only available in **Chrome**. Firefox and Safari will not work. This is intentional — the Web Speech API produces fast, on-device interim results that make barge-in detection possible without server-side STT latency.

To swap in server-side STT (Whisper, Deepgram), implement `SttPort` and inject it into the gateway.

## Adding Tools

Tools live in `backend/src/infrastructure/tools/`. Each tool is a class that implements `ToolSpec` with a Zod schema:

```typescript
// backend/src/infrastructure/tools/my-tool.ts
export const myToolSpec: ToolSpec = {
  name: 'my_tool',
  description: 'What this tool does.',
  parameters: z.object({ query: z.string().describe('The query.') }),
  execute: async (args) => {
    const { query } = args as { query: string };
    return { result: `You asked: ${query}` };
  },
};
```

Then register it in `tool-registry.ts`. The registry converts the Zod schema to OpenAI JSON Schema automatically.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for commit conventions, PR guidelines, and the development workflow.

## License

[MIT](LICENSE)
