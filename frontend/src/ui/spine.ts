// Living Latency Spine — Phase 4

export type SegmentId = 'HEAR' | 'THINK' | 'COMPOSE' | 'TOOL' | 'VOICE' | 'SPEAK';

const SEGMENTS: readonly SegmentId[] = ['HEAR', 'THINK', 'COMPOSE', 'TOOL', 'VOICE', 'SPEAK'];

interface SegmentData {
  readonly el: HTMLElement;
  readonly msEl: HTMLSpanElement;
  state: 'idle' | 'active' | 'settled';
  rafId: number | null;
  igniteAt: number;
}

export class Spine {
  private readonly rowEl: HTMLElement;
  private readonly segs: Map<SegmentId, SegmentData> = new Map<SegmentId, SegmentData>();
  private readonly reducedMotion: boolean;
  private prevComplete: number | null = null;
  private ghostEl: HTMLElement | null = null;

  constructor(container: HTMLElement) {
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const row = document.createElement('div');
    row.className = 'spine-row';
    this.rowEl = row;

    container.innerHTML = '';
    container.appendChild(row);

    for (const id of SEGMENTS) {
      const el = document.createElement('div');
      el.className =
        id === 'TOOL' ? 'spine-segment spine-segment--tool' : 'spine-segment';

      const labelEl = document.createElement('span');
      labelEl.className = 'spine-segment__label';
      labelEl.textContent = id;

      const msEl = document.createElement('span');
      msEl.className = 'spine-segment__ms';
      msEl.textContent = '—';

      el.appendChild(labelEl);
      el.appendChild(msEl);
      row.appendChild(el);

      this.segs.set(id, { el, msEl, state: 'idle', rafId: null, igniteAt: 0 });
    }
  }

  ignite(id: SegmentId): void {
    const seg = this.segs.get(id);
    if (!seg || seg.state === 'active') return;

    if (seg.rafId !== null) {
      cancelAnimationFrame(seg.rafId);
      seg.rafId = null;
    }

    seg.el.classList.remove('spine-segment--settled');
    seg.el.classList.add('spine-segment--active');
    seg.msEl.textContent = '0ms';
    seg.state = 'active';
    seg.igniteAt = performance.now();

    if (!this.reducedMotion) {
      this.tick(id);
    }
  }

  settle(id: SegmentId, finalMs: number): void {
    const seg = this.segs.get(id);
    if (!seg || seg.state !== 'active') return;

    if (seg.rafId !== null) {
      cancelAnimationFrame(seg.rafId);
      seg.rafId = null;
    }

    seg.el.classList.remove('spine-segment--active');
    seg.el.classList.add('spine-segment--settled');
    seg.msEl.textContent = `${Math.round(finalMs)}ms`;
    seg.state = 'settled';
  }

  settleActive(finalMs: number): void {
    for (const id of SEGMENTS) {
      const seg = this.segs.get(id);
      if (seg?.state === 'active') {
        this.settle(id, finalMs);
      }
    }
    this.updateGhost(finalMs);
  }

  reset(): void {
    for (const id of SEGMENTS) {
      const seg = this.segs.get(id);
      if (!seg) continue;
      if (seg.rafId !== null) {
        cancelAnimationFrame(seg.rafId);
        seg.rafId = null;
      }
      seg.el.classList.remove('spine-segment--active', 'spine-segment--settled');
      seg.msEl.textContent = '—';
      seg.state = 'idle';
    }
  }

  private tick(id: SegmentId): void {
    const seg = this.segs.get(id);
    if (!seg || seg.state !== 'active') return;
    seg.msEl.textContent = `${Math.round(performance.now() - seg.igniteAt)}ms`;
    seg.rafId = requestAnimationFrame(() => {
      this.tick(id);
    });
  }

  private updateGhost(currentMs: number): void {
    if (this.prevComplete !== null && currentMs > 0) {
      const pct = Math.min(100, (this.prevComplete / currentMs) * 100);
      if (!this.ghostEl) {
        this.ghostEl = document.createElement('div');
        this.ghostEl.className = 'spine-ghost';
        this.rowEl.appendChild(this.ghostEl);
      }
      this.ghostEl.style.left = `${pct.toFixed(2)}%`;
    }
    if (this.prevComplete === null || currentMs < this.prevComplete) {
      this.prevComplete = currentMs;
    }
  }
}
