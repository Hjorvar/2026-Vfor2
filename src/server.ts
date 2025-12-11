import express from 'express';
import cors from 'cors';
import pool from './db.js'; // MIKILVÆGT: Sækjum tenginguna sem við bjuggum til í db.ts

const app = express();
const port = 3000;

app.use(cors());

// --- ROUTE: Sækja allar myndir (með eða án leitar) ---
app.get('/api/movies', async (req, res) => {
    const search = req.query.search;

    try {
        let result;

        if (search) {
            // EF LEIT: Við notum SQL til að leita í gagnagrunninum
            // 'ILIKE' þýðir Case Insensitive leit (a == A) í Postgres.
            // $1 er "placeholder" sem ver gegn SQL Injection.
            const sql = 'SELECT * FROM movies WHERE title ILIKE $1 OR genre ILIKE $1';
            const values = [`%${search}%`]; // % er wildcard (leitar að orði inn í texta)
            
            result = await pool.query(sql, values);
        } else {
            // EF ENGIN LEIT: Sækjum allt
            const sql = 'SELECT * FROM movies';
            result = await pool.query(sql);
        }

        // Sendum raðirnar (rows) til baka sem JSON
        res.json(result.rows);

    } catch (error) {
        console.error('Villa við að sækja gögn:', error);
        // Skilum 500 villu (Internal Server Error) svo framendinn viti að eitthvað brotnaði
        res.status(500).json({ error: 'Gat ekki sótt gögn úr gagnagrunni' });
    }
});

// --- ROUTE: Sækja eina mynd eftir ID ---
app.get('/api/movies/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        
        // Sækjum myndina með þessu ID
        const sql = 'SELECT * FROM movies WHERE id = $1';
        const result = await pool.query(sql, [id]);

        if (result.rows.length > 0) {
            // Fannst! Skilum fyrstu (og einu) röðinni
            res.json(result.rows[0]);
        } else {
            // Fannst ekki
            res.status(404).json({ error: 'Mynd fannst ekki' });
        }

    } catch (error) {
        console.error('Villa:', error);
        res.status(500).json({ error: 'Villa í vefþjóni' });
    }
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});