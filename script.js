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
   TANGGAL HARI INI
===================================================== */

function getTodayDate() {

    const now = new Date();

    const year =
        now.getFullYear();

    const month =
        String(
            now.getMonth() + 1
        ).padStart(2, "0");

    const day =
        String(
            now.getDate()
        ).padStart(2, "0");

    return (
        year +
        "-" +
        month +
        "-" +
        day
    );

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


            if (
                tanggalDipilih &&
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


    tbody.innerHTML = "";


    filtered.forEach(
        function(barang, index) {

            const stok =
                getCurrentStock(
                    barang
                );


            let statusClass =
                "stock-aman";


            if (stok <= 0) {

                statusClass =
                    "stock-habis";

            } else if (stok <= 5) {

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

                <td class="${statusClass}">
                    ${formatNumber(stok)}
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


            tbody.appendChild(tr);

        }
    );


    updateStats();

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


    const transaksiHariIni =
        transactions.filter(
            function(transaction) {

                if (!tanggalDipilih) {
                    return false;
                }

                return (
                    transaction.tanggal ===
                    tanggalDipilih
                );

            }
        ).length;


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


    if (totalBarangElement) {

        totalBarangElement.textContent =
            formatNumber(
                dataBarang.length
            );

    }


    if (totalStokElement) {

        totalStokElement.textContent =
            formatNumber(
                totalStok
            );

    }


    if (transaksiElement) {

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


    if (
        selectedTransactionType ===
        "laku"
    ) {

        const stok =
            getCurrentStock(
                barang
            );


        if (qty > stok) {

            alert(
                "Jumlah barang laku melebihi stok.\n\n" +
                "Stok tersedia: " +
                formatNumber(stok)
            );

            return;

        }

    }


    const tanggal =
        tanggalDipilih ||
        getTodayDate();


    const {
        error
    } =
        await supabaseClient
            .from("transaksi")
            .insert({

                barang_id:
                    barang.id,

                tanggal:
                    tanggal,

                type:
                    selectedTransactionType,

                qty:
                    qty

            });


    if (error) {

        console.error(error);

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


    const history =
        [...transactions].reverse();


    tbody.innerHTML = "";


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
                transaction.type === "masuk"
                    ? "➕ Barang Masuk"
                    : "🛒 Barang Laku";


            const qtyText =
                transaction.type === "masuk"
                    ? "+" +
                      formatNumber(
                          transaction.qty
                      )
                    : "-" +
                      formatNumber(
                          transaction.qty
                      );


            let stokAkhir = "-";


            if (barang) {

                stokAkhir =
                    getStockAfterTransaction(
                        barang,
                        transaction
                    );

            }


            const waktu =
                transaction.created_at
                    ? new Date(
                        transaction.created_at
                    ).toLocaleString(
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
                    ${escapeHTML(waktu)}
                </td>

                <td>
                    ${escapeHTML(
                        namaBarang
                    )}
                </td>

                <td>
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


            tbody.appendChild(tr);

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
                transaction.tanggal >
                targetTransaction.tanggal
            ) {

                return;

            }


            if (
                transaction.tanggal ===
                targetTransaction.tanggal
            ) {

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
    .getElementById("search")
    .addEventListener(
        "input",
        updateTable
    );


/* =====================================================
   PILIH TANGGAL
===================================================== */

document
    .getElementById("tanggal")
    .addEventListener(
        "change",
        function() {

            tanggalDipilih =
                this.value;

            updateTable();

        }
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
    .getElementById("stokAwal")
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