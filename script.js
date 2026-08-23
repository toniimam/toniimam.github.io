/* =====================================================
   KONFIGURASI SUPABASE
===================================================== */

const SUPABASE_URL =
    "https://lebwxqkbpjqqszzvmnas.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_-ZI4t9ZuLF9LuIee8W_7Fg_EUrgXFat";


const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


/* =====================================================
   DATA
===================================================== */

let dataBarang = [];

let transactions = [];

let tanggalDipilih = "";

let selectedProduct = null;

let selectedTransactionType = "";


/* =====================================================
   SORTING
===================================================== */

/*
   Default:
   Nama barang A-Z

   Setelah kolom stok diklik:
   Stok terbesar -> terkecil
   Klik lagi:
   Stok terkecil -> terbesar
*/

let sortMode = "nama";

let stockSortAsc = false;


/* =====================================================
   FORMAT ANGKA
===================================================== */

function formatNumber(number) {

    const value = Number(number);

    if (!Number.isFinite(value)) {
        return "-";
    }

    return new Intl.NumberFormat(
        "id-ID"
    ).format(value);

}


/* =====================================================
   STATUS DATABASE
===================================================== */

function setDatabaseStatus(
    message,
    type = ""
) {

    const element =
        document.getElementById(
            "databaseStatus"
        );

    if (!element) {
        return;
    }

    element.textContent =
        message;

    element.className =
        "status " + type;

}


/* =====================================================
   LOAD BARANG
===================================================== */

async function loadBarang() {

    setDatabaseStatus(
        "⏳ Mengambil data barang..."
    );


    const {
        data,
        error
    } =
        await supabaseClient
            .from("barang")
            .select("*")
            .order(
                "nama",
                {
                    ascending: true
                }
            );


    if (error) {

        console.error(error);

        setDatabaseStatus(
            "❌ Gagal mengambil data barang: " +
            error.message,
            "error"
        );

        return;

    }


    dataBarang =
        data || [];


    setDatabaseStatus(
        "✅ Database terhubung. " +
        dataBarang.length +
        " barang ditemukan, ↓Scroll kebawah↓",
        "success"
    );


    updateTable();

}


/* =====================================================
   LOAD TRANSAKSI
===================================================== */

async function loadTransactions() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("transaksi")
            .select("*")
            .order(
                "created_at",
                {
                    ascending: true
                }
            );


    if (error) {

        console.error(error);

        setDatabaseStatus(
            "❌ Gagal mengambil transaksi: " +
            error.message,
            "error"
        );

        return;

    }


    transactions =
        data || [];


    updateTable();

}


/* =====================================================
   TAMBAH BARANG
===================================================== */

async function tambahBarang() {

    const namaInput =
        document.getElementById(
            "namaBarang"
        );

    const stokInput =
        document.getElementById(
            "stokAwal"
        );


    const nama =
        namaInput.value.trim();


    const stokAwal =
        Number(
            stokInput.value
        );


    if (!nama) {

        alert(
            "Nama barang harus diisi."
        );

        namaInput.focus();

        return;

    }


    if (
        !Number.isFinite(stokAwal) ||
        stokAwal < 0
    ) {

        alert(
            "Stok awal tidak valid."
        );

        return;

    }


    const barangSudahAda =
        dataBarang.some(
            function(barang) {

                return (
                    String(barang.nama)
                        .toLowerCase()
                        .trim() ===
                    nama.toLowerCase()
                        .trim()
                );

            }
        );


    if (barangSudahAda) {

        alert(
            "Barang dengan nama tersebut sudah ada."
        );

        return;

    }


    setDatabaseStatus(
        "⏳ Menyimpan barang..."
    );


    const {
        error
    } =
        await supabaseClient
            .from("barang")
            .insert({

                nama: nama,

                stok_awal: stokAwal

            });


    if (error) {

        console.error(error);

        setDatabaseStatus(
            "❌ Gagal menyimpan barang: " +
            error.message,
            "error"
        );

        return;

    }


    namaInput.value = "";

    stokInput.value = "0";


    setDatabaseStatus(
        "✅ Barang berhasil ditambahkan.",
        "success"
    );


    await loadBarang();

}


/* =====================================================
   HITUNG STOK
===================================================== */

function getCurrentStock(barang) {

    let stok =
        Number(
            barang.stok_awal
        ) || 0;


    transactions.forEach(
        function(transaction) {

            if (
                Number(
                    transaction.barang_id
                ) !==
                Number(
                    barang.id
                )
            ) {

                return;

            }


            /* =========================================
               HANYA HITUNG TRANSAKSI SAMPAI TANGGAL
               YANG DIPILIH
            ========================================= */

            if (
                tanggalDipilih &&
                transaction.tanggal &&
                transaction.tanggal >
                tanggalDipilih
            ) {

                return;

            }


            if (
                transaction.type ===
                "masuk"
            ) {

                stok +=
                    Number(
                        transaction.qty
                    ) || 0;

            }


            if (
                transaction.type ===
                "laku"
            ) {

                stok -=
                    Number(
                        transaction.qty
                    ) || 0;

            }

        }
    );


    return stok;

}


/* =====================================================
   UPDATE TABEL
===================================================== */

function updateTable() {

    const tbody =
        document.getElementById(
            "stockTable"
        );


    const searchElement =
        document.getElementById(
            "search"
        );


    if (!tbody || !searchElement) {
        return;
    }


    const search =
        searchElement.value
            .toLowerCase()
            .trim();


    /* =================================================
       BELUM ADA BARANG
    ================================================= */

    if (
        dataBarang.length === 0
    ) {

        tbody.innerHTML =
            `
            <tr>

                <td
                    colspan="4"
                    class="empty"
                >
                    Belum ada barang.<br>
                    Silakan tambahkan barang.
                </td>

            </tr>
            `;

        updateStats();

        return;

    }


    /* =================================================
       FILTER PENCARIAN
    ================================================= */

    const filtered =
        dataBarang.filter(
            function(barang) {

                return String(
                    barang.nama
                )
                    .toLowerCase()
                    .includes(search);

            }
        );


    /* =================================================
       SORTING
    ================================================= */

    if (
        sortMode === "nama"
    ) {

        /* ---------------------------------------------
           DEFAULT: NAMA A-Z
        --------------------------------------------- */

        filtered.sort(
            function(a, b) {

                return String(
                    a.nama
                ).localeCompare(
                    String(b.nama),
                    "id",
                    {
                        sensitivity: "base"
                    }
                );

            }
        );

    } else {

        /* ---------------------------------------------
           SORTING BERDASARKAN STOK
        --------------------------------------------- */

        filtered.sort(
            function(a, b) {

                const stokA =
                    getCurrentStock(a);

                const stokB =
                    getCurrentStock(b);


                if (
                    stockSortAsc
                ) {

                    return (
                        stokA -
                        stokB
                    );

                }


                return (
                    stokB -
                    stokA
                );

            }
        );

    }


    /* =================================================
       HASIL PENCARIAN KOSONG
    ================================================= */

    if (
        filtered.length === 0
    ) {

        tbody.innerHTML =
            `
            <tr>

                <td
                    colspan="4"
                    class="empty"
                >
                    Barang tidak ditemukan.
                </td>

            </tr>
            `;

        updateStats();

        return;

    }


    /* =================================================
       BERSIHKAN TABEL
    ================================================= */

    tbody.innerHTML = "";


    /* =================================================
       TAMPILKAN DATA
    ================================================= */

    filtered.forEach(
        function(barang, index) {

            const stok =
                getCurrentStock(
                    barang
                );


            let statusClass =
                "stock-aman";


            if (
                stok <= 0
            ) {

                statusClass =
                    "stock-habis";

            } else if (
                stok <= 5
            ) {

                statusClass =
                    "stock-menipis";

            }


            const tr =
                document.createElement(
                    "tr"
                );


            tr.innerHTML =
                `
                <td>
                    ${index + 1}
                </td>

                <td>
                    ${escapeHTML(
                        barang.nama
                    )}
                </td>

                <td
                    class="${statusClass}"
                >
                    ${formatNumber(
                        stok
                    )}
                </td>

                <td>

                    <button
                        type="button"
                        class="action-btn btn-masuk"
                        onclick="openTransaction(
                            ${Number(barang.id)},
                            'masuk'
                        )"
                    >
                        ➕ Masuk
                    </button>


                    <button
                        type="button"
                        class="action-btn btn-laku"
                        onclick="openTransaction(
                            ${Number(barang.id)},
                            'laku'
                        )"
                    >
                        🛒 Laku
                    </button>

                </td>
                `;


            tbody.appendChild(
                tr
            );

        }
    );


    updateStats();

}


/* =====================================================
   SORTIR STOK
===================================================== */

function sortStock() {

    /*
       Saat pertama kali klik:
       stok terbesar -> terkecil

       Klik berikutnya:
       terkecil -> terbesar
    */

    sortMode =
        "stok";


    stockSortAsc =
        !stockSortAsc;


    const header =
        document.getElementById(
            "stokHeader"
        );


    if (header) {

        header.textContent =
            stockSortAsc
                ? "Stok ↑"
                : "Stok ↓";

    }


    updateTable();

}
function sortNama() {
    sortMode = "nama";
    updateTable();
}

/* =====================================================
   STATISTIK
===================================================== */

function updateStats() {

    let totalStok = 0;


    dataBarang.forEach(
        function(barang) {

            totalStok +=
                getCurrentStock(
                    barang
                );

        }
    );


    /* ================================================
       TRANSAKSI HARI INI
    ================================================ */

    const sekarang =
        new Date();


    const transaksiHariIni =
        transactions.filter(
            function(transaction) {

                if (
                    !transaction.created_at
                ) {

                    return false;

                }


                const waktu =
                    new Date(
                        transaction.created_at
                    );


                return (
                    waktu.getFullYear() ===
                    sekarang.getFullYear()

                    &&

                    waktu.getMonth() ===
                    sekarang.getMonth()

                    &&

                    waktu.getDate() ===
                    sekarang.getDate()
                );

            }
        ).length;


    /* ================================================
       ELEMENT
    ================================================ */

    const totalBarangElement =
        document.getElementById(
            "totalBarang"
        );


    const totalStokElement =
        document.getElementById(
            "totalStok"
        );


    const transaksiElement =
        document.getElementById(
            "transaksiHariIni"
        );


    /* ================================================
       TAMPILKAN
    ================================================ */

    if (
        totalBarangElement
    ) {

        totalBarangElement.textContent =
            formatNumber(
                dataBarang.length
            );

    }


    if (
        totalStokElement
    ) {

        totalStokElement.textContent =
            formatNumber(
                totalStok
            );

    }


    if (
        transaksiElement
    ) {

        transaksiElement.textContent =
            formatNumber(
                transaksiHariIni
            );

    }


    renderHistory();

}


/* =====================================================
   BUKA MODAL
===================================================== */

function openTransaction(
    barangId,
    type
) {

    const barang =
        dataBarang.find(
            function(item) {

                return (
                    Number(item.id) ===
                    Number(barangId)
                );

            }
        );


    if (!barang) {

        alert(
            "Barang tidak ditemukan."
        );

        return;

    }


    selectedProduct =
        barang.id;


    selectedTransactionType =
        type;


    const modal =
        document.getElementById(
            "transactionModal"
        );


    const title =
        document.getElementById(
            "modalTitle"
        );


    const product =
        document.getElementById(
            "modalProduct"
        );


    title.textContent =
        type === "masuk"
            ? "➕ Barang Masuk"
            : "🛒 Barang Laku";


    product.textContent =
        barang.nama;


    document.getElementById(
        "transactionQty"
    ).value = 1;


    modal.style.display =
        "flex";

}


/* =====================================================
   TUTUP MODAL
===================================================== */

function closeModal() {

    const modal =
        document.getElementById(
            "transactionModal"
        );


    modal.style.display =
        "none";

}


/* =====================================================
   SIMPAN TRANSAKSI
===================================================== */

async function confirmTransaction() {

    const input =
        document.getElementById(
            "transactionQty"
        );


    const qty =
        Number(
            input.value
        );


    if (
        !Number.isFinite(qty) ||
        qty <= 0
    ) {

        alert(
            "Jumlah harus lebih dari 0."
        );

        return;

    }


    const barang =
        dataBarang.find(
            function(item) {

                return (
                    Number(item.id) ===
                    Number(selectedProduct)
                );

            }
        );


    if (!barang) {

        alert(
            "Barang tidak ditemukan."
        );

        return;

    }


    /* =================================================
       CEK STOK BARANG LAKU
    ================================================= */

    if (
        selectedTransactionType ===
        "laku"
    ) {

        const stok =
            getCurrentStock(
                barang
            );


        if (
            qty > stok
        ) {

            alert(
                "Jumlah barang laku melebihi stok.\n\n" +
                "Stok tersedia: " +
                formatNumber(stok)
            );

            return;

        }

    }


    /* =================================================
       SIMPAN KE SUPABASE
    ================================================= */

    const {
        error
    } =
        await supabaseClient
            .from("transaksi")
            .insert({

                barang_id:
                    barang.id,

                tanggal:
                    tanggalDipilih ||
                    getTodayDate(),

                type:
                    selectedTransactionType,

                qty:
                    qty

            });


    if (error) {

        console.error(
            error
        );


        alert(
            "Gagal menyimpan transaksi:\n" +
            error.message
        );


        return;

    }


    closeModal();


    await loadTransactions();

}


/* =====================================================
   RIWAYAT TRANSAKSI
===================================================== */

function renderHistory() {

    const tbody =
        document.getElementById(
            "historyTable"
        );


    if (!tbody) {
        return;
    }


    if (
        transactions.length === 0
    ) {

        tbody.innerHTML =
            `
            <tr>

                <td
                    colspan="5"
                    class="empty"
                >
                    Belum ada transaksi
                </td>

            </tr>
            `;

        return;

    }


 const history = [...transactions].sort((a, b) => {
    const tanggalA = new Date(
        a.tanggal + "T00:00:00"
    );

    const tanggalB = new Date(
        b.tanggal + "T00:00:00"
    );

    if (tanggalB - tanggalA !== 0) {
        return tanggalB - tanggalA;
    }

    return new Date(b.created_at) -
           new Date(a.created_at);
});


    tbody.innerHTML =
        "";


    history.forEach(
        function(transaction) {

            const barang =
                dataBarang.find(
                    function(item) {

                        return (
                            Number(
                                item.id
                            ) ===
                            Number(
                                transaction.barang_id
                            )
                        );

                    }
                );


            const namaBarang =
                barang
                    ? barang.nama
                    : "Barang dihapus";


            const typeText =
                transaction.type ===
                "masuk"

                    ? "➕ Barang Masuk"

                    : "🛒 Barang Laku";


            const qtyText =
                transaction.type ===
                "masuk"

                    ? "+" +
                      formatNumber(
                          transaction.qty
                      )

                    : "-" +
                      formatNumber(
                          transaction.qty
                      );


            let stokAkhir =
                "-";


            if (barang) {

                stokAkhir =
                    getStockAfterTransaction(
                        barang,
                        transaction
                    );

            }


            const waktu =
                transaction.tanggal

                    ? new Date(
                        transaction.tanggal +
                        "T00:00:00"
                    ).toLocaleDateString(
                        "id-ID"
                    )

                    : "-";


            const tr =
                document.createElement(
                    "tr"
                );


            tr.innerHTML =
                `
                <td>
                    ${escapeHTML(
                        waktu
                    )}
                </td>

                <td>
                    ${escapeHTML(
                        namaBarang
                    )}
                </td>
                <td class="${transaction.type === "masuk" ? "history-masuk" : "history-laku"}">
    ${typeText}
</td>


                <td>
                    ${qtyText}
                </td>

                <td>
                    ${formatNumber(
                        stokAkhir
                    )}
                </td>
                `;


            tbody.appendChild(
                tr
            );

        }
    );

}


/* =====================================================
   STOK SETELAH TRANSAKSI
===================================================== */

function getStockAfterTransaction(
    barang,
    targetTransaction
) {

    let stok =
        Number(
            barang.stok_awal
        ) || 0;


    transactions.forEach(
        function(transaction) {

            if (
                Number(
                    transaction.barang_id
                ) !==
                Number(
                    barang.id
                )
            ) {

                return;

            }


            if (
                new Date(
                    transaction.created_at
                ) >
                new Date(
                    targetTransaction.created_at
                )
            ) {

                return;

            }


            if (
                transaction.type ===
                "masuk"
            ) {

                stok +=
                    Number(
                        transaction.qty
                    ) || 0;

            }


            if (
                transaction.type ===
                "laku"
            ) {

                stok -=
                    Number(
                        transaction.qty
                    ) || 0;

            }

        }
    );


    return stok;

}


/* =====================================================
   ESCAPE HTML
===================================================== */

function escapeHTML(text) {

    return String(text)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


/* =====================================================
   SEARCH
===================================================== */

document
    .getElementById(
        "search"
    )
    .addEventListener(
        "input",
        updateTable
    );


/* =====================================================
   TOGGLE DAFTAR STOK
===================================================== */

function toggleStockList() {

    const content =
        document.getElementById(
            "stockListContent"
        );


    const button =
        document.getElementById(
            "toggleStockBtn"
        );


    if (
        !content ||
        !button
    ) {

        return;

    }


    const isOpen =
        content.classList.toggle(
            "show"
        );


    button.textContent =
        isOpen
            ? "Sembunyikan"
            : "Tampilkan";

}


/* =====================================================
   KLIK LUAR MODAL
===================================================== */

window.addEventListener(
    "click",
    function(event) {

        const modal =
            document.getElementById(
                "transactionModal"
            );


        if (
            event.target === modal
        ) {

            closeModal();

        }

    }
);


/* =====================================================
   ENTER TAMBAH BARANG
===================================================== */

document
    .getElementById(
        "stokAwal"
    )
    .addEventListener(
        "keydown",
        function(event) {

            if (
                event.key === "Enter"
            ) {

                tambahBarang();

            }

        }
    );


/* =====================================================
   ESC UNTUK TUTUP MODAL
===================================================== */

document.addEventListener(
    "keydown",
    function(event) {

        if (
            event.key === "Escape"
        ) {

            closeModal();

        }

    }
);


/* =====================================================
   TANGGAL HARI INI
===================================================== */

function getTodayDate() {

    const now =
        new Date();


    const year =
        now.getFullYear();


    const month =
        String(
            now.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            now.getDate()
        ).padStart(
            2,
            "0"
        );


    return (
        year +
        "-" +
        month +
        "-" +
        day
    );

}


/* =====================================================
   PILIH TANGGAL
===================================================== */

document
    .getElementById(
        "tanggal"
    )
    .addEventListener(
        "change",
        function() {

            tanggalDipilih =
                this.value;


            updateTable();

        }
    );


/* =====================================================
   INIT
===================================================== */

async function init() {

    tanggalDipilih =
        getTodayDate();


    document.getElementById(
        "tanggal"
    ).value =
        tanggalDipilih;


    await loadBarang();


    await loadTransactions();

}


init();
                    async function exportExcel() {

    if (typeof XLSX === "undefined") {
        alert("Library Excel belum dimuat.");
        return;
    }

    const now = new Date();
    const tahun = now.getFullYear();
    const bulan = now.getMonth();
    const hariIni = now.getDate();

    const namaBulan = [
        "Januari","Februari","Maret","April","Mei","Juni",
        "Juli","Agustus","September","Oktober","November","Desember"
    ];

    const jumlahHari =
        new Date(tahun, bulan + 1, 0).getDate();

    const dataExcel = [];

    /* ================================
       BARIS HEADER
    ================================= */

    const header = [
        `${namaBulan[bulan]}-${tahun}`
    ];

    for (let hari = 1; hari <= jumlahHari; hari++) {
        header.push(`${hari}/${bulan + 1}`);
    }

    dataExcel.push(header);


    /* ================================
       DATA BARANG
    ================================= */

    dataBarang.forEach(function(barang) {

        const row = [barang.nama];

        let stok =
            Number(barang.stok_awal) || 0;


        for (let hari = 1; hari <= jumlahHari; hari++) {

            /* Setelah hari ini kosong */
            if (hari > hariIni) {
                row.push("");
                continue;
            }


            const tanggal =
                `${tahun}-${String(bulan + 1).padStart(2, "0")}-${String(hari).padStart(2, "0")}`;


            /* Transaksi pada tanggal tersebut */
            const transaksiHari =
                transactions.filter(function(transaction) {

                    return (
                        Number(transaction.barang_id) ===
                        Number(barang.id)
                        &&
                        transaction.tanggal === tanggal
                    );

                });


            let perubahan = 0;


            transaksiHari.forEach(function(transaction) {

                const qty =
                    Number(transaction.qty) || 0;


                if (transaction.type === "masuk") {
                    perubahan += qty;
                }

                if (transaction.type === "laku") {
                    perubahan -= qty;
                }

            });


            /* =========================
               JIKA ADA TRANSAKSI
            ========================= */

            if (transaksiHari.length > 0) {

                row.push(perubahan);

                stok += perubahan;

            } else {

                /* Tidak ada transaksi */
                row.push(stok);

            }

        }


        dataExcel.push(row);

    });


    /* ================================
       BUAT WORKBOOK
    ================================= */

    const worksheet =
        XLSX.utils.aoa_to_sheet(dataExcel);

    const workbook =
        XLSX.utils.book_new();


    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Rekap Stok"
    );


    /* ================================
       MERGE A1 SAMPAI AKHIR BULAN
    ================================= */

    worksheet["!merges"] = [
        {
            s: { r: 0, c: 0 },
            e: {
                r: 0,
                c: jumlahHari
            }
        }
    ];


    /* ================================
       LEBAR KOLOM
    ================================= */

    const widths = [
        {
            wch: 35
        }
    ];

    for (let i = 0; i < jumlahHari; i++) {
        widths.push({
            wch: 7
        });
    }

    worksheet["!cols"] = widths;


    /* ================================
       STYLE CELL
    ================================= */

    for (let r = 0; r < dataExcel.length; r++) {

        for (let c = 0; c < dataExcel[r].length; c++) {

            const cellAddress =
                XLSX.utils.encode_cell({
                    r: r,
                    c: c
                });

            const cell =
                worksheet[cellAddress];

            if (!cell) continue;


            /* Header */
            if (r === 0) {

                cell.s = {
                    font: {
                        bold: true
                    },
                    alignment: {
                        horizontal: "center",
                        vertical: "center"
                    }
                };

                continue;
            }


            /* Nama barang */
            if (c === 0) {

                cell.s = {
                    alignment: {
                        vertical: "center"
                    }
                };

                continue;
            }


            const value =
                Number(cell.v);


            /* BARANG LAKU */
            if (
                Number.isFinite(value) &&
                value < 0
            ) {

                cell.s = {
                    font: {
                        color: {
                            rgb: "FFFFFF"
                        },
                        bold: true
                    },
                    fill: {
                        fgColor: {
                            rgb: "C00000"
                        }
                    },
                    alignment: {
                        horizontal: "center",
                        vertical: "center"
                    }
                };

            }


            /* BARANG MASUK */
            else if (
                Number.isFinite(value) &&
                value > 0
            ) {

                /*
                 * Hanya diberi hijau jika
                 * nilai tersebut merupakan
                 * transaksi masuk.
                 */

                const barang =
                    dataBarang[r - 1];

                const tanggalIndex =
                    c - 1;

                const tanggal =
                    `${tahun}-${String(bulan + 1).padStart(2, "0")}-${String(tanggalIndex + 1).padStart(2, "0")}`;

                const adaMasuk =
                    transactions.some(function(transaction) {

                        return (
                            Number(transaction.barang_id) ===
                            Number(barang.id)
                            &&
                            transaction.tanggal ===
                            tanggal
                            &&
                            transaction.type ===
                            "masuk"
                        );

                    });

                if (adaMasuk) {

                    cell.s = {
                        font: {
                            color: {
                                rgb: "006100"
                            },
                            bold: true
                        },
                        fill: {
                            fgColor: {
                                rgb: "C6EFCE"
                            }
                        },
                        alignment: {
                            horizontal: "center",
                            vertical: "center"
                        }
                    };

                } else {

                    cell.s = {
                        alignment: {
                            horizontal: "center",
                            vertical: "center"
                        }
                    };

                }

            }

        }

    }


    /* ================================
       EXPORT
    ================================= */

    const excelData =
        XLSX.write(workbook, {
            bookType: "xlsx",
            type: "array"
        });

    const blob =
        new Blob(
            [excelData],
            {
                type:
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            }
        );

    const url =
        URL.createObjectURL(blob);

    const link =
        document.createElement("a");

    link.href = url;

    link.download =
        `Rekap-Stok-${namaBulan[bulan]}-${tahun}.xlsx`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);

        }
