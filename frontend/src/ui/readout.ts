export class Readout {
  private readonly el: HTMLElement;

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

  clear(): void {
    this.el.innerHTML = '';
  }

  private scrollToBottom(): void {
    this.el.scrollTop = this.el.scrollHeight;
  }
}
