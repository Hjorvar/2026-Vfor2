import { Movie } from '../types.js';

export function createMovieCard(movie: Movie): string {
    return `
        <article class="movie-card">
            <header>
                <img src="${movie.poster}" alt="Veggspjald fyrir ${movie.title}">
            </header>
            <section class="info">
                <h2>${movie.title}</h2>
                <p><strong>Ár:</strong> ${movie.year}</p>
                <p><strong>Tegund:</strong> ${movie.genre}</p>
            </section>
        </article>
    `;
}