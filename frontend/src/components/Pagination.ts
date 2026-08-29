import { garageStore } from '../store/garage.store';

export class Pagination {
  private container: HTMLElement;

  constructor(containerId: string) {
    const element = document.getElementById(containerId);
    if (!element) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    this.container = element;
  }

  render(currentPage: number, totalPages: number): void {
    this.container.innerHTML = `
      <div class="pagination">
        <button class="btn btn-secondary btn-sm" id="prevPageBtn" ${currentPage <= 1 ? 'disabled' : ''}>
          ◀
        </button>
        <span class="page-info">Страница ${currentPage} / ${totalPages}</span>
        <button class="btn btn-secondary btn-sm" id="nextPageBtn" ${currentPage >= totalPages ? 'disabled' : ''}>
          ▶
        </button>
      </div>
    `;

    // Добавляем обработчики
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');

    prevBtn?.addEventListener('click', () => {
      garageStore.prevPage();
    });

    nextBtn?.addEventListener('click', () => {
      garageStore.nextPage();
    });
  }
}