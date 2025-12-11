DROP TABLE IF EXISTS users; -- Henda gömlu töflunni ef hún er til
DROP TABLE IF EXISTS movies;




-- NÝTT: Tafla fyrir notendur
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(64) UNIQUE NOT NULL, -- UNIQUE = Engir tveir með sama nafn
  password VARCHAR(255) NOT NULL,       -- Hér geymum við tætta (hashed) lykilorðið
  name VARCHAR(128)
);

-- Búum til nýja með user_id (Foreign Key)
CREATE TABLE movies (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  year INTEGER NOT NULL,
  genre VARCHAR(100),
  poster TEXT,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE -- Ef notanda er eytt, eyðast myndirnar hans líka
);

-- Setjum inn dummy gögn
INSERT INTO movies (title, year, genre, poster) VALUES 
('Inception', 2010, 'Sci-Fi', 'mynd'),
('The Matrix', 1999, 'Action', 'mynd');