import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { z } from 'zod';
import pool from './db.js';
import * as argon2 from 'argon2';
import jwt from 'jsonwebtoken'; // NÝTT

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Sækjum leyndarmálið úr .env
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// --- MIDDLEWARE: Tékka á armbandi (Token) ---
// Þetta fall verður sett á undan route-um sem við viljum vernda
const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    // Header kemur svona: "Bearer <token>"
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Vantar auðkenningu (Token)' });
    }

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) {
            return res.status(403).json({ error: 'Ógilt eða útrunnið Token' });
        }
        // Ef allt er í lagi, höldum við áfram
        next();
    });
};


// --- SCHEMAS (Zod) ---
const movieSchema = z.object({
    title: z.string().min(1),
    year: z.number().int().min(1888).max(2100),
    genre: z.string().optional(),
    poster: z.string().optional().or(z.literal(''))
});

const userSchema = z.object({
    name: z.string().min(1).optional(), // Nafn þarf ekki í login
    username: z.string().min(3),
    password: z.string().min(6)
});


// --- ROUTES ---

// 1. Login (NÝTT)
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body; // Engin þörf á fullu validation schema hér, bara tékka gögn

    try {
        // A. Finna notanda
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];

        if (!user) {
            return res.status(400).json({ error: 'Notendanafn eða lykilorð rangt' });
        }

        // B. Tékka á lykilorði (Argon2)
        const validPassword = await argon2.verify(user.password, password);

        if (!validPassword) {
            return res.status(400).json({ error: 'Notendanafn eða lykilorð rangt' });
        }

        // C. Búa til Token (Armbandið)
        const token = jwt.sign(
            { id: user.id, username: user.username, name: user.name }, 
            JWT_SECRET, 
            { expiresIn: '1h' } // Rennur út eftir 1 klst
        );

        // Sendum token og nafn til baka
        res.json({ token, name: user.name, username: user.username });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Villa við innskráningu' });
    }
});

// 2. Register (Eins og í viku 9)
app.post('/api/register', async (req, res) => {
    const validation = userSchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json({ errors: validation.error.issues.map(i => i.message) });
    const { name, username, password } = validation.data;
    if (!name) return res.status(400).json({ error: "Vantar nafn" }); // TypeScript hack

    try {
        const check = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (check.rows.length > 0) return res.status(400).json({ errors: ["Notendanafn upptekið"] });

        const hashedPassword = await argon2.hash(password);
        const result = await pool.query('INSERT INTO users (username, password, name) VALUES ($1, $2, $3) RETURNING id, username, name', [username, hashedPassword, name]);
        res.status(201).json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: 'Villa' }); }
});


// --- MOVIE ROUTES (Sumar verndaðar!) ---

// GET er opið öllum (Public)
app.get('/api/movies', async (req, res) => {
    const search = req.query.search;
    try {
        let result;
        if (search) result = await pool.query('SELECT * FROM movies WHERE title ILIKE $1 OR genre ILIKE $1', [`%${search}%`]);
        else result = await pool.query('SELECT * FROM movies ORDER BY id ASC');
        res.json(result.rows);
    } catch (e) { res.status(500).json({ error: 'Villa' }); }
});

app.get('/api/movies/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const result = await pool.query('SELECT * FROM movies WHERE id = $1', [id]);
        if (result.rows.length > 0) res.json(result.rows[0]);
        else res.status(404).json({ error: 'Fannst ekki' });
    } catch (e) { res.status(500).json({ error: 'Villa' }); }
});

// POST - VERNDAÐ (Bara innskráðir) -> authenticateToken
app.post('/api/movies', authenticateToken, async (req, res) => {
    const validation = movieSchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json({ errors: validation.error.issues.map(i => i.message) });
    const { title, year, genre, poster } = validation.data;

    try {
        const result = await pool.query('INSERT INTO movies (title, year, genre, poster) VALUES ($1, $2, $3, $4) RETURNING *', [title, year, genre, poster]);
        res.status(201).json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: 'Villa' }); }
});

// PUT - VERNDAÐ
app.put('/api/movies/:id', authenticateToken, async (req, res) => {
    const id = parseInt(req.params.id);
    const validation = movieSchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json({ errors: validation.error.issues.map(i => i.message) });
    const { title, year, genre, poster } = validation.data;

    try {
        const result = await pool.query('UPDATE movies SET title=$1, year=$2, genre=$3, poster=$4 WHERE id=$5 RETURNING *', [title, year, genre, poster, id]);
        if (result.rows.length === 0) return res.status(404).json({error: 'Fannst ekki'});
        res.json(result.rows[0]);
    } catch (e) { res.status(500).json({ error: 'Villa' }); }
});

// DELETE - VERNDAÐ
app.delete('/api/movies/:id', authenticateToken, async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const result = await pool.query('DELETE FROM movies WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({error: 'Fannst ekki'});
        res.json({ message: 'Eytt', deleted: result.rows[0] });
    } catch (e) { res.status(500).json({ error: 'Villa' }); }
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});