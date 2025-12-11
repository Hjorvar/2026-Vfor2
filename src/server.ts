import express from 'express';
import cors from 'cors';
import { z } from 'zod';
import pool from './db.js';
import * as argon2 from 'argon2'; // NÝTT: Notum Argon2 í staðinn fyrir bcrypt

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// --- 1. Zod Schemas ---

// Schema fyrir bíómyndir (eins og í viku 8)
const movieSchema = z.object({
    title: z.string().min(1, "Titill má ekki vera tómur"),
    year: z.number().int().min(1888).max(2100),
    genre: z.string().optional(),
    poster: z.string().optional().or(z.literal(''))
});

// NÝTT: Schema fyrir notendur (Nýskráning)
const userSchema = z.object({
    name: z.string().min(1, "Nafn má ekki vera tómt"),
    username: z.string().min(3, "Notendanafn verður að vera minnst 3 stafir"),
    password: z.string().min(6, "Lykilorð verður að vera minnst 6 stafir")
});


// --- 2. Routes ---

// GET /api/movies (Sækja myndir)
app.get('/api/movies', async (req, res) => {
    const search = req.query.search;
    try {
        let result;
        if (search) {
            result = await pool.query('SELECT * FROM movies WHERE title ILIKE $1 OR genre ILIKE $1', [`%${search}%`]);
        } else {
            result = await pool.query('SELECT * FROM movies ORDER BY id ASC');
        }
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Gat ekki sótt gögn' });
    }
});

// GET /api/movies/:id (Sækja eina)
app.get('/api/movies/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const result = await pool.query('SELECT * FROM movies WHERE id = $1', [id]);
        if (result.rows.length > 0) res.json(result.rows[0]);
        else res.status(404).json({ error: 'Fannst ekki' });
    } catch (e) { res.status(500).json({ error: 'Villa' }); }
});

// POST /api/movies (Búa til mynd - Með Validation)
app.post('/api/movies', async (req, res) => {
    const validation = movieSchema.safeParse(req.body);

    if (!validation.success) {
        const errors = validation.error.issues.map(i => i.message);
        return res.status(400).json({ errors });
    }

    const { title, year, genre, poster } = validation.data;

    try {
        const sql = `INSERT INTO movies (title, year, genre, poster) VALUES ($1, $2, $3, $4) RETURNING *`;
        const result = await pool.query(sql, [title, year, genre, poster]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Gat ekki vistað mynd' });
    }
});

// PUT /api/movies/:id (Uppfæra mynd)
app.put('/api/movies/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    const validation = movieSchema.safeParse(req.body);

    if (!validation.success) {
        const errors = validation.error.issues.map(i => i.message);
        return res.status(400).json({ errors });
    }

    const { title, year, genre, poster } = validation.data;

    try {
        const sql = `UPDATE movies SET title=$1, year=$2, genre=$3, poster=$4 WHERE id=$5 RETURNING *`;
        const result = await pool.query(sql, [title, year, genre, poster, id]);
        
        if (result.rows.length === 0) return res.status(404).json({error: 'Fannst ekki'});
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: 'Villa' }); }
});

// DELETE /api/movies/:id (Eyða mynd)
app.delete('/api/movies/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const result = await pool.query('DELETE FROM movies WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({error: 'Fannst ekki'});
        res.json({ message: 'Eytt', deleted: result.rows[0] });
    } catch (e) { res.status(500).json({ error: 'Villa' }); }
});


// --- NÝTT: NÝSKRÁNING (Register) ---
app.post('/api/register', async (req, res) => {
    // 1. Validation með Zod
    const validation = userSchema.safeParse(req.body);

    if (!validation.success) {
        const errors = validation.error.issues.map(i => i.message);
        return res.status(400).json({ errors });
    }

    const { name, username, password } = validation.data;

    try {
        // 2. Tékka hvort notandanafn sé frátekið
        const userCheck = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ errors: ["Notendanafn er frátekið"] });
        }

        // 3. TÆTA LYKILORÐIÐ (Hashing) með ARGON2
        // Argon2 sér sjálfkrafa um salt og stillingar
        const hashedPassword = await argon2.hash(password);

        // 4. Vista í grunninn
        const sql = `
            INSERT INTO users (username, password, name)
            VALUES ($1, $2, $3)
            RETURNING id, username, name;
        `;
        // Ath: Við vistum hashedPassword, en skimum id/username/name til baka (ekki lykilorðið!)

        const result = await pool.query(sql, [username, hashedPassword, name]);
        
        // 201 Created
        res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error('Villa við nýskráningu:', error);
        res.status(500).json({ error: 'Kerfisvilla' });
    }
});


app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});