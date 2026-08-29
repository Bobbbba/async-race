import type { Winner, WinnerWithCar } from '../types';
import { winnersApi } from '../api/winners';
import { garageApi } from '../api/garage';

export class WinnersStore {
  private _winners: WinnerWithCar[] = [];
  private _listeners: (() => void)[] = [];

  get winners(): WinnerWithCar[] {
    return this._winners;
  }

  subscribe(listener: () => void): void {
    this._listeners.push(listener);
  }

  private notify(): void {
    this._listeners.forEach(listener => listener());
  }

  async loadWinners(
    sort: 'id' | 'wins' | 'time' = 'time', 
    order: 'asc' | 'desc' = 'asc'
  ): Promise<void> {
    const winners = await winnersApi.getSorted(sort, order);
    
    const winnersWithCar: WinnerWithCar[] = await Promise.all(
      winners.map(async (winner) => {
        try {
          const car = await garageApi.getOne(winner.id);
          return {
            ...winner,
            name: car.name,
            color: car.color,
          };
        } catch {
          return {
            ...winner,
            name: `Car ${winner.id}`,
            color: '#888888',
          };
        }
      })
    );

    this._winners = winnersWithCar;
    this.notify();
  }

  async clearWinners(): Promise<void> {
    const winners = await winnersApi.getAll();
    await Promise.all(winners.map(w => winnersApi.delete(w.id)));
    this._winners = [];
    this.notify();
  }
}

export const winnersStore = new WinnersStore();