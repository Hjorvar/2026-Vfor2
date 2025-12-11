// Interface fyrir bíómynd
interface Movie {
    id: number;
    title: string;
    year: number;
    genre: string;
    poster: string;
}

// Náum í elementin úr HTML
const container = document.getElementById('movie-container');
const searchInput = document.getElementById('search-input') as HTMLInputElement;

const addMovieBtn = document.getElementById('add-movie-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const modal = document.getElementById('add-movie-modal') as HTMLDialogElement;
const form = document.getElementById('add-movie-form') as HTMLFormElement;

// NÝTT: Við þurfum þetta til að geta breytt titlinum á glugganum ("Ný mynd" vs "Breyta mynd")
const modalTitle = document.getElementById('modal-title');


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
            
            // Við bætum við "card-actions" neðst með Edit og Delete tökkum
            card.innerHTML = `
                <div class="poster">${m.poster}</div>
                <div class="info">
                    <h2>${m.title}</h2>
                    <p>${m.year}</p>
                    <p style="color:#e50914">${m.genre}</p>
                </div>
                <div class="card-actions">
                    <button class="btn-icon btn-edit" title="Breyta">✏️</button>
                    <button class="btn-icon btn-delete" title="Eyða">🗑️</button>
                </div>
            `;

            // Tengjum takkana við föllin okkar
            const editBtn = card.querySelector('.btn-edit');
            const deleteBtn = card.querySelector('.btn-delete');

            editBtn?.addEventListener('click', () => {
                openEditModal(m); // Opna glugga með gögnum
            });

            deleteBtn?.addEventListener('click', () => {
                deleteMovie(m.id); // Eyða mynd
            });

            container.appendChild(card);
        }
    } catch (e) { console.error(e); }
}

// NÝTT: Fall til að eyða (DELETE)
async function deleteMovie(id: number) {
    console.log("Reyni að eyða mynd nr:", id);
    // Spyrjum notandann fyrst (öryggisatriði)
    const confirmDelete = confirm('Ertu viss um að þú viljir eyða þessari mynd?');
    if (!confirmDelete) {
        console.log("Hætt við eyðingu");
        return;
    }

    try {
        const res = await fetch(`http://localhost:3000/api/movies/${id}`, {
            method: 'DELETE'
        });
        
        if (res.ok) {
            getMovies(); // Uppfæra listann strax eftir eyðingu
        } else {
            alert('Gat ekki eytt mynd.');
        }
    } catch (e) { console.error(e); }
}

// NÝTT: Fall til að opna modal fyrir breytingar (EDIT)
function openEditModal(movie: Movie) {
    if (!modal || !form || !modalTitle) return;

    // 1. Breyta titli á glugga
    modalTitle.textContent = "Breyta Bíómynd";

    // 2. Fylla inn í formið með gögnum úr myndinni
    // Við notum 'as HTMLInputElement' til að TypeScript viti að þetta sé input
    (form.elements.namedItem('id') as HTMLInputElement).value = movie.id.toString();
    (form.elements.namedItem('title') as HTMLInputElement).value = movie.title;
    (form.elements.namedItem('year') as HTMLInputElement).value = movie.year.toString();
    (form.elements.namedItem('genre') as HTMLInputElement).value = movie.genre;
    (form.elements.namedItem('poster') as HTMLInputElement).value = movie.poster;

    // 3. Opna gluggann
    modal.showModal();
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
// UPPFÆRT: "Bæta við" takkinn þarf núna að HREINSA formið fyrst
if (addMovieBtn && modal && form && modalTitle) {
    addMovieBtn.addEventListener('click', () => {
        form.reset(); // Hreinsa gamalt textadrasl
        (form.elements.namedItem('id') as HTMLInputElement).value = ""; // MIKILVÆGT: Hreinsa ID svo við búum til nýtt en breytum ekki gamla
        modalTitle.textContent = "Ný Bíómynd"; // Breyta titli til baka
        modal.showModal();
    });
}

if (closeModalBtn && modal) {
    closeModalBtn.addEventListener('click', () => modal.close());
}


// 4. Form Submit (Höndlar núna bæði POST og PUT)
if (form) {
    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const formData = new FormData(form);
        const id = formData.get('id') as string; // Sækjum falda ID-ið

        const movieData = {
            title: formData.get('title') as string,
            year: parseInt(formData.get('year') as string),
            genre: formData.get('genre') as string,
            poster: formData.get('poster') as string
        };

        try {
            let response;

            // UPPFÆRT: Rökfræðin fyrir vistun
            
            // A. Ef ID er til í forminu -> Þá erum við að UPPFÆRA (PUT)
            if (id) {
                response = await fetch(`http://localhost:3000/api/movies/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(movieData)
                });
            } 
            // B. Ef ID er tómt -> Þá erum við að BÚA TIL (POST)
            else {
                response = await fetch('http://localhost:3000/api/movies', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(movieData)
                });
            }

            if (!response.ok) throw new Error('Villa við vistun');

            // Ef allt gekk vel:
            form.reset();
            modal.close();
            getMovies(); // Uppfæra listann

        } catch (error) {
            console.error(error);
            alert('Gat ekki vistað mynd!');
        }
    });
}