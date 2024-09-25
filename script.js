const toggleButton = document.getElementById('toggleButton');
const content = document.getElementById('content');
const result = document.getElementById('result');
const currentTimeElement = document.getElementById('currentTime');
const widthInput = document.getElementById('widthInput');
const heightInput = document.getElementById('heightInput');
const priceResult = document.createElement('div'); // Buat elemen untuk menampilkan harga total

// Ukuran dan harga wallpanel (dalam meter dan rupiah)
const wallpanelWidth = 0.16;
const wallpanelHeight = 2.9;
const wallpanelPrice = 121000; // Harga per wallpanel

function updateTime() {
    const options = {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    };
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', options);
    currentTimeElement.textContent = "Waktu server: " + timeString;
}

toggleButton.addEventListener('click', () => {
    if (content.classList.contains('visible')) {
        content.classList.remove('visible');
        toggleButton.textContent = "Open";
        toggleButton.style.backgroundColor = "#45a060";

        setTimeout(() => {
            content.classList.add('hidden');
        }, 500);
    } else {
        content.classList.remove('hidden');
        setTimeout(() => {
            content.classList.add('visible');
        }, 10);

        toggleButton.textContent = "Close";
        toggleButton.style.backgroundColor = "#808080";
        updateTime();
    }
});

function calculateWallpanel() {
    const width = parseFloat(widthInput.value);
    const height = parseFloat(heightInput.value);

    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
        result.textContent = "Silakan masukkan dimensi dinding yang valid.";
        result.style.color = "#45a060";
        return;
    }

    const wallArea = width * height;
    const panelArea = wallpanelWidth * wallpanelHeight;
    const panelCount = Math.ceil(wallArea / panelArea);

    result.innerHTML = `<h4>Luas dinding: ${wallArea.toFixed(2)} m²<br>Kebutuhan: ${panelCount} Lonjor</h4>`;
    result.style.color = "white";

    // Hitung total harga
    const totalPrice = panelCount * wallpanelPrice;
    priceResult.innerHTML = `<h4>Total Harga: Rp ${totalPrice.toLocaleString('id-ID')}</h4>`;
    priceResult.style.color = "white";
    result.appendChild(priceResult); // Tampilkan harga total
}

widthInput.addEventListener('input', calculateWallpanel);
heightInput.addEventListener('input', calculateWallpanel);

setInterval(updateTime, 1000);

document.addEventListener('DOMContentLoaded', () => {
    const heightInput = document.getElementById('heightInput');
    heightInput.value = 2.9;
});
