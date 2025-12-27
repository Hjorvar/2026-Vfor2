import { Movie } from "../types.js"; // Athugaðu að við þurfum að fara einni möppu ofar (../)

export async function getMovies(): Promise<Movie[]> {
    const response = await fetch('./data/data.json');
    if (!response.ok) throw new Error('Gat ekki sótt myndir');
    return await response.json();
}