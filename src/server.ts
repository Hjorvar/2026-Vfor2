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

    if (!token) return res.status(401).json({ error: 'Vantar auðkenningu (Token)' });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) return res.status(403).json({ error: 'Ógilt eða útrunnið Token' });
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
//      AUTH ROUTES (Register / Login)
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

        res.json({ token, name: user.name, username: user.username, id: user.id });
    } catch (error) {
        res.status(500).json({ error: 'Villa við innskráningu' });
    }
});


// ==========================================
//      MOVIE ROUTES (CRUD + Pagination)
// ==========================================

// GET /api/movies (Með Pagination!)
app.get('/api/movies', async (req, res) => {
    const search = req.query.search as string;

    // 1. Lesum Page og Limit úr URL (Default: Síða 1, 10 myndir per síðu)
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    // 2. Reiknum OFFSET (Hversu mörgum myndum á að hoppa yfir?)
    // Dæmi: Síða 1: offset 0. Síða 2: offset 10.
    const offset = (page - 1) * limit;

    try {
        // Við þurfum tvær fyrirspurnir: 
        // A) Telja heildarfjölda mynda (fyrir pagination takkana)
        // B) Sækja gögnin fyrir þessa tilteknu síðu

        let countQuery = `SELECT COUNT(*) FROM movies`;
        let dataQuery = `
            SELECT movies.*, users.name as created_by 
            FROM movies 
            LEFT JOIN users ON movies.user_id = users.id
        `;
        
        // Breytur til að geyma parametra ($1, $2...)
        const queryParams: any[] = [];
        const countParams: any[] = [];

        // Ef leit er í gangi, bætum við WHERE skilyrðum
        if (search) {
            const whereClause = ` WHERE title ILIKE $1 OR genre ILIKE $1`;
            countQuery += whereClause;
            dataQuery += whereClause;
            
            queryParams.push(`%${search}%`);
            countParams.push(`%${search}%`);
        }

        // Bætum við röðun (Nýjustu fyrst) og Pagination (LIMIT/OFFSET)
        // Við þurfum að passa upp á númerin á $ breytunum
        // Ef search er til staðar er það $1, þá verður limit $2 og offset $3
        // Ef search er EKKI til staðar, þá verður limit $1 og offset $2
        const paramIndexStart = queryParams.length + 1;
        
        dataQuery += ` ORDER BY movies.id DESC LIMIT $${paramIndexStart} OFFSET $${paramIndexStart + 1}`;
        
        queryParams.push(limit, offset);

        // Keyrum báðar fyrirspurnirnar
        const countResult = await pool.query(countQuery, countParams);
        const dataResult = await pool.query(dataQuery, queryParams);

        // Reiknum út pagination upplýsingar
        const totalItems = parseInt(countResult.rows[0].count);
        const totalPages = Math.ceil(totalItems / limit);

        // Skilum nýju formi á gögnunum (Umslag)
        res.json({
            data: dataResult.rows, // Myndirnar á þessari síðu
            meta: {
                total: totalItems,
                page: page,
                totalPages: totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });

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


// POST (Verndað)
app.post('/api/movies', authenticateToken, async (req, res) => {
    const validation = movieSchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json({ errors: validation.error.issues.map(i => i.message) });
    
    const { title, year, genre, poster } = validation.data;
    const userId = (req as any).user.id; 

    try {
        const insertSql = `
            INSERT INTO movies (title, year, genre, poster, user_id) 
            VALUES ($1, $2, $3, $4, $5) 
            RETURNING *
        `;
        const result = await pool.query(insertSql, [title, year, genre, poster, userId]);
        
        // Sækja aftur með JOIN
        const newId = result.rows[0].id;
        const joinedResult = await pool.query(`
            SELECT movies.*, users.name as created_by 
            FROM movies LEFT JOIN users ON movies.user_id = users.id 
            WHERE movies.id = $1
        `, [newId]);

        res.status(201).json(joinedResult.rows[0]);
    } catch (e) { res.status(500).json({ error: 'Villa við vistun' }); }
});


// PUT (Verndað - Eignarhald)
app.put('/api/movies/:id', authenticateToken, async (req, res) => {
    const id = parseInt(req.params.id);
    const userId = (req as any).user.id;

    const validation = movieSchema.safeParse(req.body);
    if (!validation.success) return res.status(400).json({ errors: validation.error.issues.map(i => i.message) });
    const { title, year, genre, poster } = validation.data;

    try {
        const check = await pool.query('SELECT * FROM movies WHERE id = $1', [id]);
        if (check.rows.length === 0) return res.status(404).json({error: 'Fannst ekki'});
        
        if (check.rows[0].user_id !== userId) {
            return res.status(403).json({ error: 'Þú mátt ekki breyta þessari mynd' });
        }

        const sql = `UPDATE movies SET title=$1, year=$2, genre=$3, poster=$4 WHERE id=$5 RETURNING *`;
        const result = await pool.query(sql, [title, year, genre, poster, id]);
        
        // Sækja aftur með JOIN
        const joinedResult = await pool.query(`
            SELECT movies.*, users.name as created_by 
            FROM movies LEFT JOIN users ON movies.user_id = users.id 
            WHERE movies.id = $1
        `, [id]);

        res.json(joinedResult.rows[0]);
    } catch (e) { res.status(500).json({ error: 'Villa' }); }
});


// DELETE (Verndað - Eignarhald)
app.delete('/api/movies/:id', authenticateToken, async (req, res) => {
    const id = parseInt(req.params.id);
    const userId = (req as any).user.id;

    try {
        const check = await pool.query('SELECT * FROM movies WHERE id = $1', [id]);
        if (check.rows.length === 0) return res.status(404).json({error: 'Fannst ekki'});
        
        if (check.rows[0].user_id !== userId) {
            return res.status(403).json({ error: 'Þú hefur ekki leyfi til að eyða þessari mynd' });
        }

        const result = await pool.query('DELETE FROM movies WHERE id = $1 RETURNING *', [id]);
        res.json({ message: 'Eytt', deleted: result.rows[0] });

    } catch (e) { res.status(500).json({ error: 'Villa' }); }
});

app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
});