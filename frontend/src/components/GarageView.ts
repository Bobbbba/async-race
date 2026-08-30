import { garageStore } from '../store/garage.store';
import { raceStore } from '../store/race.store';
import { appStore } from '../store/app.store';
import { CarItem } from './CarItem';
import { Pagination } from './Pagination';

export class GarageView {
  private container: HTMLElement;
  private unsubscribeGarage: (() => void) | null = null;
  private unsubscribeRace: (() => void) | null = null;
  private unsubscribeApp: (() => void) | null = null;

  constructor(containerId: string) {
    const element = document.getElementById(containerId);
    if (!element) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    this.container = element;

    this.unsubscribeGarage = garageStore.subscribe(() => this.render());
    this.unsubscribeRace = raceStore.subscribe(() => this.updateRaceState());
    this.unsubscribeApp = appStore.subscribe(() => {
      if (appStore.viewMode === 'garage') {
        garageStore.loadPage(appStore.garagePage);
      }
    });
  }

  render(): void {
    const cars = garageStore.cars;
    const total = garageStore.total;
    const page = appStore.garagePage;
    const totalPages = garageStore.totalPages;

    this.container.innerHTML = `
      <div class="garage-content">
        ${cars.length === 0 ? `
          <div class="empty-message">🚫 Нет автомобилей. Создайте первый!</div>
        ` : `
          <div class="cars-list">
            ${cars.map(car => {
              const carItem = new CarItem(car.id);
              return carItem.render();
            }).join('')}
          </div>
        `}
        <div id="garage-pagination"></div>
      </div>
    `;

    // Добавляем обработчики для кнопок действий
    this.addActionListeners();

    // Рендерим пагинацию
    const paginationContainer = document.getElementById('garage-pagination');
    if (paginationContainer && cars.length > 0) {
      const pagination = new Pagination('garage-pagination');
      pagination.render(page, totalPages);
    }

    this.updateRaceState();
  }

  private addActionListeners(): void {
    // Обработчики для кнопок с data-action
    const buttons = this.container.querySelectorAll('[data-action]');
    buttons.forEach(button => {
      const btn = button as HTMLButtonElement;
      // Удаляем старые обработчики
      const newBtn = btn.cloneNode(true) as HTMLButtonElement;
      btn.parentNode?.replaceChild(newBtn, btn);
      
      newBtn.addEventListener('click', async (event) => {
        const target = event.currentTarget as HTMLButtonElement;
        const action = target.dataset.action;
        const carId = target.dataset.carId;

        if (!carId) return;

        const id = parseInt(carId, 10);
        if (isNaN(id)) return;

        // Отключаем кнопку во время выполнения
        target.disabled = true;

        try {
          switch (action) {
            case 'start':
              await this.startCar(id);
              break;
            case 'stop':
              await this.stopCar(id);
              break;
            case 'edit':
              this.editCar(id);
              break;
            case 'delete':
              await this.deleteCar(id);
              break;
            default:
              break;
          }
        } catch (error) {
          console.error(`Action ${action} failed:`, error);
          if (error instanceof Error) {
            alert(error.message);
          }
        } finally {
          // Включаем кнопку обратно (если она еще существует)
          const btnElement = this.container.querySelector(`[data-action="${action}"][data-car-id="${carId}"]`) as HTMLButtonElement;
          if (btnElement) {
            btnElement.disabled = false;
          }
        }
      });
    });

    // Обработчики для кнопок редактирования
    const saveBtn = document.getElementById('saveEditBtn');
    const cancelBtn = document.getElementById('cancelEditBtn');

    saveBtn?.addEventListener('click', async () => {
      await garageStore.saveEdit();
    });

    cancelBtn?.addEventListener('click', () => {
      garageStore.cancelEdit();
    });

    // Обработчики для полей ввода в форме редактирования
    const editNameInput = document.getElementById('editNameInput') as HTMLInputElement;
    const editColorInput = document.getElementById('editColorInput') as HTMLInputElement;

    editNameInput?.addEventListener('input', () => {
      garageStore.setEditName(editNameInput.value);
    });

    editColorInput?.addEventListener('input', () => {
      const color = editColorInput.value;
      garageStore.setEditColor(color);
      const preview = document.querySelector('.color-preview-mini') as HTMLElement;
      if (preview) preview.style.backgroundColor = color;
    });

    editNameInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        garageStore.saveEdit();
      }
      if (e.key === 'Escape') {
        garageStore.cancelEdit();
      }
    });
  }

  private async startCar(id: number): Promise<void> {
    try {
      await raceStore.startCar(id);
    } catch (error) {
      if (error instanceof Error) {
        alert(`Ошибка запуска: ${error.message}`);
      }
      throw error;
    }
  }

  private async stopCar(id: number): Promise<void> {
    try {
      await raceStore.stopCar(id);
    } catch (error) {
      if (error instanceof Error) {
        alert(`Ошибка остановки: ${error.message}`);
      }
      throw error;
    }
  }

  private editCar(id: number): void {
    garageStore.startEdit(id);
  }

  private async deleteCar(id: number): Promise<void> {
    if (confirm(`Удалить автомобиль?`)) {
      await garageStore.deleteCar(id);
    }
  }

  private updateRaceState(): void {
    const isRacing = raceStore.isRacing;
    const cars = garageStore.cars;
    
    cars.forEach(car => {
      const carElement = document.querySelector(`[data-car-id="${car.id}"]`);
      if (carElement) {
        // Обновляем классы
        carElement.className = `car-item ${car.status}`;
        
        // Обновляем статус
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

        // Обновляем позицию
        const carSvg = document.getElementById(`car-${car.id}`);
        if (carSvg) {
          const position = car.position || 0;
          carSvg.style.left = `${position}%`;
        }

        // Обновляем состояние кнопок
        const isCarRacing = car.status === 'racing';
        const isCarStopped = car.status === 'stopped';
        const isCarFinished = car.status === 'finished';
        const isCarBroken = car.status === 'broken';

        const startBtn = carElement.querySelector('[data-action="start"]') as HTMLButtonElement;
        const stopBtn = carElement.querySelector('[data-action="stop"]') as HTMLButtonElement;
        const editBtn = carElement.querySelector('[data-action="edit"]') as HTMLButtonElement;
        const deleteBtn = carElement.querySelector('[data-action="delete"]') as HTMLButtonElement;

        if (startBtn) {
          startBtn.disabled = isRacing || isCarRacing || isCarFinished || isCarBroken;
        }

        if (stopBtn) {
          stopBtn.disabled = !isRacing && (isCarStopped || isCarFinished || isCarBroken);
        }

        if (editBtn) {
          editBtn.disabled = isRacing;
        }

        if (deleteBtn) {
          deleteBtn.disabled = isRacing;
        }
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
    if (this.unsubscribeApp) {
      this.unsubscribeApp();
      this.unsubscribeApp = null;
    }
  }
}