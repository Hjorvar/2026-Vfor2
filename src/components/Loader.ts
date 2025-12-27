export function createLoader(): string {
    return `
        <section class="loader-container" role="status" aria-live="polite">
            <div class="spinner"></div>
            <p>Sæki nýjustu kvikmyndirnar...</p>
        </section>
    `;
}