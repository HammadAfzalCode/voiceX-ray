import './styles/tokens.css';
import './styles/global.css';
import './styles/readout.css';
import './styles/spine.css';
import './styles/tool-cards.css';

import { Recorder } from '@audio/recorder';
import { Readout } from '@ui/readout';
import { connectSocket, getSocket } from '@ws/socket';
import type { LlmSentencePayload, SttFinalPayload } from '@ws/ws-messages';
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

// ─── Recorder ────────────────────────────────────────────────────────────────

const recorder = new Recorder({
  onInterim: (_text) => {
    // Could show interim text in the readout — skipped for Phase 1.
  },
  onFinal: (text) => {
    getSocket().emit(WsEvents.USER_TRANSCRIPT, { text, isFinal: true });
    setStatus('thinking');
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

socket.on(WsEvents.STT_FINAL, (payload: SttFinalPayload) => {
  readout.appendUserLine(payload.text);
});

socket.on(WsEvents.LLM_SENTENCE, (payload: LlmSentencePayload) => {
  readout.appendAgentLine(payload.text);
  enqueueSpeech(payload.text);
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
