import './styles/tokens.css';
import './styles/global.css';
import './styles/readout.css';
import './styles/spine.css';
import './styles/tool-cards.css';

import { Player } from '@audio/player';
import { Recorder } from '@audio/recorder';
import { Waveform } from '@audio/waveform';
import { Readout } from '@ui/readout';
import { Spine } from '@ui/spine';
import { ToolCards } from '@ui/tool-cards';
import { connectSocket, getSocket } from '@ws/socket';
import type {
  LatencyMarkPayload,
  LlmSentencePayload,
  LlmTokenPayload,
  SttFinalPayload,
  ToolCallPayload,
  ToolResultPayload,
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
const spineContainer = document.getElementById('spine-container')!;
const waveformCanvas = document.getElementById('waveform') as HTMLCanvasElement;
const toolCardsEl = document.getElementById('tool-cards')!;

// ─── State ────────────────────────────────────────────────────────────────────

type Status = 'idle' | 'listening' | 'thinking' | 'speaking';

const readout = new Readout(readoutEl);
const player = new Player();
const spine = new Spine(spineContainer);
const waveform = new Waveform(waveformCanvas);
const toolCards = new ToolCards(toolCardsEl);

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

// ─── Base64 → ArrayBuffer ─────────────────────────────────────────────────────

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
    if (!bargeInFired && elevenLabsMode && player.isPlaying) {
      bargeInFired = true;
      socket.emit(WsEvents.USER_INTERRUPT, {});
      player.stop();
      window.speechSynthesis.cancel();
      spine.reset();
      toolCards.clear();
      setStatus('listening');
    }
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
let bargeInFired = false;

socket.on(WsEvents.TURN_START, (_payload: TurnStartPayload) => {
  elevenLabsMode = false;
  bargeInFired = false;
  spine.reset();
  player.stop();
  toolCards.clear();
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

socket.on(WsEvents.TOOL_CALL, (payload: ToolCallPayload) => {
  toolCards.addCard(payload.callId, payload.name, payload.args);
});

socket.on(WsEvents.TOOL_RESULT, (payload: ToolResultPayload) => {
  toolCards.fillResult(payload.callId, payload.result);
});

socket.on(WsEvents.LATENCY_MARK, (payload: LatencyMarkPayload) => {
  const { stage, tMs } = payload;
  switch (stage) {
    case 'transcript_received':
      spine.ignite('HEAR');
      break;
    case 'llm_request_sent':
      spine.settle('HEAR', tMs);
      spine.ignite('THINK');
      break;
    case 'llm_first_token':
      spine.settle('THINK', tMs);
      spine.ignite('COMPOSE');
      break;
    case 'tool_call_start':
      spine.settle('COMPOSE', tMs);
      spine.ignite('TOOL');
      break;
    case 'tool_call_end':
      spine.settle('TOOL', tMs);
      spine.ignite('COMPOSE');
      break;
    case 'first_sentence_ready':
      spine.settle('COMPOSE', tMs);
      spine.ignite('VOICE');
      break;
    case 'first_tts_audio':
      spine.settle('VOICE', tMs);
      spine.ignite('SPEAK');
      break;
    default:
      break;
  }
});

socket.on(WsEvents.TURN_END, (payload: TurnEndPayload) => {
  flushTokens();
  readout.settleAgentTurn();
  player.endTurn();
  const turnComplete = payload.latencyTrace.turn_complete ?? 0;
  spine.settleActive(turnComplete);
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
    waveform.stop();
    speakBtn.textContent = 'Speak';
    setStatus('idle');
  } else {
    connectSocket();
    recorder.start();
    void waveform.start();
    speakBtn.textContent = 'Stop';
    setStatus('listening');
  }
});

// ─── Init ─────────────────────────────────────────────────────────────────────

setStatus('idle');
