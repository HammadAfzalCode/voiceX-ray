import './styles/tokens.css';
import './styles/global.css';
import './styles/readout.css';
import './styles/spine.css';
import './styles/tool-cards.css';

import { Player } from '@audio/player';
import { Recorder } from '@audio/recorder';
import { Readout } from '@ui/readout';
import { connectSocket, getSocket } from '@ws/socket';
import type {
  LlmSentencePayload,
  LlmTokenPayload,
  SttFinalPayload,
  TtsAudioPayload,
  TurnEndPayload,
  TurnStartPayload,
} from '@ws/ws-messages';
import { WsEvents } from '@ws/ws-messages';

// ─── DOM ──────────────────────────────────────────────────────────────────────

const speakBtn = document.getElementById('speak-btn') as HTMLButtonElement;
const statusDot = document.getElementById('status-dot')!;
const statusLabel = document.getElementById('status-label')!;
const readoutEl = document.getElementById('readout')!;
const emptyState = document.getElementById('empty-state')!;

// ─── State ────────────────────────────────────────────────────────────────────

type Status = 'idle' | 'listening' | 'thinking' | 'speaking';

const readout = new Readout(readoutEl);
const player = new Player();

function setStatus(state: Status): void {
  const labels: Record<Status, string> = {
    idle: 'IDLE',
    listening: 'LISTENING',
    thinking: 'THINKING',
    speaking: 'SPEAKING',
  };
  statusLabel.textContent = labels[state];
  statusDot.dataset.state = state;
}

// ─── Speech synthesis (client TTS mode) ──────────────────────────────────────

const synthQueue: string[] = [];
let isSpeaking = false;

function drainSynthQueue(): void {
  if (isSpeaking || synthQueue.length === 0) return;
  const text = synthQueue.shift();
  if (!text) return;

  isSpeaking = true;
  setStatus('speaking');

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.onend = () => {
    isSpeaking = false;
    if (synthQueue.length > 0) {
      drainSynthQueue();
    } else {
      setStatus('idle');
    }
  };
  utterance.onerror = () => {
    isSpeaking = false;
    setStatus('idle');
  };

  window.speechSynthesis.speak(utterance);
}

function enqueueSpeech(text: string): void {
  synthQueue.push(text);
  drainSynthQueue();
}

// ─── Token rAF batching ───────────────────────────────────────────────────────

let pendingTokens = '';
let rafPending = false;

function flushTokens(): void {
  if (pendingTokens) {
    readout.appendToken(pendingTokens);
    pendingTokens = '';
  }
  rafPending = false;
}

// ─── Base64 → Uint8Array ──────────────────────────────────────────────────────

function base64ToBytes(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const buffer = new ArrayBuffer(binary.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    view[i] = binary.charCodeAt(i);
  }
  return buffer;
}

// ─── Recorder ────────────────────────────────────────────────────────────────

const recorder = new Recorder({
  onInterim: (_text) => {
    // Interim results not shown in Phase 3 — used in Phase 4 readout.
  },
  onFinal: (text) => {
    getSocket().emit(WsEvents.USER_TRANSCRIPT, { text, isFinal: true });
    emptyState.style.display = 'none';
  },
  onError: (message) => {
    console.error('[recorder]', message);
    speakBtn.textContent = 'Speak';
    setStatus('idle');
  },
});

// ─── Socket events ────────────────────────────────────────────────────────────

const socket = getSocket();
let elevenLabsMode = false;

socket.on(WsEvents.TURN_START, (_payload: TurnStartPayload) => {
  elevenLabsMode = false;
  readout.startAgentTurn();
  setStatus('thinking');
});

socket.on(WsEvents.STT_FINAL, (payload: SttFinalPayload) => {
  readout.appendUserLine(payload.text);
});

socket.on(WsEvents.LLM_TOKEN, (payload: LlmTokenPayload) => {
  pendingTokens += payload.token;
  if (!rafPending) {
    rafPending = true;
    requestAnimationFrame(flushTokens);
  }
});

socket.on(WsEvents.LLM_SENTENCE, (payload: LlmSentencePayload) => {
  if (!elevenLabsMode) enqueueSpeech(payload.text);
});

socket.on(WsEvents.TTS_AUDIO, (payload: TtsAudioPayload) => {
  elevenLabsMode = true;
  player.pushChunk(base64ToBytes(payload.data), payload.mime);
  setStatus('speaking');
});

socket.on(WsEvents.TURN_END, (_payload: TurnEndPayload) => {
  flushTokens();
  readout.settleAgentTurn();
  player.endTurn();
  if (elevenLabsMode) {
    setStatus('idle'); // TODO Phase 3b: transition on audio.ended instead
  } else if (synthQueue.length === 0 && !isSpeaking) {
    setStatus('idle');
  }
});

// ─── Controls ────────────────────────────────────────────────────────────────

speakBtn.addEventListener('click', () => {
  if (recorder.isRunning) {
    recorder.stop();
    speakBtn.textContent = 'Speak';
    setStatus('idle');
  } else {
    connectSocket();
    recorder.start();
    speakBtn.textContent = 'Stop';
    setStatus('listening');
  }
});

// ─── Init ─────────────────────────────────────────────────────────────────────

setStatus('idle');
