import { garageStore } from '../store/garage.store';

export class CarForm {
  private container: HTMLElement;
  private mode: 'create' | 'edit';
  private carId: number | null = null;

  constructor(containerId: string, mode: 'create' | 'edit' = 'create', carId: number | null = null) {
    const element = document.getElementById(containerId);
    if (!element) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    this.container = element;
    this.mode = mode;
    this.carId = carId;

    // Подписываемся на изменения в store
    garageStore.subscribe(() => {
      if (this.mode === 'edit' && this.carId !== null) {
        this.render();
      }
    });
  }

  render(): void {
    if (this.mode === 'create') {
      this.renderCreateForm();
    } else if (this.mode === 'edit' && this.carId !== null) {
      this.renderEditForm();
    }
  }

  private renderCreateForm(): void {
    const name = garageStore.editName || 'Tesla';
    const color = garageStore.editColor || '#e94560';

    this.container.innerHTML = `
      <div class="car-form car-form-create">
        <div class="form-group">
          <label for="carNameInput">Название</label>
          <input type="text" id="carNameInput" value="${this.escapeHtml(name)}" placeholder="Введите название" />
        </div>
        <div class="form-group">
          <label for="carColorInput">Цвет</label>
          <div class="color-picker-wrapper">
            <input type="color" id="carColorInput" value="${color}" />
            <span class="color-preview" style="background-color: ${color}"></span>
            <span class="color-hex">${color}</span>
          </div>
        </div>
        <button class="btn btn-success" id="createCarBtn">➕ Создать</button>
      </div>
    `;

    this.addCreateEventListeners();
  }

  private renderEditForm(): void {
    const car = garageStore.cars.find(c => c.id === this.carId);
    if (!car) {
      this.container.innerHTML = '';
      return;
    }

    const name = garageStore.editName || car.name;
    const color = garageStore.editColor || car.color;

    this.container.innerHTML = `
      <div class="car-form car-form-edit">
        <div class="form-group">
          <label for="editNameInput">Название</label>
          <input type="text" id="editNameInput" value="${this.escapeHtml(name)}" placeholder="Введите название" />
        </div>
        <div class="form-group">
          <label for="editColorInput">Цвет</label>
          <div class="color-picker-wrapper">
            <input type="color" id="editColorInput" value="${color}" />
            <span class="color-preview" style="background-color: ${color}"></span>
            <span class="color-hex">${color}</span>
          </div>
        </div>
        <div class="form-actions">
          <button class="btn btn-success" id="saveEditBtn">💾 Сохранить</button>
          <button class="btn btn-secondary" id="cancelEditBtn">✕ Отмена</button>
        </div>
      </div>
    `;

    this.addEditEventListeners();
  }

  private addCreateEventListeners(): void {
    const nameInput = document.getElementById('carNameInput') as HTMLInputElement;
    const colorInput = document.getElementById('carColorInput') as HTMLInputElement;
    const createBtn = document.getElementById('createCarBtn');

    // Сохраняем в store при вводе
    nameInput?.addEventListener('input', () => {
      garageStore.setEditName(nameInput.value);
    });

    colorInput?.addEventListener('input', () => {
      const color = colorInput.value;
      garageStore.setEditColor(color);
      // Обновляем превью
      const preview = document.querySelector('.color-preview') as HTMLElement;
      const hex = document.querySelector('.color-hex') as HTMLElement;
      if (preview) preview.style.backgroundColor = color;
      if (hex) hex.textContent = color;
    });

    createBtn?.addEventListener('click', async () => {
      const name = (document.getElementById('carNameInput') as HTMLInputElement).value;
      const color = (document.getElementById('carColorInput') as HTMLInputElement).value;
      
      if (name.trim()) {
        await garageStore.createCar({ name: name.trim(), color });
        garageStore.setEditName('Tesla');
        garageStore.setEditColor('#e94560');
      }
    });

    // Enter key
    nameInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        createBtn?.click();
      }
    });
  }

  private addEditEventListeners(): void {
    const nameInput = document.getElementById('editNameInput') as HTMLInputElement;
    const colorInput = document.getElementById('editColorInput') as HTMLInputElement;
    const saveBtn = document.getElementById('saveEditBtn');
    const cancelBtn = document.getElementById('cancelEditBtn');

    nameInput?.addEventListener('input', () => {
      garageStore.setEditName(nameInput.value);
    });

    colorInput?.addEventListener('input', () => {
      const color = colorInput.value;
      garageStore.setEditColor(color);
      const preview = document.querySelector('.color-preview') as HTMLElement;
      const hex = document.querySelector('.color-hex') as HTMLElement;
      if (preview) preview.style.backgroundColor = color;
      if (hex) hex.textContent = color;
    });

    saveBtn?.addEventListener('click', async () => {
      await garageStore.saveEdit();
    });

    cancelBtn?.addEventListener('click', () => {
      garageStore.cancelEdit();
    });

    nameInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        saveBtn?.click();
      }
      if (e.key === 'Escape') {
        cancelBtn?.click();
      }
    });
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}