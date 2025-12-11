// Interface fyrir bíómynd
interface Movie {
    id: number;
    title: string;
    year: number;
    genre: string;
    poster: string;
}

// --- Náum í elementin úr HTML ---

// 1. Aðal element
const container = document.getElementById('movie-container');
const searchInput = document.getElementById('search-input') as HTMLInputElement;

// 2. Movie Modal (Bæta við / Breyta)
const addMovieBtn = document.getElementById('add-movie-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const movieModal = document.getElementById('add-movie-modal') as HTMLDialogElement;
const movieForm = document.getElementById('add-movie-form') as HTMLFormElement;
const modalTitle = document.getElementById('modal-title');
const formErrors = document.getElementById('form-errors');

// 3. NÝTT: Register Modal (Nýskráning)
const registerBtn = document.getElementById('register-btn');
const registerModal = document.getElementById('register-modal') as HTMLDialogElement;
const registerForm = document.getElementById('register-form') as HTMLFormElement;
const closeRegisterBtn = document.getElementById('close-register-btn');
const registerErrors = document.getElementById('register-errors');


// ==========================================
//      HLUTI 1: BÍÓMYNDIR (CRUD)
// ==========================================

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
                </div>
                <div class="card-actions">
                    <button class="btn-icon btn-edit" title="Breyta">✏️</button>
                    <button class="btn-icon btn-delete" title="Eyða">🗑️</button>
                </div>
            `;

            const editBtn = card.querySelector('.btn-edit');
            const deleteBtn = card.querySelector('.btn-delete');

            editBtn?.addEventListener('click', () => openEditModal(m));
            deleteBtn?.addEventListener('click', () => deleteMovie(m.id));

            container.appendChild(card);
        }
    } catch (e) { console.error(e); }
}

// 2. Eyða mynd (DELETE)
async function deleteMovie(id: number) {
    if (!confirm('Ertu viss um að þú viljir eyða þessari mynd?')) return;

    try {
        const res = await fetch(`http://localhost:3000/api/movies/${id}`, {
            method: 'DELETE'
        });
        
        if (res.ok) {
            getMovies();
        } else {
            alert('Gat ekki eytt mynd.');
        }
    } catch (e) { console.error(e); }
}

// 3. Opna modal fyrir Edit
function openEditModal(movie: Movie) {
    if (!movieModal || !movieForm || !modalTitle) return;

    modalTitle.textContent = "Breyta Bíómynd";
    if (formErrors) formErrors.textContent = "";

    (movieForm.elements.namedItem('id') as HTMLInputElement).value = movie.id.toString();
    (movieForm.elements.namedItem('title') as HTMLInputElement).value = movie.title;
    (movieForm.elements.namedItem('year') as HTMLInputElement).value = movie.year.toString();
    (movieForm.elements.namedItem('genre') as HTMLInputElement).value = movie.genre;
    (movieForm.elements.namedItem('poster') as HTMLInputElement).value = movie.poster;

    movieModal.showModal();
}

// 4. Movie Modal Takkar
if (addMovieBtn && movieModal && movieForm && modalTitle) {
    addMovieBtn.addEventListener('click', () => {
        movieForm.reset();
        (movieForm.elements.namedItem('id') as HTMLInputElement).value = "";
        if (formErrors) formErrors.textContent = "";
        modalTitle.textContent = "Ný Bíómynd";
        movieModal.showModal();
    });
}

if (closeModalBtn && movieModal) {
    closeModalBtn.addEventListener('click', () => movieModal.close());
}

// 5. MOVIE FORM SUBMIT (POST/PUT)
if (movieForm) {
    movieForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (formErrors) formErrors.textContent = "";

        const formData = new FormData(movieForm);
        const id = formData.get('id') as string;

        const movieData = {
            title: formData.get('title') as string,
            year: parseInt(formData.get('year') as string),
            genre: formData.get('genre') as string,
            poster: formData.get('poster') as string
        };

        try {
            let response;
            if (id) {
                response = await fetch(`http://localhost:3000/api/movies/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(movieData)
                });
            } else {
                response = await fetch('http://localhost:3000/api/movies', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(movieData)
                });
            }

            const result = await response.json();

            if (!response.ok) {
                if (result.errors && formErrors) {
                    formErrors.textContent = result.errors.join('\n');
                } else {
                    alert('Villa: ' + (result.error || response.statusText));
                }
                return;
            }

            movieForm.reset();
            movieModal.close();
            getMovies();

        } catch (error) {
            console.error(error);
            alert('Villa í samskiptum við vefþjón.');
        }
    });
}


// ==========================================
//      HLUTI 2: NÝSKRÁNING (REGISTER) - NÝTT
// ==========================================

// 1. Opna Register Modal
if (registerBtn && registerModal) {
    registerBtn.addEventListener('click', () => {
        if (registerForm) registerForm.reset();
        if (registerErrors) registerErrors.textContent = ""; // Hreinsa gamlar villur
        registerModal.showModal();
    });
}

// 2. Loka Register Modal
if (closeRegisterBtn && registerModal) {
    closeRegisterBtn.addEventListener('click', () => registerModal.close());
}

// 3. REGISTER FORM SUBMIT
if (registerForm) {
    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        // Hreinsa villuskilaboð
        if (registerErrors) registerErrors.textContent = "";

        const formData = new FormData(registerForm);
        const userData = {
            name: formData.get('name') as string,
            username: formData.get('username') as string,
            password: formData.get('password') as string
        };

        try {
            const response = await fetch('http://localhost:3000/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userData)
            });

            const result = await response.json();

            // Ef eitthvað fór úrskeiðis (t.d. validation eða username tekið)
            if (!response.ok) {
                if (result.errors && registerErrors) {
                    // Birta villurnar í rauða boxinu
                    registerErrors.textContent = result.errors.join('\n');
                } else {
                    alert('Villa við nýskráningu: ' + (result.error || 'Óþekkt villa'));
                }
                return;
            }

            // Ef allt gekk vel
            alert(`Velkomin/n ${result.name}! Aðgangur búinn til.`);
            registerForm.reset();
            registerModal.close();
            // (Hér gætum við opnað login glugga seinna meir)

        } catch (error) {
            console.error(error);
            alert('Kerfisvilla: Gat ekki náð sambandi við vefþjón.');
        }
    });
}


// ==========================================
//      UPPSETNING
// ==========================================

// Keyra strax
getMovies();

// Leitarvirkni
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        getMovies((e.target as HTMLInputElement).value);
    });
}