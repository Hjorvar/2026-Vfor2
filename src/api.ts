import { Movie } from "./types.js";

/**
 * Sækir kvikmyndagögn úr JSON skrá.
 * Hermir eftir netseinkunn (latency) með því að bíða í 1 sekúndu.
 */
export async function getMovies(): Promise<Movie[]> {
    // Hermum eftir töf á netinu [cite: 74]
    await new Promise(resolve => setTimeout(resolve, 1000));

    const response = await fetch('./data.json');
    
    if (!response.ok) {
        throw new Error('Ekki náðist samband við gagnagrunn');
    }

    return await response.json();
}