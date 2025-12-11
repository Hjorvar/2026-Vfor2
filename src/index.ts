// UPPFÆRT INTERFACE (Vika 11)
interface Movie {
    id: number;
    title: string;
    year: number;
    genre: string;
    poster: string;
    user_id: number;     // ID á notandanum sem bjó til myndina
    created_by: string;  // Nafn notandans (frá SQL JOIN)
}

// ==========================================
//      DOM ELEMENTS
// ==========================================

// Aðal
const container = document.getElementById('movie-container');
const searchInput = document.getElementById('search-input') as HTMLInputElement;

// Auth (Header)
const authButtons = document.getElementById('auth-buttons');
const userControls = document.getElementById('user-controls');
const userGreeting = document.getElementById('user-greeting');
const logoutBtn = document.getElementById('logout-btn');

// Login Modal
const loginBtn = document.getElementById('login-btn');
const loginModal = document.getElementById('login-modal') as HTMLDialogElement;
const loginForm = document.getElementById('login-form') as HTMLFormElement;
const closeLoginBtn = document.getElementById('close-login-btn');
const loginErrors = document.getElementById('login-errors');

// Register Modal
const registerBtn = document.getElementById('register-btn');
const registerModal = document.getElementById('register-modal') as HTMLDialogElement;
const registerForm = document.getElementById('register-form') as HTMLFormElement;
const closeRegisterBtn = document.getElementById('close-register-btn');
const registerErrors = document.getElementById('register-errors');

// Movie Modal (Add / Edit)
const addMovieBtn = document.getElementById('add-movie-btn');
const movieModal = document.getElementById('add-movie-modal') as HTMLDialogElement;
const movieForm = document.getElementById('add-movie-form') as HTMLFormElement;
const closeModalBtn = document.getElementById('close-modal-btn');
const modalTitle = document.getElementById('modal-title');
const formErrors = document.getElementById('form-errors');


// ==========================================
//      AUTH STATE (Innskráningarkerfi)
// ==========================================

function checkAuth() {
    const token = localStorage.getItem('token');
    const name = localStorage.getItem('name');

    if (token && userControls && authButtons && userGreeting) {
        // Notandi er inni
        authButtons.style.display = 'none';
        userControls.style.display = 'flex';
        userGreeting.textContent = `Hæ, ${name}!`;
    } else if (userControls && authButtons) {
        // Enginn notandi
        authButtons.style.display = 'flex';
        userControls.style.display = 'none';
    }
}

// Útskráning
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        // Hreinsum ALLT úr geymslu
        localStorage.removeItem('token');
        localStorage.removeItem('name');
        localStorage.removeItem('userId'); // MIKILVÆGT: Hreinsa ID líka
        
        checkAuth();
        window.location.reload();
    });
}

checkAuth(); // Keyra strax


// ==========================================
//      LOGIN LOGIC
// ==========================================

if (loginBtn) loginBtn.addEventListener('click', () => {
    if (loginForm) loginForm.reset();
    if (loginErrors) loginErrors.textContent = "";
    loginModal.showModal();
});

if (closeLoginBtn) closeLoginBtn.addEventListener('click', () => loginModal.close());

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (loginErrors) loginErrors.textContent = "";

        const formData = new FormData(loginForm);
        const data = {
            username: formData.get('username') as string,
            password: formData.get('password') as string
        };

        try {
            const res = await fetch('http://localhost:3000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await res.json();

            if (!res.ok) {
                if (loginErrors) loginErrors.textContent = result.error || 'Villa';
                return;
            }

            // SUCCESS: Vistum gögnin
            localStorage.setItem('token', result.token);
            localStorage.setItem('name', result.name);
            localStorage.setItem('userId', result.id); // NÝTT: Vistum ID til að nota í getMovies
            
            loginModal.close();
            checkAuth();
            getMovies(); // Sækjum myndir aftur til að sýna Edit takka

        } catch (error) {
            console.error(error);
            if (loginErrors) loginErrors.textContent = 'Kerfisvilla';
        }
    });
}


// ==========================================
//      REGISTER LOGIC
// ==========================================

if (registerBtn) registerBtn.addEventListener('click', () => {
    if (registerForm) registerForm.reset();
    if (registerErrors) registerErrors.textContent = "";
    registerModal.showModal();
});

if (closeRegisterBtn) closeRegisterBtn.addEventListener('click', () => registerModal.close());

if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (registerErrors) registerErrors.textContent = "";

        const formData = new FormData(registerForm);
        const data = {
            name: formData.get('name') as string,
            username: formData.get('username') as string,
            password: formData.get('password') as string
        };

        try {
            const res = await fetch('http://localhost:3000/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await res.json();

            if (!res.ok) {
                if (result.errors && registerErrors) registerErrors.textContent = result.errors.join('\n');
                else alert('Villa: ' + (result.error || 'Óþekkt villa'));
                return;
            }

            alert(`Velkomin/n ${result.name}! Aðgangur búinn til.`);
            registerModal.close();
        } catch (error) {
            console.error(error);
            alert('Kerfisvilla');
        }
    });
}


// ==========================================
//      MOVIE CRUD (Með Eignarhaldi!)
// ==========================================

async function getMovies(query: string = '') {
    if (!container) return;
    try {
        let url = 'http://localhost:3000/api/movies';
        if (query) url += `?search=${query}`;
        
        const res = await fetch(url);
        const movies: Movie[] = await res.json();
        
        container.innerHTML = '';
        
        // Sækjum upplýsingar um hver ÉG er
        const token = localStorage.getItem('token');
        const currentUserId = parseInt(localStorage.getItem('userId') || '0');

        for (const m of movies) {
            const card = document.createElement('article');
            card.className = 'movie-card';
            
            // NÝTT: Sýnum hver bjó til myndina
            // Ef enginn bjó hana til (gamlar myndir), sýnum ekkert
            const ownerHtml = m.created_by 
                ? `<p class="owner" style="font-size:0.8rem; color:#888;">👤 ${m.created_by}</p>` 
                : '';

            // NÝTT: Sýnum bara takka ef ÉG á myndina
            const isMyMovie = token && (m.user_id === currentUserId);

            let actionsHtml = '';
            if (isMyMovie) {
                actionsHtml = `
                    <div class="card-actions">
                        <button class="btn-icon btn-edit" title="Breyta">✏️</button>
                        <button class="btn-icon btn-delete" title="Eyða">🗑️</button>
                    </div>
                `;
            }

            card.innerHTML = `
                <div class="poster">${m.poster}</div>
                <div class="info">
                    <h2>${m.title}</h2>
                    <p>${m.year}</p>
                    <p style="color:#e50914">${m.genre}</p>
                    ${ownerHtml}
                </div>
                ${actionsHtml}
            `;

            // Setjum bara event listeners ef takkarnir eru til (þ.e. ef ég á myndina)
            if (isMyMovie) {
                const editBtn = card.querySelector('.btn-edit');
                const deleteBtn = card.querySelector('.btn-delete');
                editBtn?.addEventListener('click', () => openEditModal(m));
                deleteBtn?.addEventListener('click', () => deleteMovie(m.id));
            }

            container.appendChild(card);
        }
    } catch (e) { console.error(e); }
}


// DELETE (Verndað)
async function deleteMovie(id: number) {
    if (!confirm('Ertu viss um að þú viljir eyða þessari mynd?')) return;
    const token = localStorage.getItem('token');

    try {
        const res = await fetch(`http://localhost:3000/api/movies/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            getMovies();
        } else {
            // Ef serverinn segir 403 (Forbidden)
            const result = await res.json();
            alert(result.error || 'Gat ekki eytt mynd.');
        }
    } catch (e) { console.error(e); }
}


// SUBMIT (POST / PUT)
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

        const token = localStorage.getItem('token');
        const headers = { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };

        try {
            let response;
            if (id) {
                response = await fetch(`http://localhost:3000/api/movies/${id}`, {
                    method: 'PUT',
                    headers: headers,
                    body: JSON.stringify(movieData)
                });
            } else {
                response = await fetch('http://localhost:3000/api/movies', {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(movieData)
                });
            }

            const result = await response.json();

            if (!response.ok) {
                if (result.errors && formErrors) formErrors.textContent = result.errors.join('\n');
                else if (result.error && formErrors) formErrors.textContent = result.error;
                return;
            }

            movieForm.reset();
            movieModal.close();
            getMovies();

        } catch (error) {
            console.error(error);
            alert('Villa');
        }
    });
}


// ==========================================
//      MODAL HELPERS
// ==========================================

function openEditModal(movie: Movie) {
    if(!movieModal || !movieForm || !modalTitle) return;
    modalTitle.textContent = "Breyta Bíómynd";
    if(formErrors) formErrors.textContent = "";
    (movieForm.elements.namedItem('id') as HTMLInputElement).value = movie.id.toString();
    (movieForm.elements.namedItem('title') as HTMLInputElement).value = movie.title;
    (movieForm.elements.namedItem('year') as HTMLInputElement).value = movie.year.toString();
    (movieForm.elements.namedItem('genre') as HTMLInputElement).value = movie.genre;
    (movieForm.elements.namedItem('poster') as HTMLInputElement).value = movie.poster;
    movieModal.showModal();
}

if (addMovieBtn) addMovieBtn.addEventListener('click', () => {
    movieForm.reset(); 
    (movieForm.elements.namedItem('id') as HTMLInputElement).value = "";
    if(formErrors) formErrors.textContent = "";
    modalTitle!.textContent = "Ný Bíómynd";
    movieModal.showModal();
});

if (closeModalBtn) closeModalBtn.addEventListener('click', () => movieModal.close());


// ==========================================
//      INITIALIZATION
// ==========================================

getMovies();

if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        getMovies((e.target as HTMLInputElement).value);
    });
}