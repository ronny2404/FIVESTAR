
const SCRIPT_URL = "URL_GOOGLE_APPS_SCRIPT_KAMU_DISINI"; 
const APP_VERSION = "3.0.0"; // Versi Klien. OTA Updater akan cek versi ini.

let offlineQueue = JSON.parse(localStorage.getItem('fs_queue')) || [];
let missingAbsenQueue = [];
let currentPage = 'mainPage';

// OTA Updater: Cek Versi Aplikasi
function checkAppVersion(serverVersion) {
    if (serverVersion && serverVersion !== APP_VERSION) {
        alert("Versi baru Five Star App tersedia! Sistem akan memuat ulang untuk menerapkan pembaruan.");
        localStorage.removeItem('all_app_data'); // Hapus cache lama
        window.location.reload(true);
    }
}

// Sistem Generator ID Unik (Idempotency)
function generateUniqueId() {
    return 'TX-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2,7).toUpperCase();
}

// Background Sync Engine
async function processQueue() {
    const ind = document.getElementById('syncIndicator');
    if (!navigator.onLine || offlineQueue.length === 0) {
        ind.className = !navigator.onLine ? "fixed top-4 right-4 z-[600] w-3 h-3 rounded-full bg-red-500" : "fixed top-4 right-4 z-[600] w-3 h-3 rounded-full bg-green-500";
        return;
    }
    
    ind.className = "fixed top-4 right-4 z-[600] w-3 h-3 rounded-full bg-yellow-400";
    
    // Batch Processing Simulation: Loop queue
    let queueCopy = [...offlineQueue];
    for (let item of queueCopy) {
        try {
            const res = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(item.payload) });
            const result = await res.json();
            if (result.status === 'success') {
                offlineQueue = offlineQueue.filter(q => q.id !== item.id);
                localStorage.setItem('fs_queue', JSON.stringify(offlineQueue));
            }
        } catch (e) { break; } // Jika gagal, berhenti dan coba lagi nanti
    }
    processQueue(); // Panggil ulang untuk update lampu indikator
}

// Optimistic UI: Tambah antrean & langsung ubah UI
function addToQueueAndRun(payload, msg) {
    payload.tx_id = generateUniqueId();
    payload.action = "addData";
    payload.username = localStorage.getItem('user_username');

    offlineQueue.push({ id: payload.tx_id, payload: payload });
    localStorage.setItem('fs_queue', JSON.stringify(offlineQueue));
    
    // Optimistic Cache: Masukkan langsung ke Local DB agar slip gaji langsung update!
    let localData = JSON.parse(localStorage.getItem('all_app_data')) || [];
    localData.push(payload);
    localStorage.setItem('all_app_data', JSON.stringify(localData));

    showNotif(msg);
    processQueue();
}

// Sistem Data Hydration (Tarik Semua Data)
async function syncAllData() {
    if(!navigator.onLine) return;
    try {
        const res = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: "syncAll", username: localStorage.getItem('user_username') }) });
        const result = await res.json();
        if (result.status === 'success') {
            localStorage.setItem('all_app_data', JSON.stringify(result.data));
            checkAppVersion(result.server_version);
            showNotif("Database Offline tersinkronisasi!");
        }
    } catch(e) {}
}

// -----------------------------------------
// MODUL ZERO-LATENCY CALCULATOR (LOKAL HP)
// -----------------------------------------
function getHydratedData() {
    return JSON.parse(localStorage.getItem('all_app_data')) || [];
}

function hitungGajiLocal() {
    const dataLokal = getHydratedData();
    const bulanDipilih = document.getElementById('gajiBulan').value; // format: "YYYY-MM"
    if(!bulanDipilih) return showNotif("Pilih bulan!", "error");

    let hKerja = 0, jamM1 = 0, jamR1 = 0, jamM2 = 0, jamR2 = 0, kasbon = 0, denda = 0;

    // Looping data internal tanpa internet
    dataLokal.forEach(d => {
        if(d.tanggal.startsWith(bulanDipilih)) {
            if(d.kategori === "Absensi") {
                if(d.status_treatment === "Masuk") hKerja++;
                if(d.status_treatment === "Alfa") denda += 100000;
                if(d.status_treatment === "Izin") denda += 50000;
            }
            if(d.kategori === "Kerja") {
                let durasi = parseFloat(d.durasi_nominal) || 0;
                if(d.lokasi === "Five Star 1") {
                    if(d.status_treatment === "Massage") jamM1 += durasi;
                    if(d.status_treatment === "Reflexy") jamR1 += durasi;
                } else if (d.lokasi === "Five Star 2") {
                    if(d.status_treatment === "Massage") jamM2 += durasi;
                    if(d.status_treatment === "Reflexy") jamR2 += durasi;
                }
            }
            if(d.kategori === "Kasbon") {
                kasbon += parseFloat(d.durasi_nominal) || 0;
            }
        }
    });

    // Perhitungan Matematika Sesuai Foto
    const gapok = 900000;
    const uMakan = hKerja * 20000;
    const nomM = (jamM1 + jamM2) * 21000;
    const nomR = (jamR1 + jamR2) * 20000;
    const bonus = 0; // Tambahkan logika bonusmu di sini
    
    const kotor = gapok + uMakan + nomM + nomR + bonus;
    const bersih = kotor - kasbon - denda;

    // Siapkan UI & Data untuk PDF
    document.getElementById('uiGajiBersih').innerText = "Rp " + bersih.toLocaleString('id-ID');
    
    // Injeksi ke cetakan PDF
    document.getElementById('pdfNama').innerText = localStorage.getItem('user_nama_lengkap');
    document.getElementById('pdfPeriode').innerText = bulanDipilih;
    document.getElementById('pdfGapok').innerText = gapok.toLocaleString('id-ID');
    document.getElementById('pdfHariMakan').innerText = hKerja;
    document.getElementById('pdfUangMakan').innerText = uMakan.toLocaleString('id-ID');
    document.getElementById('pdfJamM').innerText = (jamM1 + jamM2);
    document.getElementById('pdfNomM').innerText = nomM.toLocaleString('id-ID');
    document.getElementById('pdfJamR').innerText = (jamR1 + jamR2);
    document.getElementById('pdfNomR').innerText = nomR.toLocaleString('id-ID');
    document.getElementById('pdfBonus').innerText = bonus.toLocaleString('id-ID');
    document.getElementById('pdfInfoFS1').innerText = (jamM1 + jamR1); // Info spesifik lokasi FS1
    document.getElementById('pdfBruto').innerText = kotor.toLocaleString('id-ID');
    document.getElementById('pdfKasbon').innerText = kasbon.toLocaleString('id-ID');
    document.getElementById('pdfDenda').innerText = denda.toLocaleString('id-ID');
    document.getElementById('pdfBersih').innerText = "Rp " + bersih.toLocaleString('id-ID');

    document.getElementById('slipGajiContainer').classList.remove('hidden');
}

// -----------------------------------------
// MODUL CETAK PDF LOKAL
// -----------------------------------------
function downloadPDF() {
    const element = document.getElementById('pdfPrintArea');
    const nama = localStorage.getItem('user_nama_lengkap') || "Staff";
    const bulan = document.getElementById('gajiBulan').value;
    
    element.parentNode.style.display = 'block'; // Tampilkan sebentar
    
    const opt = {
        margin:       0.5,
        filename:     `Slip_Gaji_${nama}_${bulan}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    // Proses cetak
    html2pdf().set(opt).from(element).save().then(() => {
        element.parentNode.style.display = 'none'; // Sembunyikan lagi
        showNotif("PDF Berhasil Diunduh!");
    });
}

// -----------------------------------------
// MODUL FORCED UI LOCK & ABSEN BOLONG
// -----------------------------------------
function checkMainMenuLock() {
    const hasMissing = missingAbsenQueue.length > 0;
    const banner = document.getElementById('lockBanner');
    const lockables = document.querySelectorAll('.ui-lockable');
    
    if(hasMissing) {
        banner.classList.remove('hidden');
        lockables.forEach(btn => btn.classList.add('opacity-40', 'pointer-events-none', 'grayscale'));
    } else {
        banner.classList.add('hidden');
        lockables.forEach(btn => btn.classList.remove('opacity-40', 'pointer-events-none', 'grayscale'));
    }
}

// Fungsi Simpan (Kerja & Kasbon) memanggil antrean
function simpanCatatan() {
    const payload = { 
        kategori: "Kerja", 
        tanggal: document.getElementById('kerjaDate').value,
        lokasi: document.getElementById('kerjaLokasi').value,
        status_treatment: document.getElementById('kerjaTreatment').value,
        durasi_nominal: document.getElementById('kerjaDurasi').value
    };
    addToQueueAndRun(payload, "Catatan Kerja Diantrekan!");
    showPage('mainPage');
}

// Navigasi & Notif (Sederhana)
function showPage(id) {
    document.querySelectorAll('.page-section').forEach(p => p.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    currentPage = id;
}

function showNotif(msg) {
    document.getElementById('successMsg').innerText = msg;
    const notif = document.getElementById('successNotif');
    notif.classList.remove('hidden', 'notif-hidden');
    notif.classList.add('notif-show');
    setTimeout(() => {
        notif.classList.remove('notif-show');
        notif.classList.add('notif-hidden');
        setTimeout(() => notif.classList.add('hidden'), 500);
    }, 3000);
}

window.addEventListener('online', processQueue);
window.addEventListener('offline', processQueue);
setInterval(processQueue, 15000); 

// ==========================================
// INISIALISASI SAAT APLIKASI PERTAMA DIBUKA
// ==========================================
window.onload = () => { 
    // Set warna indikator awal
    const ind = document.getElementById('syncIndicator');
    if (ind) {
        ind.className = navigator.onLine 
            ? "fixed top-4 right-4 z-[600] w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" 
            : "fixed top-4 right-4 z-[600] w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]";
    }

    // Penentuan Halaman (Cek sesi login)
    if(localStorage.getItem('user_username')) {
        showPage('mainPage'); // Jika sudah login, langsung ke menu utama
        
        // Panggil fungsi cek absen bolong jika fungsinya ada
        if (typeof checkMissingAbsensi === "function") {
            checkMissingAbsensi(); 
        }
        processQueue(); 
    } else {
        showPage('loginPage'); // Jika belum login, ke halaman login
    }
};
