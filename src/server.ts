import express from 'express';
import cors from 'cors';

const app = express();
const port = 3000;

app.use(cors());

// 1. GÖGNIN: Við bætum við 'id' svo við getum fundið staka mynd seinna
const movies = [
    { id: 1, title: "Inception", year: 2010, genre: "Sci-Fi", poster: "🎬" },
    { id: 2, title: "The Matrix", year: 1999, genre: "Action", poster: "💊" },
    { id: 3, title: "The Lion King", year: 1994, genre: "Animation", poster: "🦁" },
    { id: 4, title: "Interstellar", year: 2014, genre: "Sci-Fi", poster: "🚀" },
    { id: 5, title: "Pulp Fiction", year: 1994, genre: "Crime", poster: "🔫" }
];

// 2. ROUTE: GET /api/movies (Nú með LEIT!)
// Hlustar eftir: /api/movies?search=lion
app.get('/api/movies', (req, res) => {
    
    // Náum í leitarorðið úr slóðinni (Query Param)
    const search = req.query.search;

    // Ef ekkert leitarorð var sent, skila öllu
    if (!search) {
        return res.json(movies);
    }

    // Ef leitarorð er til, síum listann
    // Við breytum öllu í lágstafi (toLowerCase) svo "Matrix" og "matrix" virki bæði
    const searchTerm = (search as string).toLowerCase();

    const filteredMovies = movies.filter(movie => 
        movie.title.toLowerCase().includes(searchTerm) || 
        movie.genre.toLowerCase().includes(searchTerm)
    );

    console.log(`Leitað að: "${searchTerm}" - Fann ${filteredMovies.length} myndir.`);
    res.json(filteredMovies);
});

// 3. ROUTE: GET /api/movies/:id (Sækja eina mynd)
// Dæmi: /api/movies/1
app.get('/api/movies/:id', (req, res) => {
    const id = parseInt(req.params.id); // Breytum "1" í töluna 1
    
    const movie = movies.find(m => m.id === id);

    if (movie) {
        res.json(movie);
    } else {
        res.status(404).json({ error: "Mynd fannst ekki" });
    }
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});