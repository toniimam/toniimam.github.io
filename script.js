// Elemen untuk tab dan konten
const wallpanelTab = document.getElementById('wallpanelTab');
const keramikTab = document.getElementById('keramikTab');
const wallpanelContent = document.getElementById('wallpanelContent');
const keramikContent = document.getElementById('keramikContent');

// Elemen input Wallpanel
const widthInput1 = document.getElementById('widthInput1');
const heightInput1 = document.getElementById('heightInput1');
const result1 = document.getElementById('result1');

// Elemen input Keramik
const roomWidth = document.getElementById('roomWidth');
const roomHeight = document.getElementById('roomHeight');
const tileAreaPerBox = document.getElementById('tileAreaPerBox');
const result = document.getElementById('result');

// Variabel tambahan untuk Wallpanel
const wallpanelWidth = 0.16; // Lebar Wallpanel dalam meter
const wallpanelHeight = 2.9;  // Tinggi Wallpanel dalam meter
const wallpanelPrice = 121000;  // Harga per lonjor Wallpanel

// Fungsi toggle tab
function showTab(tab) {
    if (tab === 'wallpanel') {
        wallpanelContent.classList.remove('hidden');
        keramikContent.classList.add('hidden');
        wallpanelTab.classList.add('active');
        keramikTab.classList.remove('active');
    } else {
        keramikContent.classList.remove('hidden');
        wallpanelContent.classList.add('hidden');
        keramikTab.classList.add('active');
        wallpanelTab.classList.remove('active');
    }
}

// Fungsi menghitung kebutuhan Wallpanel
function calculateWallpanel() {
    const width = parseFloat(widthInput1.value);
    const height = parseFloat(heightInput1.value);

    if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
        result1.textContent = "Silakan masukkan dimensi yang valid.";
        return;
    }

    const wallArea = width * height;
    const panelArea = wallpanelWidth * wallpanelHeight;
    const panelCount = Math.ceil(wallArea / panelArea);
    const totalPrice = panelCount * wallpanelPrice;

    result1.innerHTML = `Luas dinding: ${wallArea.toFixed(1)} m² <br> Kebutuhan: ${panelCount} lonjor <br> Total Harga: Rp ${totalPrice.toLocaleString('id-ID')}`;
}

// Fungsi menghitung kebutuhan Keramik
function calculateTiles() {
    const width = parseFloat(roomWidth.value);
    const height = parseFloat(roomHeight.value);
    const areaPerBox = parseFloat(tileAreaPerBox.value);

    if (isNaN(width) || isNaN(height) || isNaN(areaPerBox) || width <= 0 || height <= 0 || areaPerBox <= 0) {
        result.textContent = "Masukkan nilai yang valid.";
        return;
    }

    const roomArea = width * height;
    const totalBoxes = Math.ceil(roomArea / areaPerBox);

    result.innerHTML = `Luas ruangan: ${roomArea.toFixed(1)} m² <br> Total yang dibutuhkan: ${totalBoxes} dus`;
}

// Event listener untuk tab
wallpanelTab.addEventListener('click', () => showTab('wallpanel'));
keramikTab.addEventListener('click', () => showTab('keramik'));

// Event listener untuk input
widthInput1.addEventListener('input', calculateWallpanel);
heightInput1.addEventListener('input', calculateWallpanel);

roomWidth.addEventListener('input', calculateTiles);
roomHeight.addEventListener('input', calculateTiles);
tileAreaPerBox.addEventListener('input', calculateTiles);

// Set tab default
showTab('wallpanel');
// Fungsi untuk menampilkan waktu secara real-time
function updateTime() {
    const options = {
        timeZone: 'Asia/Jakarta',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    };
    const now = new Date();
    const timeString = now.toLocaleTimeString('id-ID', options);
    document.getElementById('currentTime').textContent = "Waktu server: " + timeString;
}

// Update waktu setiap detik
setInterval(updateTime, 1000);