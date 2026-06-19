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

  appendAgentLine(text: string): void {
    const line = document.createElement('div');
    line.className = 'readout-line readout-line--agent';
    line.textContent = text;
    this.el.appendChild(line);
    this.scrollToBottom();
  }

  startAgentTurn(): void {
    // Fade all existing lines to past styling
    for (const line of this.el.querySelectorAll('.readout-line')) {
      line.classList.add('readout-line--past');
    }

    const line = document.createElement('div');
    line.className = 'readout-line readout-line--agent';

    const textEl = document.createElement('span');
    textEl.className = 'readout-text';

    const cursor = document.createElement('span');
    cursor.className = 'readout-cursor';
    cursor.setAttribute('aria-hidden', 'true');

    line.appendChild(textEl);
    line.appendChild(cursor);
    this.el.appendChild(line);
    this.currentAgentLine = line;
    this.scrollToBottom();
  }

  appendToken(text: string): void {
    if (!this.currentAgentLine) this.startAgentTurn();
    const textEl = this.currentAgentLine!.querySelector<HTMLElement>('.readout-text');
    if (textEl) textEl.textContent = (textEl.textContent ?? '') + text;
    this.scrollToBottom();
  }

  settleAgentTurn(): void {
    if (!this.currentAgentLine) return;
    this.currentAgentLine.querySelector('.readout-cursor')?.remove();
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
