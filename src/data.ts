// Við flytjum Interface-ið hingað og setjum 'export' fyrir framan
export interface Movie {
    title: string;
    year: number;
    genre: string;
    poster: string;
}

// Við setjum 'export' fyrir framan breytuna líka
export const movies: Movie[] = [
    { title: "Inception", year: 2010, genre: "Sci-Fi", poster: "🎬" },
    { title: "The Matrix", year: 1999, genre: "Action", poster: "💊" },
    { title: "Finding Nemo", year: 2003, genre: "Animation", poster: "🐠" },
    { title: "Interstellar", year: 2014, genre: "Sci-Fi", poster: "🚀" }
];