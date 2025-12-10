// src/index.ts

// 1. Náum í element úr DOM (eins og í gamla daga, nema með Type Safety)
// "as HTMLElement" segir TS að við vitum að þetta sé til.
const header = document.querySelector('h1') as HTMLElement;

console.log('Kvikmyndasafnið er ræst 🚀');

// 2. Bætum við smá virkni: Breyta lit þegar smellt er á titilinn
if (header) {
    header.style.cursor = 'pointer';
    
    header.addEventListener('click', () => {
        // Búum til random lit
        const randomColor = Math.floor(Math.random()*16777215).toString(16);
        header.style.color = "#" + randomColor;
        console.log("Smellt á header! Nýr litur: #" + randomColor);
    });
}

// 3. (Valfrjálst) Setja dagsetningu í footer með JS
// Þetta sýnir nemendum hvernig við sprautum efni inn í HTML
const footer = document.createElement('footer');
footer.style.textAlign = 'center';
footer.style.padding = '2rem';
footer.style.color = '#666';
footer.innerText = `Síðast uppfært: ${new Date().toLocaleDateString()}`;
document.body.appendChild(footer);