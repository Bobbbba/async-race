import type { Car, CarStatus } from '../types';
import { garageStore } from '../store/garage.store';
import { raceStore } from '../store/race.store';
import { winnersApi } from '../api/winners';
import { engineApi } from '../api/engine';
import { animationService } from './animation.service';

/**
 * Конфигурация гонки
 */
export interface RaceConfig {
  distance: number;
  maxVelocity: number;
  minVelocity: number;
  finishPosition: number;
  animationDuration: number;
  jitterIntensity: number;
  startDelay: number;
}

/**
 * Состояние автомобиля в гонке
 */
export interface RaceCarState {
  id: number;
  name: string;
  color: string;
  status: CarStatus;
  position: number;
  velocity: number;
  time: number;
  isFinished: boolean;
  isBroken: boolean;
  startTime: number;
  finishTime: number;
}

/**
 * Результат гонки для автомобиля
 */
export interface RaceResult {
  carId: number;
  carName: string;
  carColor: string;
  position: number;
  time: number;
  isWinner: boolean;
  isBroken: boolean;
}

/**
 * Результаты гонки
 */
export interface RaceResults {
  winners: RaceResult[];
  losers: RaceResult[];
  broken: RaceResult[];
  totalTime: number;
  startTime: number;
  endTime: number;
}

/**
 * Событие гонки
 */
export interface RaceEvent {
  type: 
    | 'race_started'
    | 'race_finished'
    | 'race_reset'
    | 'car_started'
    | 'car_start_failed'
    | 'car_position_update'
    | 'car_finished'
    | 'car_broken'
    | 'car_stopped'
    | 'winner_declared';
  data: unknown;
}

/**
 * Сервис для управления гонками
 */
export class RaceService {
  private readonly DEFAULT_CONFIG: RaceConfig = {
    distance: 500000,
    maxVelocity: 200,
    minVelocity: 50,
    finishPosition: 100,
    animationDuration: 3000,
    jitterIntensity: 0.05,
    startDelay: 300,
  };

  private config: RaceConfig;
  private raceCars: Map<number, RaceCarState> = new Map();
  private raceResults: RaceResult[] = [];
  private isRacing: boolean = false;
  private startTime: number = 0;
  private finishCount: number = 0;
  private totalCars: number = 0;
  private animationIds: Map<number, number> = new Map();
  private listeners: Array<(event: RaceEvent) => void> = [];

  constructor(config?: Partial<RaceConfig>) {
    this.config = {
      ...this.DEFAULT_CONFIG,
      ...config,
    };
  }

  /**
   * Подписаться на события гонки
   */
  subscribe(listener: (event: RaceEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Уведомить подписчиков о событии
   */
  private emit(event: RaceEvent): void {
    this.listeners.forEach(listener => listener(event));
  }

  /**
   * Запустить гонку
   */
  async startRace(): Promise<RaceResults> {
    const cars = garageStore.cars;
    if (cars.length === 0) {
      throw new Error('No cars in garage');
    }

    if (this.isRacing) {
      throw new Error('Race already in progress');
    }

    // Инициализация состояния гонки
    this.isRacing = true;
    this.raceCars.clear();
    this.raceResults = [];
    this.finishCount = 0;
    this.totalCars = cars.length;
    this.startTime = Date.now();

    this.emit({
      type: 'race_started',
      data: { totalCars: this.totalCars, startTime: this.startTime },
    });

    // Запускаем двигатели всех автомобилей
    const startPromises = cars.map(async (car) => {
      try {
        const engineData = await engineApi.start(car.id);
        
        const raceCar: RaceCarState = {
          id: car.id,
          name: car.name,
          color: car.color,
          status: 'racing',
          position: 0,
          velocity: engineData.velocity,
          time: 0,
          isFinished: false,
          isBroken: false,
          startTime: 0,
          finishTime: 0,
        };

        this.raceCars.set(car.id, raceCar);
        
        garageStore.updateCarState(car.id, {
          status: 'racing',
          position: 0,
          velocity: engineData.velocity,
          time: 0,
        });

        return raceCar;
      } catch {
        const raceCar: RaceCarState = {
          id: car.id,
          name: car.name,
          color: car.color,
          status: 'stopped',
          position: 0,
          velocity: 0,
          time: 0,
          isFinished: false,
          isBroken: true,
          startTime: 0,
          finishTime: 0,
        };

        this.raceCars.set(car.id, raceCar);
        garageStore.updateCarState(car.id, { status: 'stopped' });
        
        return raceCar;
      }
    });

    const startedCars = await Promise.all(startPromises);
    
    // Запускаем анимацию для каждой машины с задержкой
    startedCars.forEach((car) => {
      if (!car.isBroken && car.velocity > 0) {
        const delay = Math.random() * this.config.startDelay;
        setTimeout(() => {
          this.animateCar(car.id);
        }, delay);
      } else {
        this.finishCar(car.id, true);
      }
    });

    // Ждем завершения гонки
    return new Promise((resolve) => {
      const checkCompletion = (): void => {
        if (this.finishCount >= this.totalCars) {
          const results = this.getResults();
          this.isRacing = false;
          this.emit({
            type: 'race_finished',
            data: results,
          });
          resolve(results);
        } else {
          setTimeout(checkCompletion, 100);
        }
      };
      checkCompletion();
    });
  }

  /**
   * Анимировать движение автомобиля
   */
  private animateCar(carId: number): void {
    const raceCar = this.raceCars.get(carId);
    if (!raceCar || raceCar.isFinished || raceCar.isBroken) {
      return;
    }

    const car = garageStore.cars.find(c => c.id === carId);
    if (!car) {
      return;
    }

    const trackWidth = this.getTrackWidth(carId);
    const duration = this.calculateDuration(trackWidth, raceCar.velocity);

    raceCar.startTime = Date.now();

    const animationId = animationService.animateCarWithJitter(
      carId,
      0,
      this.config.finishPosition,
      duration,
      this.config.jitterIntensity,
      (position: number) => {
        raceCar.position = position;
        garageStore.updateCarState(carId, { position });
        this.emit({
          type: 'car_position_update',
          data: { carId, position },
        });
      },
      () => {
        this.finishCar(carId, false);
      }
    );

    this.animationIds.set(carId, animationId);
  }

  /**
   * Завершить гонку для автомобиля
   */
  private finishCar(carId: number, isBroken: boolean): void {
    const raceCar = this.raceCars.get(carId);
    if (!raceCar || raceCar.isFinished) {
      return;
    }

    const car = garageStore.cars.find(c => c.id === carId);
    if (!car) {
      return;
    }

    const finishTime = (Date.now() - this.startTime) / 1000;
    
    raceCar.isFinished = true;
    raceCar.isBroken = isBroken;
    raceCar.finishTime = finishTime;
    raceCar.time = isBroken ? 0 : finishTime;
    raceCar.status = isBroken ? 'broken' : 'finished';

    garageStore.updateCarState(carId, {
      status: raceCar.status,
      position: isBroken ? raceCar.position : 100,
      time: raceCar.time,
    });

    const animationId = this.animationIds.get(carId);
    if (animationId) {
      animationService.stopAnimation(carId);
      this.animationIds.delete(carId);
    }

    if (!isBroken) {
      this.raceResults.push({
        carId: raceCar.id,
        carName: raceCar.name,
        carColor: raceCar.color,
        position: this.raceResults.length + 1,
        time: finishTime,
        isWinner: this.raceResults.length === 0,
        isBroken: false,
      });

      this.saveWinner(carId, finishTime);

      this.emit({
        type: 'car_finished',
        data: {
          carId,
          position: this.raceResults.length,
          time: finishTime,
        },
      });
    } else {
      this.emit({
        type: 'car_broken',
        data: {
          carId,
          position: raceCar.position,
        },
      });
    }

    this.finishCount++;
    raceStore.setFinishedCount(this.finishCount);

    if (this.finishCount >= this.totalCars) {
      this.endRace();
    }
  }

  /**
   * Сохранить победителя
   */
  private async saveWinner(carId: number, time: number): Promise<void> {
    try {
      const existingWinner = await winnersApi.getOne(carId);
      if (existingWinner) {
        await winnersApi.update(carId, {
          wins: existingWinner.wins + 1,
          time: Math.min(existingWinner.time, time),
        });
      } else {
        await winnersApi.create(carId, 1, time);
      }
    } catch {
      await winnersApi.create(carId, 1, time);
    }
  }

  /**
   * Завершить гонку
   */
  private endRace(): void {
    const results = this.getResults();
    this.isRacing = false;

    if (results.winners.length > 0) {
      const winner = results.winners[0];
      this.emit({
        type: 'winner_declared',
        data: winner,
      });
    }

    this.emit({
      type: 'race_finished',
      data: results,
    });
  }

  /**
   * Получить результаты гонки
   */
  getResults(): RaceResults {
    const winners = this.raceResults.filter(r => !r.isBroken);
    const broken = this.raceResults.filter(r => r.isBroken);
    const losers = winners.slice(1);

    return {
      winners: winners.length > 0 ? [winners[0]] : [],
      losers,
      broken,
      totalTime: (Date.now() - this.startTime) / 1000,
      startTime: this.startTime,
      endTime: Date.now(),
    };
  }

  /**
   * Остановить гонку (сброс)
   */
  async resetRace(): Promise<void> {
    this.isRacing = false;
    this.raceCars.clear();
    this.raceResults = [];
    this.finishCount = 0;
    this.totalCars = 0;
    this.startTime = 0;

    this.animationIds.forEach((id) => {
      animationService.stopAnimation(id);
    });
    this.animationIds.clear();

    const cars = garageStore.cars;
    await Promise.all(
      cars.map(car => 
        engineApi.stop(car.id).catch(() => {})
      )
    );

    cars.forEach(car => {
      garageStore.updateCarState(car.id, {
        status: 'stopped',
        position: 0,
        time: 0,
        velocity: undefined,
      });
    });

    raceStore.resetFinishedCount();

    this.emit({
      type: 'race_reset',
      data: null,
    });
  }

  /**
   * Остановить отдельный автомобиль
   */
  async stopCar(carId: number): Promise<void> {
    const raceCar = this.raceCars.get(carId);
    if (!raceCar) return;

    const animationId = this.animationIds.get(carId);
    if (animationId) {
      animationService.stopAnimation(carId);
      this.animationIds.delete(carId);
    }

    await engineApi.stop(carId);
    
    raceCar.status = 'stopped';
    raceCar.isFinished = true;
    raceCar.isBroken = true;

    garageStore.updateCarState(carId, {
      status: 'stopped',
      position: raceCar.position || 0,
    });

    this.finishCount++;
    raceStore.setFinishedCount(this.finishCount);

    this.emit({
      type: 'car_stopped',
      data: { carId, position: raceCar.position || 0 },
    });
  }

  /**
   * Запустить отдельный автомобиль
   */
  async startCar(carId: number): Promise<void> {
    if (this.isRacing) return;

    const car = garageStore.cars.find(c => c.id === carId);
    if (!car) return;

    try {
      const engineData = await engineApi.start(carId);
      
      const raceCar: RaceCarState = {
        id: car.id,
        name: car.name,
        color: car.color,
        status: 'racing',
        position: 0,
        velocity: engineData.velocity,
        time: 0,
        isFinished: false,
        isBroken: false,
        startTime: 0,
        finishTime: 0,
      };

      this.raceCars.set(carId, raceCar);
      
      garageStore.updateCarState(carId, {
        status: 'racing',
        position: 0,
        velocity: engineData.velocity,
        time: 0,
      });

      this.animateCar(carId);
      
      this.emit({
        type: 'car_started',
        data: { carId, velocity: engineData.velocity },
      });
    } catch (error) {
      garageStore.updateCarState(carId, { status: 'stopped' });
      this.emit({
        type: 'car_start_failed',
        data: { carId, error: (error as Error).message },
      });
    }
  }

  /**
   * Получить состояние гонки
   */
  getRaceState(): {
    isRacing: boolean;
    totalCars: number;
    finishedCars: number;
    progress: number;
    cars: RaceCarState[];
  } {
    const cars = Array.from(this.raceCars.values());
    const progress = this.totalCars > 0 
      ? (this.finishCount / this.totalCars) * 100 
      : 0;

    return {
      isRacing: this.isRacing,
      totalCars: this.totalCars,
      finishedCars: this.finishCount,
      progress,
      cars,
    };
  }

  /**
   * Получить текущего лидера гонки
   */
  getCurrentLeader(): RaceCarState | null {
    let leader: RaceCarState | null = null;
    let maxPosition = -1;

    this.raceCars.forEach((car) => {
      if (!car.isFinished && !car.isBroken && car.position > maxPosition) {
        maxPosition = car.position;
        leader = car;
      }
    });

    return leader;
  }

  /**
   * Рассчитать длительность анимации
   */
  private calculateDuration(trackWidth: number, velocity: number): number {
    const pixels = (this.config.finishPosition / 100) * trackWidth;
    const timeInSeconds = pixels / (velocity * 2);
    return Math.max(timeInSeconds * 1000, 1000);
  }

  /**
   * Получить ширину трека для автомобиля
   */
  private getTrackWidth(carId: number): number {
    const trackElement = document.getElementById(`track-${carId}`);
    if (trackElement) {
      return trackElement.clientWidth - 50;
    }
    return 500;
  }

  /**
   * Проверить, идет ли гонка
   */
  isRaceInProgress(): boolean {
    return this.isRacing;
  }

  /**
   * Получить конфигурацию гонки
   */
  getConfig(): RaceConfig {
    return { ...this.config };
  }

  /**
   * Обновить конфигурацию гонки
   */
  updateConfig(config: Partial<RaceConfig>): void {
    this.config = {
      ...this.config,
      ...config,
    };
  }

  /**
   * Очистить сервис
   */
  destroy(): void {
    this.resetRace();
    this.listeners = [];
    this.raceCars.clear();
    this.raceResults = [];
    this.animationIds.clear();
  }

  /**
   * Получить статистику гонки
   */
  getStatistics(): {
    averageTime: number;
    fastestTime: number;
    slowestTime: number;
    brokenCount: number;
    finishedCount: number;
    totalParticipants: number;
  } {
    const finished = this.raceResults.filter(r => !r.isBroken);
    const broken = this.raceResults.filter(r => r.isBroken);

    let fastestTime = 0;
    let slowestTime = 0;
    let totalTime = 0;

    finished.forEach(r => {
      totalTime += r.time;
      if (fastestTime === 0 || r.time < fastestTime) {
        fastestTime = r.time;
      }
      if (r.time > slowestTime) {
        slowestTime = r.time;
      }
    });

    return {
      averageTime: finished.length > 0 ? totalTime / finished.length : 0,
      fastestTime,
      slowestTime,
      brokenCount: broken.length,
      finishedCount: finished.length,
      totalParticipants: this.totalCars,
    };
  }
}

/**
 * Единый экземпляр сервиса гонки
 */
export const raceService = new RaceService();

/**
 * Утилиты для работы с гонками
 */
export const RaceUtils = {
  getRacePosition(results: RaceResult[], carId: number): number {
    const sorted = [...results].sort((a, b) => a.time - b.time);
    const index = sorted.findIndex(r => r.carId === carId);
    return index !== -1 ? index + 1 : -1;
  },

  formatRaceTime(time: number): string {
    if (time === 0) return '—';
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    if (minutes > 0) {
      return `${minutes}м ${seconds.toFixed(2)}с`;
    }
    return `${seconds.toFixed(2)}с`;
  },

  getPositionEmoji(position: number): string {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return `#${position}`;
  },

  isPodium(position: number): boolean {
    return position >= 1 && position <= 3;
  },

  getPositionColor(position: number): string {
    if (position === 1) return '#FFD700';
    if (position === 2) return '#C0C0C0';
    if (position === 3) return '#CD7F32';
    return '#888888';
  },
};