/**
 * Сервис для управления анимациями автомобилей
 * Отвечает за плавное движение машин по треку
 */
export class AnimationService {
  private animations: Map<number, number> = new Map();
  private frameCallbacks: Map<number, (timestamp: number) => void> = new Map();
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;
  private lastTimestamp: number = 0;

  /**
   * Запустить анимацию для автомобиля
   * @param carId - ID автомобиля
   * @param callback - Функция, вызываемая на каждом кадре анимации
   * @param duration - Длительность анимации в миллисекундах
   * @param onComplete - Функция, вызываемая по завершении анимации
   * @returns ID анимации
   */
  startAnimation(
    carId: number,
    callback: (progress: number) => void,
    duration: number,
    onComplete?: () => void
  ): number {
    // Останавливаем предыдущую анимацию для этого автомобиля
    this.stopAnimation(carId);

    const startTime = performance.now();
    let animationId: number;

    const animate = (timestamp: number): void => {
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Вызываем callback с текущим прогрессом
      callback(progress);

      if (progress < 1) {
        // Продолжаем анимацию
        animationId = requestAnimationFrame(animate);
        this.animations.set(carId, animationId);
      } else {
        // Анимация завершена
        this.animations.delete(carId);
        if (onComplete) {
          onComplete();
        }
      }
    };

    // Запускаем анимацию
    animationId = requestAnimationFrame(animate);
    this.animations.set(carId, animationId);
    this.isRunning = true;

    return animationId;
  }

  /**
   * Остановить анимацию для конкретного автомобиля
   * @param carId - ID автомобиля
   */
  stopAnimation(carId: number): void {
    const animationId = this.animations.get(carId);
    if (animationId) {
      cancelAnimationFrame(animationId);
      this.animations.delete(carId);
    }
  }

  /**
   * Остановить все анимации
   */
  stopAllAnimations(): void {
    this.animations.forEach((animationId) => {
      cancelAnimationFrame(animationId);
    });
    this.animations.clear();
    this.isRunning = false;
  }

  /**
   * Проверить, выполняется ли анимация для автомобиля
   * @param carId - ID автомобиля
   * @returns true, если анимация выполняется
   */
  isAnimating(carId: number): boolean {
    return this.animations.has(carId);
  }

  /**
   * Получить количество активных анимаций
   * @returns Количество активных анимаций
   */
  getActiveAnimationsCount(): number {
    return this.animations.size;
  }

  /**
   * Проверить, есть ли активные анимации
   * @returns true, если есть активные анимации
   */
  hasActiveAnimations(): boolean {
    return this.animations.size > 0;
  }

  /**
   * Создать анимацию движения автомобиля по треку
   * @param carId - ID автомобиля
   * @param startPosition - Начальная позиция (0-100)
   * @param endPosition - Конечная позиция (0-100)
   * @param duration - Длительность анимации в миллисекундах
   * @param onPositionUpdate - Функция обновления позиции
   * @param onComplete - Функция по завершении
   * @returns ID анимации
   */
  animateCarMovement(
    carId: number,
    startPosition: number,
    endPosition: number,
    duration: number,
    onPositionUpdate: (position: number) => void,
    onComplete?: () => void
  ): number {
    return this.startAnimation(
      carId,
      (progress: number) => {
        const position = startPosition + (endPosition - startPosition) * progress;
        onPositionUpdate(Math.min(position, 100));
      },
      duration,
      onComplete
    );
  }

  /**
   * Создать анимацию с ускорением (ease-in)
   * @param carId - ID автомобиля
   * @param startPosition - Начальная позиция
   * @param endPosition - Конечная позиция
   * @param duration - Длительность
   * @param onPositionUpdate - Функция обновления позиции
   * @param onComplete - Функция по завершении
   * @returns ID анимации
   */
  animateCarWithEaseIn(
    carId: number,
    startPosition: number,
    endPosition: number,
    duration: number,
    onPositionUpdate: (position: number) => void,
    onComplete?: () => void
  ): number {
    return this.startAnimation(
      carId,
      (progress: number) => {
        // Ease-in: прогресс начинается медленно и ускоряется
        const easedProgress = progress * progress;
        const position = startPosition + (endPosition - startPosition) * easedProgress;
        onPositionUpdate(Math.min(position, 100));
      },
      duration,
      onComplete
    );
  }

  /**
   * Создать анимацию с замедлением (ease-out)
   * @param carId - ID автомобиля
   * @param startPosition - Начальная позиция
   * @param endPosition - Конечная позиция
   * @param duration - Длительность
   * @param onPositionUpdate - Функция обновления позиции
   * @param onComplete - Функция по завершении
   * @returns ID анимации
   */
  animateCarWithEaseOut(
    carId: number,
    startPosition: number,
    endPosition: number,
    duration: number,
    onPositionUpdate: (position: number) => void,
    onComplete?: () => void
  ): number {
    return this.startAnimation(
      carId,
      (progress: number) => {
        // Ease-out: прогресс начинается быстро и замедляется
        const easedProgress = 1 - (1 - progress) * (1 - progress);
        const position = startPosition + (endPosition - startPosition) * easedProgress;
        onPositionUpdate(Math.min(position, 100));
      },
      duration,
      onComplete
    );
  }

  /**
   * Создать анимацию с плавным стартом и финишем (ease-in-out)
   * @param carId - ID автомобиля
   * @param startPosition - Начальная позиция
   * @param endPosition - Конечная позиция
   * @param duration - Длительность
   * @param onPositionUpdate - Функция обновления позиции
   * @param onComplete - Функция по завершении
   * @returns ID анимации
   */
  animateCarWithEaseInOut(
    carId: number,
    startPosition: number,
    endPosition: number,
    duration: number,
    onPositionUpdate: (position: number) => void,
    onComplete?: () => void
  ): number {
    return this.startAnimation(
      carId,
      (progress: number) => {
        // Ease-in-out: плавное начало и конец
        const easedProgress = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        const position = startPosition + (endPosition - startPosition) * easedProgress;
        onPositionUpdate(Math.min(position, 100));
      },
      duration,
      onComplete
    );
  }

  /**
   * Создать анимацию с эффектом рывков (для имитации реалистичного движения)
   * @param carId - ID автомобиля
   * @param startPosition - Начальная позиция
   * @param endPosition - Конечная позиция
   * @param duration - Длительность
   * @param jitter - Интенсивность рывков (0-1)
   * @param onPositionUpdate - Функция обновления позиции
   * @param onComplete - Функция по завершении
   * @returns ID анимации
   */
  animateCarWithJitter(
    carId: number,
    startPosition: number,
    endPosition: number,
    duration: number,
    jitter: number = 0.05,
    onPositionUpdate: (position: number) => void,
    onComplete?: () => void
  ): number {
    let lastPosition = startPosition;
    
    return this.startAnimation(
      carId,
      (progress: number) => {
        // Базовое движение с ease-in-out
        const easedProgress = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        
        // Добавляем случайные рывки
        const jitterAmount = (Math.random() - 0.5) * jitter * 10;
        let position = startPosition + (endPosition - startPosition) * easedProgress + jitterAmount;
        
        // Ограничиваем позицию
        position = Math.max(0, Math.min(100, position));
        
        // Сглаживаем движение, чтобы избежать резких скачков
        position = lastPosition + (position - lastPosition) * 0.7;
        lastPosition = position;
        
        onPositionUpdate(position);
      },
      duration,
      onComplete
    );
  }

  /**
   * Создать анимацию движения с переменной скоростью
   * @param carId - ID автомобиля
   * @param startPosition - Начальная позиция
   * @param endPosition - Конечная позиция
   * @param duration - Длительность
   * @param speedVariation - Вариация скорости (0-1)
   * @param onPositionUpdate - Функция обновления позиции
   * @param onComplete - Функция по завершении
   * @returns ID анимации
   */
  animateCarWithVariableSpeed(
    carId: number,
    startPosition: number,
    endPosition: number,
    duration: number,
    speedVariation: number = 0.3,
    onPositionUpdate: (position: number) => void,
    onComplete?: () => void
  ): number {
    let lastProgress = 0;
    
    return this.startAnimation(
      carId,
      (progress: number) => {
        // Добавляем вариацию скорости
        const variation = 1 + (Math.random() - 0.5) * speedVariation;
        const adjustedProgress = Math.min(progress * variation, 1);
        
        // Ease-in-out с вариацией
        const easedProgress = adjustedProgress < 0.5
          ? 2 * adjustedProgress * adjustedProgress
          : 1 - Math.pow(-2 * adjustedProgress + 2, 2) / 2;
        
        // Сглаживаем, чтобы избежать резких изменений
        const smoothProgress = lastProgress + (easedProgress - lastProgress) * 0.5;
        lastProgress = smoothProgress;
        
        const position = startPosition + (endPosition - startPosition) * Math.min(smoothProgress, 1);
        onPositionUpdate(Math.min(position, 100));
      },
      duration,
      onComplete
    );
  }

  /**
   * Анимировать несколько автомобилей одновременно
   * @param cars - Массив данных для анимации
   * @param onUpdate - Функция обновления для каждого автомобиля
   * @param onComplete - Функция по завершении всех анимаций
   */
  animateMultipleCars(
    cars: Array<{
      id: number;
      startPosition: number;
      endPosition: number;
      duration: number;
    }>,
    onUpdate: (carId: number, position: number) => void,
    onComplete?: () => void
  ): void {
    let completedCount = 0;
    const totalCars = cars.length;

    if (totalCars === 0) {
      if (onComplete) onComplete();
      return;
    }

    cars.forEach((car) => {
      this.animateCarMovement(
        car.id,
        car.startPosition,
        car.endPosition,
        car.duration,
        (position: number) => {
          onUpdate(car.id, position);
        },
        () => {
          completedCount++;
          if (completedCount === totalCars && onComplete) {
            onComplete();
          }
        }
      );
    });
  }

  /**
   * Очистить все анимации и ресурсы
   */
  destroy(): void {
    this.stopAllAnimations();
    this.frameCallbacks.clear();
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}

/**
 * Единый экземпляр сервиса анимации
 */
export const animationService = new AnimationService();

/**
 * Easing функции для анимаций
 */
export const Easing = {
  /**
   * Линейная анимация
   */
  linear(t: number): number {
    return t;
  },

  /**
   * Ease-in (ускорение)
   */
  easeIn(t: number): number {
    return t * t;
  },

  /**
   * Ease-out (замедление)
   */
  easeOut(t: number): number {
    return 1 - (1 - t) * (1 - t);
  },

  /**
   * Ease-in-out (плавное начало и конец)
   */
  easeInOut(t: number): number {
    return t < 0.5
      ? 2 * t * t
      : 1 - Math.pow(-2 * t + 2, 2) / 2;
  },

  /**
   * Cubic ease-in
   */
  easeInCubic(t: number): number {
    return t * t * t;
  },

  /**
   * Cubic ease-out
   */
  easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  },

  /**
   * Cubic ease-in-out
   */
  easeInOutCubic(t: number): number {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  },

  /**
   * Elastic ease-out (эффект пружины)
   */
  elasticOut(t: number): number {
    const c4 = (2 * Math.PI) / 3;
    return t === 0
      ? 0
      : t === 1
      ? 1
      : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },

  /**
   * Bounce ease-out (эффект подпрыгивания)
   */
  bounceOut(t: number): number {
    const n1 = 7.5625;
    const d1 = 2.75;
    
    if (t < 1 / d1) {
      return n1 * t * t;
    } else if (t < 2 / d1) {
      return n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      return n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    }
  },
};

/**
 * Утилиты для работы с анимациями
 */
export const AnimationUtils = {
  /**
   * Рассчитать время анимации на основе скорости и расстояния
   * @param distance - Расстояние в процентах
   * @param velocity - Скорость (пикселей в секунду)
   * @param trackWidth - Ширина трека в пикселях
   * @returns Время в миллисекундах
   */
  calculateDuration(distance: number, velocity: number, trackWidth: number): number {
    if (velocity <= 0) return 0;
    const pixels = (distance / 100) * trackWidth;
    return (pixels / velocity) * 1000;
  },

  /**
   * Интерполяция между двумя значениями
   */
  lerp(start: number, end: number, progress: number): number {
    return start + (end - start) * progress;
  },

  /**
   * Ограничить значение в диапазоне
   */
  clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  },

  /**
   * Создать плавное изменение с задержкой
   */
  delayedAnimation(
    callback: () => void,
    delay: number
  ): number {
    return window.setTimeout(callback, delay);
  },
};