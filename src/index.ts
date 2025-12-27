import { getMovies } from './services/movieService.js';
import { createMovieCard } from './components/MovieCard.js';
import { createLoader } from './components/Loader.js';

const app = document.querySelector('main#app');

async function init() {
    if (!app) return;

    // 1. Sýna loader 
    app.innerHTML = createLoader();

    try {
        // 2. Sækja gögnin og bíða (Pizza-doorbell samlíkingin) [cite: 251, 252]
        const movies = await getMovies();

        // 3. Birta gögnin þegar þau koma
        app.innerHTML = `
            <section class="movie-grid">
                ${movies.map(createMovieCard).join('')}
            </section>
        `;
    } catch (error) {
        // 4. Meðhöndla villur
        app.innerHTML = `<p class="error">Villa kom upp: ${error}</p>`;
    }
}

// Ræsa forritið
init();