// Interface fyrir bíómynd
interface Movie {
    id: number;
    title: string;
    year: number;
    genre: string;
    poster: string;
    user_id: number;
    created_by: string;
}

// ==========================================
//      DOM ELEMENTS
// ==========================================

const container = document.getElementById('movie-container');
const searchInput = document.getElementById('search-input') as HTMLInputElement;

// Pagination Elements (NÝTT)
const prevPageBtn = document.getElementById('prev-page-btn') as HTMLButtonElement;
const nextPageBtn = document.getElementById('next-page-btn') as HTMLButtonElement;
const pageInfo = document.getElementById('page-info');

// Auth Elements
const authButtons = document.getElementById('auth-buttons');
const userControls = document.getElementById('user-controls');
const userGreeting = document.getElementById('user-greeting');
const logoutBtn = document.getElementById('logout-btn');

// Modals & Forms
const loginBtn = document.getElementById('login-btn');
const loginModal = document.getElementById('login-modal') as HTMLDialogElement;
const loginForm = document.getElementById('login-form') as HTMLFormElement;
const closeLoginBtn = document.getElementById('close-login-btn');
const loginErrors = document.getElementById('login-errors');

const registerBtn = document.getElementById('register-btn');
const registerModal = document.getElementById('register-modal') as HTMLDialogElement;
const registerForm = document.getElementById('register-form') as HTMLFormElement;
const closeRegisterBtn = document.getElementById('close-register-btn');
const registerErrors = document.getElementById('register-errors');

const addMovieBtn = document.getElementById('add-movie-btn');
const movieModal = document.getElementById('add-movie-modal') as HTMLDialogElement;
const movieForm = document.getElementById('add-movie-form') as HTMLFormElement;
const closeModalBtn = document.getElementById('close-modal-btn');
const modalTitle = document.getElementById('modal-title');
const formErrors = document.getElementById('form-errors');

// STATE (NÝTT)
let currentPage = 1;


// ==========================================
//      AUTH STATE
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

if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('name');
        localStorage.removeItem('userId');
        checkAuth();
        window.location.reload();
    });
}

checkAuth();


// ==========================================
//      LOGIN / REGISTER LOGIC
// ==========================================

// Login
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

            localStorage.setItem('token', result.token);
            localStorage.setItem('name', result.name);
            localStorage.setItem('userId', result.id);
            
            loginModal.close();
            checkAuth();
            getMovies(searchInput.value, currentPage); 

        } catch (error) {
            if (loginErrors) loginErrors.textContent = 'Kerfisvilla';
        }
    });
}

// Register
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
            alert('Kerfisvilla');
        }
    });
}


// ==========================================
//      MOVIE CRUD (Með Pagination!)
// ==========================================

async function getMovies(query: string = '', page: number = 1) {
    if (!container) return;
    try {
        // NÝTT: Sendum page og limit í URL
        let url = `http://localhost:3000/api/movies?page=${page}&limit=10`;
        if (query) url += `&search=${query}`;
        
        const res = await fetch(url);
        
        // NÝTT: Serverinn skilar núna { data, meta }
        const response = await res.json();
        const movies: Movie[] = response.data; // Gögnin eru hér
        const meta = response.meta;           // Upplýsingar um síður eru hér
        
        container.innerHTML = '';
        
        const token = localStorage.getItem('token');
        const currentUserId = parseInt(localStorage.getItem('userId') || '0');

        if (movies.length === 0) {
            container.innerHTML = '<p>Engar myndir fundust.</p>';
            updatePaginationUI(meta); // Uppfæra takka samt (fela þá/disable)
            return;
        }

        for (const m of movies) {
            const card = document.createElement('article');
            card.className = 'movie-card';
            
            const isMyMovie = token && (m.user_id === currentUserId);
            const ownerHtml = m.created_by 
                ? `<p class="owner" style="font-size:0.8rem; color:#888;">👤 ${m.created_by}</p>` 
                : '';

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

            if (isMyMovie) {
                const editBtn = card.querySelector('.btn-edit');
                const deleteBtn = card.querySelector('.btn-delete');
                editBtn?.addEventListener('click', () => openEditModal(m));
                deleteBtn?.addEventListener('click', () => deleteMovie(m.id));
            }

            container.appendChild(card);
        }

        // NÝTT: Uppfæra pagination takkana neðst
        updatePaginationUI(meta);

    } catch (e) { console.error(e); }
}


// NÝTT: Helper fall fyrir UI
function updatePaginationUI(meta: any) {
    if (!prevPageBtn || !nextPageBtn || !pageInfo) return;

    if (meta.totalPages === 0) {
        pageInfo.textContent = "Síða 0 af 0";
        prevPageBtn.disabled = true;
        nextPageBtn.disabled = true;
        return;
    }

    pageInfo.textContent = `Síða ${meta.page} af ${meta.totalPages}`;
    prevPageBtn.disabled = !meta.hasPrevPage;
    nextPageBtn.disabled = !meta.hasNextPage;
}


// DELETE
async function deleteMovie(id: number) {
    if (!confirm('Ertu viss?')) return;
    const token = localStorage.getItem('token');

    try {
        const res = await fetch(`http://localhost:3000/api/movies/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            // Endurhlaða núverandi síðu
            getMovies(searchInput.value, currentPage);
        } else {
            const result = await res.json();
            alert(result.error || 'Villa');
        }
    } catch (e) { console.error(e); }
}


// SUBMIT (POST/PUT)
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
            getMovies(searchInput.value, currentPage); // Uppfæra lista

        } catch (error) {
            console.error(error);
            alert('Villa');
        }
    });
}


// ==========================================
//      MODAL & PAGINATION EVENTS
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


// NÝTT: Pagination Takkar
if (prevPageBtn) {
    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            getMovies(searchInput.value, currentPage);
        }
    });
}

if (nextPageBtn) {
    nextPageBtn.addEventListener('click', () => {
        currentPage++;
        getMovies(searchInput.value, currentPage);
    });
}

// Leitarvirkni (Endursetja í síðu 1)
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        currentPage = 1; // RESET
        getMovies((e.target as HTMLInputElement).value, 1);
    });
}

// Initial Load
getMovies('', 1);