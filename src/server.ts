import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { z } from 'zod';
import pool from './db.js';
import * as argon2 from 'argon2';
import jwt from 'jsonwebtoken';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Sækjum leyndarmálið úr .env
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// ==========================================
//      MIDDLEWARE (Dyravörðurinn)
// ==========================================

const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

    if (!token) {
        return res.status(401).json({ error: 'Vantar auðkenningu (Token)' });
    }

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) {
            return res.status(403).json({ error: 'Ógilt eða útrunnið Token' });
        }
        // Festum notandann við req hlutinn svo við getum notað hann í routes
        (req as any).user = user;
        next();
    });
};


// ==========================================
//      VALIDATION SCHEMAS (Zod)
// ==========================================

const movieSchema = z.object({
    title: z.string().min(1, "Titill má ekki vera tómur"),
    year: z.number().int().min(1888, "Engar bíómyndir fyrir 1888").max(2100),
    genre: z.string().optional(),
    poster: z.string().optional().or(z.literal(''))
});

const userSchema = z.object({
    name: z.string().min(1, "Nafn vantar"),
    username: z.string().min(3, "Notendanafn of stutt"),
    password: z.string().min(6, "Lykilorð of stutt")
});


// ==========================================
//      AUTH ROUTES (Login / Register)
// ==========================================

// 1. Nýskráning
app.post('/api/register', async (req, res) => {
    const validation = userSchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json({ errors: validation.error.issues.map(i => i.message) });
    
    const { name, username, password } = validation.data;

    try {
        const check = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (check.rows.length > 0) return res.status(400).json({ errors: ["Notendanafn upptekið"] });

        const hashedPassword = await argon2.hash(password);
        
        const result = await pool.query(
            'INSERT INTO users (username, password, name) VALUES ($1, $2, $3) RETURNING id, username, name', 
            [username, hashedPassword, name]
        );
        res.status(201).json(result.rows[0]);
    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: 'Villa við nýskráningu' }); 
    }
});

// 2. Innskráning
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];

        if (!user) return res.status(400).json({ error: 'Rangt notendanafn eða lykilorð' });

        const validPassword = await argon2.verify(user.password, password);
        if (!validPassword) return res.status(400).json({ error: 'Rangt notendanafn eða lykilorð' });

        const token = jwt.sign(
            { id: user.id, username: user.username }, 
            JWT_SECRET, 
            { expiresIn: '1h' }
        );

        // MIKILVÆGT: Sendum ID með til baka svo framendinn viti "Hver er ég?"
        res.json({ token, name: user.name, username: user.username, id: user.id });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Villa við innskráningu' });
    }
});


// ==========================================
//      MOVIE ROUTES (CRUD + Ownership)
// ==========================================

// GET /api/movies (Opið öllum - Sækir nafn eiganda með JOIN)
app.get('/api/movies', async (req, res) => {
    const search = req.query.search;
    try {
        // SQL JOIN: Tengjum movies við users til að fá nafnið á þeim sem bjó myndina til
        let queryText = `
            SELECT movies.*, users.name as created_by 
            FROM movies 
            LEFT JOIN users ON movies.user_id = users.id
        `;
        
        let result;
        if (search) {
            queryText += ' WHERE title ILIKE $1 OR genre ILIKE $1';
            result = await pool.query(queryText, [`%${search}%`]);
        } else {
            queryText += ' ORDER BY movies.id ASC';
            result = await pool.query(queryText);
        }
        res.json(result.rows);
    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: 'Villa við að sækja gögn' }); 
    }
});

// GET /api/movies/:id (Opið öllum)
app.get('/api/movies/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    try {
        const result = await pool.query(`
            SELECT movies.*, users.name as created_by 
            FROM movies 
            LEFT JOIN users ON movies.user_id = users.id 
            WHERE movies.id = $1
        `, [id]);
        
        if (result.rows.length > 0) res.json(result.rows[0]);
        else res.status(404).json({ error: 'Fannst ekki' });
    } catch (e) { res.status(500).json({ error: 'Villa' }); }
});


// POST (Búa til - Verndað - Vistar user_id)
app.post('/api/movies', authenticateToken, async (req, res) => {
    const validation = movieSchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json({ errors: validation.error.issues.map(i => i.message) });
    
    const { title, year, genre, poster } = validation.data;
    const userId = (req as any).user.id; // Fáum ID úr tokeninu

    try {
        // 1. Vista myndina
        const insertSql = `
            INSERT INTO movies (title, year, genre, poster, user_id) 
            VALUES ($1, $2, $3, $4, $5) 
            RETURNING *
        `;
        const result = await pool.query(insertSql, [title, year, genre, poster, userId]);
        
        // 2. Sækja myndina aftur með JOIN til að fá nafnið strax (fyrir UI)
        const newId = result.rows[0].id;
        const joinedResult = await pool.query(`
            SELECT movies.*, users.name as created_by 
            FROM movies LEFT JOIN users ON movies.user_id = users.id 
            WHERE movies.id = $1
        `, [newId]);

        res.status(201).json(joinedResult.rows[0]);
    } catch (e) { 
        console.error(e);
        res.status(500).json({ error: 'Villa við vistun' }); 
    }
});


// PUT (Uppfæra - Verndað - Aðeins eigandi)
app.put('/api/movies/:id', authenticateToken, async (req, res) => {
    const id = parseInt(req.params.id);
    const userId = (req as any).user.id; // Sá sem er að reyna að breyta

    const validation = movieSchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json({ errors: validation.error.issues.map(i => i.message) });
    const { title, year, genre, poster } = validation.data;

    try {
        // 1. Tékka á eignarhaldi
        const check = await pool.query('SELECT * FROM movies WHERE id = $1', [id]);
        if (check.rows.length === 0) return res.status(404).json({error: 'Fannst ekki'});
        
        const movie = check.rows[0];
        
        if (movie.user_id !== userId) {
            return res.status(403).json({ error: 'Þú hefur ekki leyfi til að breyta þessari mynd' });
        }

        // 2. Uppfæra
        const sql = `UPDATE movies SET title=$1, year=$2, genre=$3, poster=$4 WHERE id=$5 RETURNING *`;
        const result = await pool.query(sql, [title, year, genre, poster, id]);
        
        // Sækja aftur með join fyrir samræmi
        const joinedResult = await pool.query(`
            SELECT movies.*, users.name as created_by 
            FROM movies LEFT JOIN users ON movies.user_id = users.id 
            WHERE movies.id = $1
        `, [id]);

        res.json(joinedResult.rows[0]);
    } catch (e) { res.status(500).json({ error: 'Villa' }); }
});


// DELETE (Eyða - Verndað - Aðeins eigandi)
app.delete('/api/movies/:id', authenticateToken, async (req, res) => {
    const id = parseInt(req.params.id);
    const userId = (req as any).user.id; // Sá sem er að reyna að eyða

    try {
        // 1. Tékka á eignarhaldi
        const check = await pool.query('SELECT * FROM movies WHERE id = $1', [id]);
        if (check.rows.length === 0) return res.status(404).json({error: 'Fannst ekki'});
        
        const movie = check.rows[0];

        if (movie.user_id !== userId) {
            return res.status(403).json({ error: 'Þú hefur ekki leyfi til að eyða þessari mynd' });
        }

        // 2. Eyða
        const result = await pool.query('DELETE FROM movies WHERE id = $1 RETURNING *', [id]);
        res.json({ message: 'Eytt', deleted: result.rows[0] });

    } catch (e) { res.status(500).json({ error: 'Villa' }); }
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});