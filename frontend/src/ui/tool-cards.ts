export class ToolCards {
  private readonly container: HTMLElement;
  private readonly cards = new Map<string, HTMLElement>();

  constructor(container: HTMLElement) {
    this.container = container;
  }

  addCard(callId: string, name: string, args: unknown): void {
    const card = document.createElement('div');
    card.className = 'tool-card';

    const nameEl = document.createElement('div');
    nameEl.className = 'tool-card__name';
    nameEl.textContent = name.replace(/_/g, ' ');

    const argsEl = document.createElement('div');
    argsEl.className = 'tool-card__args';
    argsEl.textContent = JSON.stringify(args, null, 2);

    const shimmer = document.createElement('div');
    shimmer.className = 'tool-card__shimmer';

    card.appendChild(nameEl);
    card.appendChild(argsEl);
    card.appendChild(shimmer);

    this.cards.set(callId, card);
    this.container.appendChild(card);
    this.container.scrollTop = this.container.scrollHeight;
  }

  fillResult(callId: string, result: unknown): void {
    const card = this.cards.get(callId);
    if (!card) return;

    card.querySelector('.tool-card__shimmer')?.remove();

    const resultEl = document.createElement('div');
    resultEl.className = 'tool-card__result';
    resultEl.textContent =
      typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
    card.appendChild(resultEl);
  }

  markError(callId: string): void {
    const card = this.cards.get(callId);
    if (!card) return;

    card.querySelector('.tool-card__shimmer')?.remove();
    card.classList.add('tool-card--error');

    const resultEl = document.createElement('div');
    resultEl.className = 'tool-card__result';
    resultEl.textContent = 'Tool failed — answering without it.';
    card.appendChild(resultEl);
  }

  clear(): void {
    this.container.innerHTML = '';
    this.cards.clear();
  }
}
