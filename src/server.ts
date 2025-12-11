import express from 'express';
import cors from 'cors'; // Leyfir Live Server (port 5500) að tala við Server (port 3000)

const app = express();
const port = 3000;

// 1. Middleware
app.use(cors()); // MIKILVÆGT: Opnar hliðið fyrir framendan

// 2. Gögnin (Við færum þau úr data.ts og hingað)
// Seinna munum við sækja þetta úr Postgres gagnagrunni
const movies = [
    { title: "Inception", year: 2010, genre: "Sci-Fi", poster: "🎬" },
    { title: "The Matrix", year: 1999, genre: "Action", poster: "💊" },
    { title: "The Lion King", year: 1994, genre: "Animation", poster: "🦁" },
    { title: "Interstellar", year: 2014, genre: "Sci-Fi", poster: "🚀" }
];

// 3. Routes (Slóðir)

// GET /api/movies -> Skilar öllum myndum
app.get('/api/movies', (req, res) => {
    console.log('Einhver bað um bíómyndir!'); // Sést í terminal
    res.json(movies);
});

// GET /api/movies/:id -> Skilar einni mynd (Áskorun fyrir nemendur)
// ... (geymum þetta aðeins eða höfum sem bónus)

// 4. Starta þjóninum
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});