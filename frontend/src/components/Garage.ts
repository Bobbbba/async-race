import { garageStore } from '../store/garage.store';
import { raceStore } from '../store/race.store';
import type { Car } from '../types';

export class CarItem {
  private carId: number;

  constructor(carId: number) {
    this.carId = carId;
  }

  render(): string {
    const car = garageStore.cars.find(c => c.id === this.carId);
    if (!car) {
      return '';
    }

    const isRacing = raceStore.isRacing;
    const position = car.position || 0;
    const statusText = this.getStatusText(car);
    const statusClass = car.status;

    return `
      <div class="car-item ${statusClass}" data-car-id="${car.id}">
        <div class="car-info">
          <span class="car-name" style="color: ${car.color}">${this.escapeHtml(car.name)}</span>
          <span class="car-id">ID: ${car.id}</span>
        </div>
        <div class="car-actions">
          <button class="btn btn-primary btn-sm" 
                  data-action="start" 
                  data-car-id="${car.id}"
                  ${isRacing || car.status === 'racing' ? 'disabled' : ''}>
            ▶
          </button>
          <button class="btn btn-warning btn-sm" 
                  data-action="stop" 
                  data-car-id="${car.id}"
                  ${!isRacing && car.status !== 'racing' ? 'disabled' : ''}>
            ⏹
          </button>
          <button class="btn btn-danger btn-sm" 
                  data-action="delete" 
                  data-car-id="${car.id}"
                  ${isRacing ? 'disabled' : ''}>
            ✕
          </button>
        </div>
        <div class="car-track" id="track-${car.id}">
          <div class="finish-line"></div>
          <div class="car-svg" id="car-${car.id}" style="left: ${position}%;">
            ${this.getCarSvg(car.color)}
          </div>
        </div>
        <div class="car-status ${statusClass}" id="status-${car.id}">
          ${statusText}
        </div>
      </div>
    `;
  }

  private getStatusText(car: Car): string {
    switch (car.status) {
      case 'racing':
        return '🏃 Гонка...';
      case 'finished':
        return `✅ ${(car.time || 0).toFixed(2)}с`;
      case 'broken':
        return '💥 Сломана';
      default:
        return '⏸ Остановлен';
    }
  }

  private getCarSvg(color: string): string {
    return `
      <svg viewBox="0 0 40 30" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="5" width="28" height="18" rx="3" fill="${color}" stroke="#333" stroke-width="1.5"/>
        <rect x="22" y="2" width="12" height="8" rx="2" fill="${color}" stroke="#333" stroke-width="1.5"/>
        <rect x="24" y="4" width="8" height="4" rx="1" fill="rgba(255,255,255,0.2)"/>
        <circle cx="10" cy="23" r="5" fill="#222" stroke="#444" stroke-width="1"/>
        <circle cx="10" cy="23" r="2.5" fill="#555"/>
        <circle cx="26" cy="23" r="5" fill="#222" stroke="#444" stroke-width="1"/>
        <circle cx="26" cy="23" r="2.5" fill="#555"/>
        <rect x="4" y="10" width="18" height="8" rx="1" fill="rgba(255,255,255,0.15)"/>
        <rect x="6" y="11" width="14" height="6" rx="0.5" fill="rgba(255,255,255,0.05)"/>
      </svg>
    `;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}