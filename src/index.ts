// --- Hér skilgreinum við hvernig gögnin líta út ---
// Við skilgreinum interface-ið aftur hér því við getum ekki import-að því auðveldlega frá servernum ennþá.
interface Movie {
    title: string;
    year: number;
    genre: string;
    poster: string;
}

// 1. Finnum gáminn í HTML þar sem myndirnar eiga að birtast
const container = document.getElementById('movie-container');

// 2. Búum til ósamstillt (async) fall til að sækja gögnin
async function getMovies() {
    
    // Tékka hvort gámurinn sé til áður en við gerum nokkuð
    if (!container) {
        console.error('Fann ekki element með id="movie-container"');
        return;
    }

    try {
        // Sýna notandanum að við séum að vinna (UX)
        container.innerHTML = '<p class="loading">Sæki bíómyndir...</p>';

        // --- Hér gerist galdurinn (FETCH) ---
        console.log('Reyni að tengjast við server...');
        
        // Við köllum á Express þjóninn okkar (sem verður að vera í gangi á port 3000)
        const response = await fetch('http://localhost:3000/api/movies');

        // Tékka hvort serverinn svaraði með villu (t.d. 404 eða 500)
        if (!response.ok) {
            throw new Error(`Villa frá vefþjóni: ${response.status}`);
        }

        // Breytum svarinu úr texta yfir í JSON (fylki af Movie)
        const movies: Movie[] = await response.json();

        console.log('Gögn komin:', movies);

        // Hreinsum "Sæki bíómyndir..." textann
        container.innerHTML = '';

        // --- Teiknum upp gögnin (Sama rökfræði og í Viku 2) ---
        for (const movie of movies) {
            
            const card = document.createElement('article');
            card.className = 'movie-card';

            const posterDiv = document.createElement('div');
            posterDiv.className = 'poster';
            posterDiv.textContent = movie.poster;

            const infoDiv = document.createElement('div');
            infoDiv.className = 'info';

            // Notum template literal fyrir innihaldið
            infoDiv.innerHTML = `
                <h2>${movie.title}</h2>
                <p class="year">${movie.year}</p>
                <p class="category">${movie.genre}</p>
            `;

            card.appendChild(posterDiv);
            card.appendChild(infoDiv);
            container.appendChild(card);
        }

    } catch (error) {
        // Ef eitthvað fer úrskeiðis (t.d. serverinn er slökktur)
        console.error('VILLA:', error);
        
        // Sýnum villuna á skjánum svo notandinn viti hvað gerðist
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <h3>Úbbs! Eitthvað fór úrskeiðis.</h3>
                    <p>Náði ekki sambandi við vefþjóninn.</p>
                    <p>Er kveikt á honum? (node dist/server.js)</p>
                </div>
            `;
        }
    }
}

// 3. Keyrum fallið strax þegar síðan hleðst
getMovies();