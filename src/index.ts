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

// 2. Auth Elements (Header)
const authButtons = document.getElementById('auth-buttons');
const userControls = document.getElementById('user-controls');
const userGreeting = document.getElementById('user-greeting');
const logoutBtn = document.getElementById('logout-btn');

// 3. Login Modal
const loginBtn = document.getElementById('login-btn');
const loginModal = document.getElementById('login-modal') as HTMLDialogElement;
const loginForm = document.getElementById('login-form') as HTMLFormElement;
const closeLoginBtn = document.getElementById('close-login-btn');
const loginErrors = document.getElementById('login-errors');

// 4. Register Modal
const registerBtn = document.getElementById('register-btn');
const registerModal = document.getElementById('register-modal') as HTMLDialogElement;
const registerForm = document.getElementById('register-form') as HTMLFormElement;
const closeRegisterBtn = document.getElementById('close-register-btn');
const registerErrors = document.getElementById('register-errors');

// 5. Movie Modal
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
        authButtons.style.display = 'none';
        userControls.style.display = 'flex';
        userGreeting.textContent = `Hæ, ${name}!`;
    } else if (userControls && authButtons) {
        authButtons.style.display = 'flex';
        userControls.style.display = 'none';
    }
}

// Útskráning
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('name');
        checkAuth();
        window.location.reload();
    });
}

checkAuth();


// ==========================================
//      LOGIN LOGIC
// ==========================================

if (loginBtn && loginModal) {
    loginBtn.addEventListener('click', () => {
        if (loginForm) loginForm.reset();
        if (loginErrors) loginErrors.textContent = "";
        loginModal.showModal();
    });
}

if (closeLoginBtn && loginModal) {
    closeLoginBtn.addEventListener('click', () => loginModal.close());
}

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (loginErrors) loginErrors.textContent = "";

        const formData = new FormData(loginForm);
        
        // LEIÐRÉTTING 1: Sækjum gögnin handvirkt í stað Object.fromEntries
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

            // SUCCESS!
            localStorage.setItem('token', result.token);
            localStorage.setItem('name', result.name);
            
            loginModal.close();
            checkAuth();
            getMovies(); // Sækja aftur til að fá edit takkana

        } catch (error) {
            console.error(error);
            if (loginErrors) loginErrors.textContent = 'Kerfisvilla';
        }
    });
}


// ==========================================
//      MOVIE CRUD (Með Auth Header!)
// ==========================================

async function getMovies(query: string = '') {
    if (!container) return;
    try {
        let url = 'http://localhost:3000/api/movies';
        if (query) url += `?search=${query}`;
        
        const res = await fetch(url);
        const movies: Movie[] = await res.json();
        
        container.innerHTML = '';
        const token = localStorage.getItem('token'); 

        for (const m of movies) {
            const card = document.createElement('article');
            card.className = 'movie-card';
            
            let actionsHtml = '';
            if (token) {
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
                </div>
                ${actionsHtml}
            `;

            if (token) {
                const editBtn = card.querySelector('.btn-edit');
                const deleteBtn = card.querySelector('.btn-delete');
                editBtn?.addEventListener('click', () => openEditModal(m));
                deleteBtn?.addEventListener('click', () => deleteMovie(m.id));
            }

            container.appendChild(card);
        }
    } catch (e) { console.error(e); }
}


// DELETE (Með Auth)
async function deleteMovie(id: number) {
    if (!confirm('Eyða?')) return;
    const token = localStorage.getItem('token'); 

    try {
        const res = await fetch(`http://localhost:3000/api/movies/${id}`, {
            method: 'DELETE',
            headers: { 
                'Authorization': `Bearer ${token}` 
            }
        });
        
        if (res.ok) getMovies();
        else alert('Gat ekki eytt (Vantar réttindi?)');
    } catch (e) { console.error(e); }
}


// SUBMIT (Með Auth)
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

        try {
            let response;
            const headers = { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            };

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
                
                // LEIÐRÉTTING 2: Bættum við && formErrors til að laga TS villu
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


// Modal Logic
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
//      REGISTER LOGIC (Vika 9)
// ==========================================

// 1. Opna Register Modal
if (registerBtn && registerModal) {
    registerBtn.addEventListener('click', () => {
        if (registerForm) registerForm.reset();
        if (registerErrors) registerErrors.textContent = ""; 
        registerModal.showModal();
    });
}

// 2. Loka Register Modal
if (closeRegisterBtn && registerModal) {
    closeRegisterBtn.addEventListener('click', () => registerModal.close());
}

// 3. Register Submit
if (registerForm) {
    registerForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (registerErrors) registerErrors.textContent = "";

        const formData = new FormData(registerForm);
        // Hér notum við líka handvirka aðferð til öryggis
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

            if (!response.ok) {
                if (result.errors && registerErrors) {
                    registerErrors.textContent = result.errors.join('\n');
                } else {
                    alert('Villa: ' + (result.error || 'Óþekkt villa'));
                }
                return;
            }

            alert(`Velkomin/n ${result.name}! Aðgangur búinn til.`);
            registerForm.reset();
            registerModal.close();

        } catch (error) {
            console.error(error);
            alert('Kerfisvilla');
        }
    });
}

// Leitarvirkni
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        getMovies((e.target as HTMLInputElement).value);
    });
}