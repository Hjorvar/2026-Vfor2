// Interface fyrir bíómynd
interface Movie {
    id: number;
    title: string;
    year: number;
    genre: string;
    poster: string;
}

// --- Náum í elementin úr HTML ---
const container = document.getElementById('movie-container');
const searchInput = document.getElementById('search-input') as HTMLInputElement;

// Modal og Form element
const addMovieBtn = document.getElementById('add-movie-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const modal = document.getElementById('add-movie-modal') as HTMLDialogElement;
const form = document.getElementById('add-movie-form') as HTMLFormElement;
const modalTitle = document.getElementById('modal-title');

// NÝTT: Elementið sem sýnir villuskilaboðin (rauði textinn)
const formErrors = document.getElementById('form-errors');


// --- 1. Sækja myndir (GET) ---
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
                </div>
                <div class="card-actions">
                    <button class="btn-icon btn-edit" title="Breyta">✏️</button>
                    <button class="btn-icon btn-delete" title="Eyða">🗑️</button>
                </div>
            `;

            // Tengjum takkana
            const editBtn = card.querySelector('.btn-edit');
            const deleteBtn = card.querySelector('.btn-delete');

            editBtn?.addEventListener('click', () => openEditModal(m));
            deleteBtn?.addEventListener('click', () => deleteMovie(m.id));

            container.appendChild(card);
        }
    } catch (e) { console.error(e); }
}

// --- 2. Eyða mynd (DELETE) ---
async function deleteMovie(id: number) {
    if (!confirm('Ertu viss um að þú viljir eyða þessari mynd?')) return;

    try {
        const res = await fetch(`http://localhost:3000/api/movies/${id}`, {
            method: 'DELETE'
        });
        
        if (res.ok) {
            getMovies(); // Uppfæra listann
        } else {
            alert('Gat ekki eytt mynd.');
        }
    } catch (e) { console.error(e); }
}

// --- 3. Opna modal fyrir Edit ---
function openEditModal(movie: Movie) {
    if (!modal || !form || !modalTitle) return;

    modalTitle.textContent = "Breyta Bíómynd";
    
    // Hreinsum gamlar villur ef þær voru til staðar
    if (formErrors) formErrors.textContent = "";

    // Fyllum inn í formið
    (form.elements.namedItem('id') as HTMLInputElement).value = movie.id.toString();
    (form.elements.namedItem('title') as HTMLInputElement).value = movie.title;
    (form.elements.namedItem('year') as HTMLInputElement).value = movie.year.toString();
    (form.elements.namedItem('genre') as HTMLInputElement).value = movie.genre;
    (form.elements.namedItem('poster') as HTMLInputElement).value = movie.poster;

    modal.showModal();
}


// --- Uppsetning á Event Listeners ---

// Keyra strax í byrjun
getMovies();

// Leit
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        getMovies((e.target as HTMLInputElement).value);
    });
}

// "Bæta við" takkinn
if (addMovieBtn && modal && form && modalTitle) {
    addMovieBtn.addEventListener('click', () => {
        form.reset(); // Hreinsa formið
        (form.elements.namedItem('id') as HTMLInputElement).value = ""; // Hreinsa ID
        
        // Hreinsa villuskilaboðin líka!
        if (formErrors) formErrors.textContent = "";

        modalTitle.textContent = "Ný Bíómynd";
        modal.showModal();
    });
}

// Loka takkinn
if (closeModalBtn && modal) {
    closeModalBtn.addEventListener('click', () => modal.close());
}


// --- 4. FORM SUBMIT (Höndlar Validation Villur) ---
if (form) {
    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        // Hreinsa gamlar villur áður en við sendum
        if (formErrors) formErrors.textContent = "";

        const formData = new FormData(form);
        const id = formData.get('id') as string;

        // Búum til hlutinn sem við sendum á serverinn
        // Við notum 'any' eða Type Casting hér til að einfalda, en serverinn sér um validation
        const movieData = {
            title: formData.get('title') as string,
            year: parseInt(formData.get('year') as string), // Serverinn vill tölu
            genre: formData.get('genre') as string,
            poster: formData.get('poster') as string
        };

        try {
            let response;

            // A. Uppfæra (PUT)
            if (id) {
                response = await fetch(`http://localhost:3000/api/movies/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(movieData)
                });
            } 
            // B. Búa til (POST)
            else {
                response = await fetch('http://localhost:3000/api/movies', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(movieData)
                });
            }

            // --- NÝTT: Meðhöndlun á svari ---
            
            // Við lesum svarið sem JSON (það gæti innihaldið villulista eða nýju myndina)
            const result = await response.json();

            // Ef serverinn segir að eitthvað sé að (t.d. status 400 eða 500)
            if (!response.ok) {
                // Ef þetta eru Zod villur (sem við sendum sem { errors: [...] })
                if (result.errors && formErrors) {
                    // Birtum villurnar í rauða boxinu, aðskildar með nýrri línu
                    formErrors.textContent = result.errors.join('\n');
                } else {
                    // Ef þetta er einhver önnur villa (t.d. DB hrundi)
                    alert('Óvænt villa: ' + (result.error || response.statusText));
                }
                
                // MIKILVÆGT: Við hættum hér! Ekki loka glugganum.
                // Þá getur notandinn lagað villurnar og reynt aftur.
                return;
            }

            // Ef allt gekk vel (Success):
            form.reset();
            modal.close();
            getMovies(); // Uppfæra listann

        } catch (error) {
            console.error(error);
            alert('Gat ekki náð sambandi við vefþjón.');
        }
    });
}