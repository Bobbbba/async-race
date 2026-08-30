import { garageStore } from '../store/garage.store';
import { raceStore } from '../store/race.store';
import { appStore } from '../store/app.store'; // 

export class Controls {
  private container: HTMLElement;
  private unsubscribeGarage: (() => void) | null = null;
  private unsubscribeRace: (() => void) | null = null;

  constructor(containerId: string) {
    const element = document.getElementById(containerId);
    if (!element) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    this.container = element;

    this.unsubscribeGarage = garageStore.subscribe(() => this.updateButtons());
    this.unsubscribeRace = raceStore.subscribe(() => this.updateButtons());
  }

  render(): void {
    const savedName = appStore.carName || 'Tesla';
    const savedColor = appStore.carColor || '#e94560';

    this.container.innerHTML = `
      <div class="controls">
        <div class="control-group">
          <label for="carName">Название</label>
          <input type="text" id="carName" placeholder="Например: Tesla" value="${this.escapeHtml(savedName)}" />
        </div>
        <div class="control-group">
          <label for="carColor">Цвет</label>
          <div class="color-picker-wrapper">
            <input type="color" id="carColor" value="${savedColor}" />
            <span class="color-preview" style="background-color: ${savedColor}"></span>
            <span class="color-hex">${savedColor}</span>
          </div>
        </div>
        <button class="btn btn-success" id="createBtn">➕ Создать</button>
        <button class="btn btn-danger" id="generateBtn">🎲 Генерировать 100</button>
        <div style="flex: 1;"></div>
        <button class="btn btn-primary" id="raceBtn">🏁 Гонка</button>
        <button class="btn btn-warning" id="resetBtn">⏹ Сброс</button>
      </div>
    `;

    this.addEventListeners();
    this.updateButtons();
  }

  private addEventListeners(): void {
    const createBtn = document.getElementById('createBtn');
    const generateBtn = document.getElementById('generateBtn');
    const raceBtn = document.getElementById('raceBtn');
    const resetBtn = document.getElementById('resetBtn');
    const nameInput = document.getElementById('carName') as HTMLInputElement;
    const colorInput = document.getElementById('carColor') as HTMLInputElement;

    nameInput?.addEventListener('input', () => {
      appStore.setCarName(nameInput.value);
      garageStore.setEditName(nameInput.value);
    });

    colorInput?.addEventListener('input', () => {
      const color = colorInput.value;
      appStore.setCarColor(color);
      garageStore.setEditColor(color);
      
      const preview = document.querySelector('.controls .color-preview') as HTMLElement;
      const hex = document.querySelector('.controls .color-hex') as HTMLElement;
      if (preview) preview.style.backgroundColor = color;
      if (hex) hex.textContent = color;
    });

    createBtn?.addEventListener('click', () => this.handleCreate());
    generateBtn?.addEventListener('click', () => this.handleGenerate());
    raceBtn?.addEventListener('click', () => this.handleRace());
    resetBtn?.addEventListener('click', () => this.handleReset());

    nameInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.handleCreate();
      }
    });
  }

  private async handleCreate(): Promise<void> {
    const nameInput = document.getElementById('carName') as HTMLInputElement;
    const colorInput = document.getElementById('carColor') as HTMLInputElement;
    
    const name = nameInput.value.trim() || 'Без имени';
    const color = colorInput.value;
    
    await garageStore.createCar({ name, color });
    
    // Сохраняем значения для следующего создания
    appStore.setCarName(name);
    appStore.setCarColor(color);
  }

  private async handleGenerate(): Promise<void> {
    if (raceStore.isRacing) return;
    
    if (confirm('Сгенерировать 100 случайных автомобилей?')) {
      await garageStore.generateCars(100);
    }
  }

  private async handleRace(): Promise<void> {
    try {
      await raceStore.startRace();
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      }
    }
  }

  private handleReset(): void {
    raceStore.resetRace();
  }

  private updateButtons(): void {
    const isRacing = raceStore.isRacing;
    const raceBtn = document.getElementById('raceBtn') as HTMLButtonElement;
    const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
    const createBtn = document.getElementById('createBtn') as HTMLButtonElement;
    const generateBtn = document.getElementById('generateBtn') as HTMLButtonElement;

    if (raceBtn) raceBtn.disabled = isRacing;
    if (resetBtn) resetBtn.disabled = isRacing;
    if (createBtn) createBtn.disabled = isRacing;
    if (generateBtn) generateBtn.disabled = isRacing;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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