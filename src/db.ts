import pg from 'pg';
import dotenv from 'dotenv';

// Lesa .env skrána
dotenv.config();

// Tékka hvort slóðin sé til
if (!process.env.DATABASE_URL) {
    console.error('VILLA: Vantar DATABASE_URL í .env skrána!');
    process.exit(1);
}

// Búa til tengingu
const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
    console.error('Óvænt villa í gagnagrunnstengingu', err);
    process.exit(-1);
});

export default pool;