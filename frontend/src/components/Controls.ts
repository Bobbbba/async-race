import { garageStore } from '../store/garage.store';
import { raceStore } from '../store/race.store';

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

    // Сохраняем функции отписки
    this.unsubscribeGarage = garageStore.subscribe(() => this.updateButtons());
    this.unsubscribeRace = raceStore.subscribe(() => this.updateButtons());
  }

  render(): void {
    this.container.innerHTML = `
      <div class="controls">
        <div class="control-group">
          <label for="carName">Название</label>
          <input type="text" id="carName" placeholder="Например: Tesla" value="Tesla" />
        </div>
        <div class="control-group">
          <label for="carColor">Цвет</label>
          <input type="color" id="carColor" value="#e94560" />
        </div>
        <button class="btn btn-success" id="createBtn">➕ Создать</button>
        <button class="btn btn-danger" id="generateBtn">🎲 Сгенерировать 100</button>
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

  private handleCreate(): void {
    const nameInput = document.getElementById('carName') as HTMLInputElement;
    const colorInput = document.getElementById('carColor') as HTMLInputElement;
    
    const name = nameInput.value.trim() || 'Без имени';
    const color = colorInput.value;
    
    garageStore.createCar({ name, color });
  }

  private handleGenerate(): void {
    if (raceStore.isRacing) return;
    
    const brands = ['Tesla', 'BMW', 'Audi', 'Mercedes', 'Toyota', 'Ford', 'Chevrolet', 'Honda', 'Nissan', 'Volkswagen'];
    const models = ['S', '3', 'X', 'Y', 'M5', 'RS6', 'G63', 'Civic', 'Accord', 'Camry', '911', '488'];
    const colors = ['#e94560', '#2ecc71', '#3498db', '#f1c40f', '#9b59b6', '#1abc9c', '#e67e22', '#e74c3c', '#00b894', '#6c5ce7'];
    
    const count = 100;
    for (let i = 0; i < count; i++) {
      const randomBrand = brands[Math.floor(Math.random() * brands.length)];
      const randomModel = models[Math.floor(Math.random() * models.length)];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      
      garageStore.createCar({
        name: `${randomBrand} ${randomModel}`,
        color: randomColor,
      });
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