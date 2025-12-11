// Interface fyrir bíómynd (Nú með ID)
interface Movie {
    id: number;
    title: string;
    year: number;
    genre: string;
    poster: string;
}

// 1. Náum í elementin úr HTML
const container = document.getElementById('movie-container');
const searchInput = document.getElementById('search-input') as HTMLInputElement;

// 2. Aðalfallið: Sækir myndir (tekur við valfrjálsu leitarorði)
async function getMovies(query: string = '') {
    if (!container) return;

    try {
        // Sýna loading state ef við erum að leita
        // (Ef þetta er fyrsta hleðsla viljum við kannski ekki hreinsa allt strax, en gerum það hér til einföldunar)
        if (!query) {
            container.innerHTML = '<p class="loading">Sæki bíómyndir...</p>';
        }

        // Búum til slóðina
        // Dæmi: http://localhost:3000/api/movies?search=matrix
        let url = 'http://localhost:3000/api/movies';
        
        if (query) {
            url += `?search=${query}`;
        }

        // Sækjum gögnin
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Villa: ${response.status}`);
        }

        const movies: Movie[] = await response.json();

        // Hreinsum gáminn
        container.innerHTML = '';

        // Tékka hvort eitthvað fannst
        if (movies.length === 0) {
            container.innerHTML = '<p class="error">Engar myndir fundust.</p>';
            return;
        }

        // Teiknum spjöldin
        for (const movie of movies) {
            const card = document.createElement('article');
            card.className = 'movie-card';
            
            card.innerHTML = `
                <div class="poster">${movie.poster}</div>
                <div class="info">
                    <h2>${movie.title}</h2>
                    <p class="year">${movie.year}</p>
                    <p class="category">${movie.genre}</p>
                </div>
            `;
            
            container.appendChild(card);
        }

    } catch (error) {
        console.error("Villa:", error);
        if (container) {
            container.innerHTML = `
                <div class="error">
                    <h3>Úbbs!</h3>
                    <p>Náði ekki sambandi við vefþjóninn.</p>
                </div>
            `;
        }
    }
}

// 3. Keyra fallið strax í byrjun (sækja allar myndir)
getMovies();

// 4. Hlusta á innslátt í leitarboxið
if (searchInput) {
    searchInput.addEventListener('input', (event) => {
        const target = event.target as HTMLInputElement;
        const value = target.value;
        
        // Hér gætum við sett "Debounce" seinna (bíða í 300ms), 
        // en köllum strax í getMovies til að byrja með.
        getMovies(value);
    });
}