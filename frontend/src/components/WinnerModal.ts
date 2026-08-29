import { raceStore } from '../store/race.store';
import type { WinnerWithCar } from '../types';

export class WinnerModal {
  private container: HTMLElement;
  private unsubscribeRace: (() => void) | null = null;

  constructor(containerId: string) {
    const element = document.getElementById(containerId);
    if (!element) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    this.container = element;

    this.unsubscribeRace = raceStore.subscribe(() => this.checkWinner());
    this.render();
  }

  render(): void {
    this.container.innerHTML = `
      <div class="winner-modal" id="winnerModal">
        <div class="winner-content">
          <h2>🏆 Победитель!</h2>
          <div class="winner-name" id="winnerName">—</div>
          <div class="winner-time" id="winnerTime">⏱ Время: 0.00 с</div>
          <button class="btn btn-primary" id="closeWinnerBtn">Отлично!</button>
        </div>
      </div>
    `;

    const closeBtn = document.getElementById('closeWinnerBtn');
    closeBtn?.addEventListener('click', () => this.close());

    // Закрытие по клику вне модалки
    this.container.addEventListener('click', (event) => {
      if (event.target === this.container) {
        this.close();
      }
    });

    // Закрытие по Escape
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        this.close();
      }
    });
  }

  private checkWinner(): void {
    if (!raceStore.isRacing && raceStore.winners.length > 0) {
      const winner = raceStore.getWinner();
      if (winner) {
        this.show(winner);
      }
    }
  }

  show(winner: WinnerWithCar): void {
    const modal = document.getElementById('winnerModal');
    const nameEl = document.getElementById('winnerName');
    const timeEl = document.getElementById('winnerTime');

    if (modal) {
      modal.classList.add('active');
    }
    if (nameEl) {
      nameEl.textContent = winner.name;
      nameEl.style.color = winner.color || '#fff';
    }
    if (timeEl) {
      timeEl.textContent = `⏱ Время: ${winner.time.toFixed(2)} с`;
    }
  }

  close(): void {
    const modal = document.getElementById('winnerModal');
    if (modal) {
      modal.classList.remove('active');
    }
  }

  destroy(): void {
    if (this.unsubscribeRace) {
      this.unsubscribeRace();
      this.unsubscribeRace = null;
    }
  }
}