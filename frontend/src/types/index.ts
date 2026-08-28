export type CarStatus = 'stopped' | 'racing' | 'finished' | 'broken';

export interface Car {
    id: number;
    name: string;
    color: string;
    status: CarStatus;
    position: number;
    velocity?: number;
    time?: number;
}
export interface CarCreateData {
    name: string;
    color: string;
}

export interface CarUpdateData {
    name?: string;
    color?: string;
    status?: CarStatus;
    position?: number;
    time?: number;
}
export interface EngineResponse {
    velocity: number;
    distance: number;
}

export interface DriveResponse {
    success: boolean;
}

export interface Winner {
    id: number;
    wins: number;
    time: number;

}

export interface WinnerWithCar extends Winner {
    name: string;
    color: string;
}

export interface PaginatedResponse<T> {

    items: T[];
    total: number;
    page: number;
    limit: number;
}

export interface RaceState {
    isRacing: boolean;
    finishedCount: number;
    startTime: number;
    winners: WinnerWithCar[];
}

export interface AppState {
    cars: Car[];
    winners: WinnerWithCar[];
    currentPage: number;
    totalCars: number;
    race: RaceState;
}