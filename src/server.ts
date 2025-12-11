import express from 'express';
import cors from 'cors';
import { z } from 'zod'; // Sækjum Zod fyrir staðfestingu gagna
import pool from './db.js';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json()); // Mjög mikilvægt: Leyfir server að lesa JSON

// --- 1. Validation Schema (Reglurnar okkar) ---
// Hér skilgreinum við hvernig lögleg bíómynd lítur út
const movieSchema = z.object({
    title: z.string().min(1, "Titill má ekki vera tómur"),
    year: z.number().int().min(1888, "Engar bíómyndir voru til fyrir 1888!").max(new Date().getFullYear() + 5, "Ártal má ekki vera langt í framtíðinni"),
    genre: z.string().optional(), // Má sleppa
    // Poster má vera emoji, eða tómur strengur, eða sleppt alveg
    poster: z.string().emoji("Poster verður að vera Emoji!").optional().or(z.literal(''))
});


// --- 2. Routes ---

// GET /api/movies (Sækja allt eða leita)
app.get('/api/movies', async (req, res) => {
    const search = req.query.search;
    try {
        let result;
        if (search) {
            // ILIKE = Case insensitive leit
            const sql = 'SELECT * FROM movies WHERE title ILIKE $1 OR genre ILIKE $1';
            const values = [`%${search}%`];
            result = await pool.query(sql, values);
        } else {
            result = await pool.query('SELECT * FROM movies ORDER BY id ASC');
        }
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Gat ekki sótt gögn' });
    }
});

// GET /api/movies/:id (Sækja eina mynd)
app.get('/api/movies/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const result = await pool.query('SELECT * FROM movies WHERE id = $1', [id]);
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).json({ error: 'Mynd fannst ekki' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Villa' });
    }
});

// POST /api/movies (Búa til nýja mynd)
app.post('/api/movies', async (req, res) => {
    try {
        // A. Validation: Tékka hvort gögnin standist kröfur
        const validation = movieSchema.safeParse(req.body);

        // Ef gögnin eru vitlaus -> Senda 400 villu með skilaboðum
        if (!validation.success) {
            const errorMessages = validation.error.issues.map(issue => issue.message);
            return res.status(400).json({ errors: errorMessages });
        }

        // B. Ef allt er í lagi -> Nota hreinsuð gögn (validation.data)
        const { title, year, genre, poster } = validation.data;

        const sql = `
            INSERT INTO movies (title, year, genre, poster) 
            VALUES ($1, $2, $3, $4) 
            RETURNING *
        `;
        const values = [title, year, genre, poster];
        
        const result = await pool.query(sql, values);
        
        // 201 = Created
        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error('Villa við vistun:', error);
        res.status(500).json({ error: 'Gat ekki vistað mynd (Server Error)' });
    }
});

// PUT /api/movies/:id (Uppfæra mynd)
app.put('/api/movies/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        // A. Validation
        const validation = movieSchema.safeParse(req.body);

        if (!validation.success) {
            const errorMessages = validation.error.issues.map(issue => issue.message);
            return res.status(400).json({ errors: errorMessages });
        }

        const { title, year, genre, poster } = validation.data;

        // B. Uppfæra í gagnagrunni
        const sql = `
            UPDATE movies 
            SET title = $1, year = $2, genre = $3, poster = $4
            WHERE id = $5
            RETURNING *
        `;
        const values = [title, year, genre, poster, id];

        const result = await pool.query(sql, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Mynd fannst ekki til að uppfæra' });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Villa við uppfærslu:', error);
        res.status(500).json({ error: 'Gat ekki uppfært mynd' });
    }
});

// DELETE /api/movies/:id (Eyða mynd)
app.delete('/api/movies/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        
        const sql = 'DELETE FROM movies WHERE id = $1 RETURNING *';
        const result = await pool.query(sql, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Mynd fannst ekki' });
        }

        res.json({ message: 'Mynd eytt', deleted: result.rows[0] });

    } catch (error) {
        console.error('Villa við eyðingu:', error);
        res.status(500).json({ error: 'Gat ekki eytt mynd' });
    }
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});