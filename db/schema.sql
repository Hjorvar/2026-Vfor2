-- Eyða töflu ef hún er til (svo hægt sé að byrja upp á nýtt)
DROP TABLE IF EXISTS movies;

CREATE TABLE movies (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  year INTEGER NOT NULL,
  genre VARCHAR(100),
  poster TEXT
);

INSERT INTO movies (title, year, genre, poster) VALUES 
('Inception', 2010, 'Sci-Fi', 'mynd'),
('The Matrix', 1999, 'Action', 'mynd'),
('The Lion King', 1994, 'Animation', 'mynd');

SELECT * FROM movies;

DELETE FROM movies;