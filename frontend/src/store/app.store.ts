import type { CarCreateData } from '../types';

export type ViewMode = 'garage' | 'winners';

export interface AppState {
  viewMode: ViewMode;
  garagePage: number;
  winnersPage: number;
  carName: string;
  carColor: string;
}

export class AppStore {
  private _state: AppState = {
    viewMode: 'garage',
    garagePage: 1,
    winnersPage: 1,
    carName: 'Tesla',
    carColor: '#e94560',
  };

  private _listeners: (() => void)[] = [];

  get state(): AppState {
    return { ...this._state };
  }

  get viewMode(): ViewMode {
    return this._state.viewMode;
  }

  get garagePage(): number {
    return this._state.garagePage;
  }

  get winnersPage(): number {
    return this._state.winnersPage;
  }

  get carName(): string {
    return this._state.carName;
  }

  get carColor(): string {
    return this._state.carColor;
  }

  subscribe(listener: () => void): () => void {
    this._listeners.push(listener);
    return () => {
      const index = this._listeners.indexOf(listener);
      if (index > -1) {
        this._listeners.splice(index, 1);
      }
    };
  }

  private notify(): void {
    this._listeners.forEach(listener => listener());
  }

  setViewMode(mode: ViewMode): void {
    if (this._state.viewMode !== mode) {
      this._state.viewMode = mode;
      this.notify();
    }
  }

  setGaragePage(page: number): void {
    if (page > 0) {
      this._state.garagePage = page;
      this.notify();
    }
  }

  setWinnersPage(page: number): void {
    if (page > 0) {
      this._state.winnersPage = page;
      this.notify();
    }
  }

  setCarName(name: string): void {
    this._state.carName = name;
    this.notify();
  }

  setCarColor(color: string): void {
    this._state.carColor = color;
    this.notify();
  }

  toggleView(): void {
    this._state.viewMode = this._state.viewMode === 'garage' ? 'winners' : 'garage';
    this.notify();
  }
}

// ✅ Экспортируем экземпляр
export const appStore = new AppStore();