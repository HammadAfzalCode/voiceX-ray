export class Readout {
  private readonly el: HTMLElement;
  private currentAgentLine: HTMLElement | null = null;

  constructor(container: HTMLElement) {
    this.el = container;
  }

  appendUserLine(text: string): void {
    const line = document.createElement('div');
    line.className = 'readout-line readout-line--user';
    line.textContent = text;
    this.el.appendChild(line);
    this.scrollToBottom();
  }

  // Phase 1: append a complete agent line (used by echo loop and sentence events)
  appendAgentLine(text: string): void {
    const line = document.createElement('div');
    line.className = 'readout-line readout-line--agent';
    line.textContent = text;
    this.el.appendChild(line);
    this.scrollToBottom();
  }

  // Phase 2: streaming — open a new agent line with a blinking cursor
  startAgentTurn(): void {
    this.currentAgentLine?.classList.remove('readout-line--streaming');
    const line = document.createElement('div');
    line.className = 'readout-line readout-line--agent readout-line--streaming';
    this.el.appendChild(line);
    this.currentAgentLine = line;
    this.scrollToBottom();
  }

  // Phase 2: append a token chunk to the current streaming line
  appendToken(text: string): void {
    if (!this.currentAgentLine) this.startAgentTurn();
    const current = this.currentAgentLine!;
    current.textContent = (current.textContent ?? '') + text;
    this.scrollToBottom();
  }

  // Phase 2: settle the current streaming line (remove cursor)
  settleAgentTurn(): void {
    this.currentAgentLine?.classList.remove('readout-line--streaming');
    this.currentAgentLine = null;
  }

  clear(): void {
    this.el.innerHTML = '';
    this.currentAgentLine = null;
  }

  private scrollToBottom(): void {
    this.el.scrollTop = this.el.scrollHeight;
  }
}
