interface Movie {
    id: number;
    title: string;
    year: number;
    genre: string;
    poster: string;
}

// Náum í elementin
const container = document.getElementById('movie-container');
const searchInput = document.getElementById('search-input') as HTMLInputElement;

const addMovieBtn = document.getElementById('add-movie-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const modal = document.getElementById('add-movie-modal') as HTMLDialogElement;
const form = document.getElementById('add-movie-form') as HTMLFormElement;

// 1. Sækja myndir (GET)
async function getMovies(query: string = '') {
    if (!container) return;
    try {
        let url = 'http://localhost:3000/api/movies';
        if (query) url += `?search=${query}`;
        
        const res = await fetch(url);
        const movies: Movie[] = await res.json();
        
        container.innerHTML = '';
        
        if (movies.length === 0) {
            container.innerHTML = '<p>Engar myndir.</p>';
            return;
        }

        for (const m of movies) {
            const card = document.createElement('article');
            card.className = 'movie-card';
            card.innerHTML = `
                <div class="poster">${m.poster}</div>
                <div class="info">
                    <h2>${m.title}</h2>
                    <p>${m.year}</p>
                    <p style="color:#e50914">${m.genre}</p>
                </div>`;
            container.appendChild(card);
        }
    } catch (e) { console.error(e); }
}

// Keyra strax í byrjun
getMovies();

// 2. Leit
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        getMovies((e.target as HTMLInputElement).value);
    });
}

// 3. Modal Takkar (Opna/Loka)
if (addMovieBtn && modal) {
    addMovieBtn.addEventListener('click', () => modal.showModal());
}
if (closeModalBtn && modal) {
    closeModalBtn.addEventListener('click', () => modal.close());
}

// 4. Form Submit (POST)
if (form) {
    form.addEventListener('submit', async (event) => {
        // Stoppa síðuna í að refresh-a
        event.preventDefault();

        // Ná í gögnin úr forminu
        const formData = new FormData(form);
        const newMovie = {
            title: formData.get('title') as string,
            year: parseInt(formData.get('year') as string),
            genre: formData.get('genre') as string,
            poster: formData.get('poster') as string
        };

        try {
            // Senda á serverinn
            const response = await fetch('http://localhost:3000/api/movies', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newMovie)
            });

            if (!response.ok) throw new Error('Villa við vistun');

            // Ef allt gekk vel:
            form.reset();      // Hreinsa formið
            modal.close();     // Loka glugganum
            getMovies();       // Sækja listann aftur (uppfæra síðuna)

        } catch (error) {
            console.error(error);
            alert('Gat ekki vistað mynd!');
        }
    });
}