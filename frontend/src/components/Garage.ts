import { garageStore } from '../store/garage.store';
import { raceStore } from '../store/race.store';
import { CarItem } from './CarItem';
import { Pagination } from './Pagination';

export class Garage {
  private container: HTMLElement;
  private unsubscribeGarage: (() => void) | null = null;
  private unsubscribeRace: (() => void) | null = null;

  constructor(containerId: string) {
    const element = document.getElementById(containerId);
    if (!element) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    this.container = element;

    this.unsubscribeGarage = garageStore.subscribe(() => this.render());
    this.unsubscribeRace = raceStore.subscribe(() => this.updateRaceState());
    
    // Первоначальный рендер
    this.render();
  }

  render(): void {
    const cars = garageStore.cars;
    const total = garageStore.total;
    const page = garageStore.currentPage;
    const totalPages = garageStore.totalPages;

    if (cars.length === 0) {
      this.container.innerHTML = `
        <div class="garage-header">
          <h2>🚗 Гараж</h2>
          <span>${total} автомобилей</span>
        </div>
        <div class="empty-message">🚫 Нет автомобилей. Создайте первый!</div>
      `;
      return;
    }

    const carsHtml = cars.map((car) => {
      const carItem = new CarItem(car.id);
      return carItem.render();
    }).join('');

    this.container.innerHTML = `
      <div class="garage-header">
        <h2>🚗 Гараж</h2>
        <span>${total} автомобилей</span>
      </div>
      <div class="cars-list">
        ${carsHtml}
      </div>
      <div id="pagination-container"></div>
    `;

    const paginationContainer = document.getElementById('pagination-container');
    if (paginationContainer) {
      const pagination = new Pagination('pagination-container');
      pagination.render(page, totalPages);
    }

    this.addEventListeners();
    this.updateRaceState();
  }

  private addEventListeners(): void {
    const buttons = this.container.querySelectorAll('[data-action]');
    buttons.forEach((button) => {
      const btn = button as HTMLButtonElement;
      const newBtn = btn.cloneNode(true) as HTMLButtonElement;
      btn.parentNode?.replaceChild(newBtn, btn);
      
      newBtn.addEventListener('click', (event) => {
        const target = event.currentTarget as HTMLButtonElement;
        const action = target.dataset.action;
        const carId = target.dataset.carId;

        if (!carId) return;

        const id = parseInt(carId, 10);
        if (isNaN(id)) return;

        switch (action) {
          case 'start':
            this.startCar(id);
            break;
          case 'stop':
            this.stopCar(id);
            break;
          case 'delete':
            this.deleteCar(id);
            break;
          default:
            break;
        }
      });
    });
  }

  private async startCar(id: number): Promise<void> {
    await raceStore.startCar(id);
  }

  private async stopCar(id: number): Promise<void> {
    await raceStore.stopCar(id);
  }

  private async deleteCar(id: number): Promise<void> {
    await garageStore.deleteCar(id);
  }

  private updateRaceState(): void {
    const isRacing = raceStore.isRacing;
    const cars = garageStore.cars;
    
    cars.forEach((car) => {
      const carElement = document.querySelector(`[data-car-id="${car.id}"]`);
      if (carElement) {
        carElement.className = `car-item ${car.status}`;
        
        const statusElement = document.getElementById(`status-${car.id}`);
        if (statusElement) {
          let statusText = '';
          switch (car.status) {
            case 'racing':
              statusText = '🏃 Гонка...';
              break;
            case 'finished':
              statusText = `✅ ${(car.time || 0).toFixed(2)}с`;
              break;
            case 'broken':
              statusText = '💥 Сломана';
              break;
            default:
              statusText = '⏸ Остановлен';
          }
          statusElement.textContent = statusText;
          statusElement.className = `car-status ${car.status}`;
        }

        const carSvg = document.getElementById(`car-${car.id}`);
        if (carSvg) {
          const position = car.position || 0;
          carSvg.style.left = `${position}%`;
        }

        const buttons = carElement.querySelectorAll('[data-action]');
        buttons.forEach((btn) => {
          const button = btn as HTMLButtonElement;
          const action = button.dataset.action;
          
          if (action === 'start') {
            button.disabled = isRacing || car.status === 'racing';
          } else if (action === 'stop') {
            button.disabled = !isRacing && car.status !== 'racing';
          } else if (action === 'delete') {
            button.disabled = isRacing;
          }
        });
      }
    });
  }

  destroy(): void {
    if (this.unsubscribeGarage) {
      this.unsubscribeGarage();
      this.unsubscribeGarage = null;
    }
    if (this.unsubscribeRace) {
      this.unsubscribeRace();
      this.unsubscribeRace = null;
    }
  }
}