import express from 'express';
import cors from 'cors';
import pool from './db.js';

const app = express();
const port = 3000;

app.use(cors());

// MIKILVÆGT: Þessi lína gerir servernum kleift að skilja JSON gögn frá framenda
app.use(express.json());

// 1. Sækja allar myndir (með leit)
app.get('/api/movies', async (req, res) => {
    const search = req.query.search;
    try {
        let result;
        if (search) {
            const sql = 'SELECT * FROM movies WHERE title ILIKE $1 OR genre ILIKE $1';
            const values = [`%${search}%`];
            result = await pool.query(sql, values);
        } else {
            result = await pool.query('SELECT * FROM movies');
        }
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Gat ekki sótt gögn' });
    }
});

// 2. Sækja eina mynd
app.get('/api/movies/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const result = await pool.query('SELECT * FROM movies WHERE id = $1', [id]);
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.status(404).json({ error: 'Fannst ekki' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Villa' });
    }
});

// 3. NÝTT: Bæta við mynd (POST)
app.post('/api/movies', async (req, res) => {
    try {
        // Við fáum gögnin úr req.body
        const { title, year, genre, poster } = req.body;

        // Einföld validation
        if (!title || !year) {
            return res.status(400).json({ error: 'Vantar titil eða ár' });
        }

        const sql = `
            INSERT INTO movies (title, year, genre, poster) 
            VALUES ($1, $2, $3, $4) 
            RETURNING *
        `;
        const values = [title, year, genre, poster];
        
        const result = await pool.query(sql, values);
        
        // Skilum nýju myndinni til baka (status 201 = Created)
        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error('Villa við vistun:', error);
        res.status(500).json({ error: 'Gat ekki vistað mynd' });
    }
});

// 4. NÝTT: Uppfæra mynd (PUT)
app.put('/api/movies/:id', async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { title, year, genre, poster } = req.body;

        const sql = `
            UPDATE movies 
            SET title = $1, year = $2, genre = $3, poster = $4
            WHERE id = $5
            RETURNING *;
        `;
        const values = [title, year, genre, poster, id];

        const result = await pool.query(sql, values);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Mynd fannst ekki' });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Villa við uppfærslu:', error);
        res.status(500).json({ error: 'Gat ekki uppfært mynd' });
    }
});

// 5. NÝTT: Eyða mynd (DELETE)
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