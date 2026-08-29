import './styles/main.scss';
import { Garage } from './components/Garage';
import { Controls } from './components/Controls';
import { WinnerModal } from './components/WinnerModal';
import { garageStore } from './store/garage.store';

class App {
  private garage: Garage;
  private controls: Controls;
  private winnerModal: WinnerModal;

  constructor() {
    // Создаем корневой элемент если его нет
    this.ensureRootElement();

    // Инициализируем компоненты
    this.garage = new Garage('raceTrack');
    this.controls = new Controls('controlsContainer');
    this.winnerModal = new WinnerModal('winnerModalContainer');

    // Загружаем первую страницу
    garageStore.loadPage(1);
  }

  private ensureRootElement(): void {
    const root = document.getElementById('app');
    if (!root) {
      const app = document.createElement('div');
      app.id = 'app';
      document.body.appendChild(app);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});

console.log('🏁 Async Race initialized!');