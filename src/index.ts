// 1. Við sækjum gögnin okkar úr data.ts
// MIKILVÆGT: Við verðum að skrifa '.js' endingu hér því vafrinn skilur bara JS.
import { movies } from './data.js';

console.log('Kvikmyndasafnið er ræst 🚀');

// 2. Finnum gáminn í HTML-inu þar sem við ætlum að setja myndirnar
const container = document.getElementById('movie-container');

// 3. Við verðum að tékka hvort gámurinn fannst (null check)
if (container) {
    
    // Hreinsum allt sem gæti verið í gámnum fyrir (t.d. "Loading..." texti)
    container.innerHTML = '';

    // 4. Lykkjum yfir listann af bíómyndum
    for (const movie of movies) {
        
        // --- Búum til HTML elementin í minninu ---

        // Búum til <article> fyrir spjaldið
        const card = document.createElement('article');
        card.className = 'movie-card'; // Gefum því CSS klassa

        // Búum til <div> fyrir emoji/poster
        const posterDiv = document.createElement('div');
        posterDiv.className = 'poster';
        posterDiv.textContent = movie.poster;

        // Búum til <div> fyrir upplýsingarnar
        const infoDiv = document.createElement('div');
        infoDiv.className = 'info';

        // Hér er gott að nota "Template Strings" (backticks) til að setja inn titil og ártal
        infoDiv.innerHTML = `
            <h2>${movie.title}</h2>
            <p class="year">${movie.year}</p>
            <p class="category">${movie.genre}</p>
        `;

        // --- Púslum þessu saman ---
        
        // Setjum poster og info inn í spjaldið
        card.appendChild(posterDiv);
        card.appendChild(infoDiv);

        // Að lokum: Setjum spjaldið inn á síðuna (í gáminn)
        container.appendChild(card);
    }

} else {
    // Ef gámurinn finnst ekki, látum vita í console (gott til að debugga)
    console.error('Villa: Fann ekki element með id="movie-container"!');
}