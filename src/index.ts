import { movies } from './data.js';
import { createMovieCard } from './components/MovieCard.js';

const app = document.querySelector('main#app');

if (app) {
    app.innerHTML = `
        <section class="movie-grid">
            ${movies.map(createMovieCard).join('')}
        </section>
    `;
}