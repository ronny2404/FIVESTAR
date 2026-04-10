// GANTI DENGAN URL DEPLOY GOOGLE APPS SCRIPT KAMU
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzxKTXBmNy7XIy65IFf9dy0D7YOnjjqbg_x8LWAlTE6Ob9cxL1tptXLMlDoP0l98C3e/exec"; 
const APP_VERSION = "3.0.0"; 

let offlineQueue = JSON.parse(localStorage.getItem('fs_queue')) || [];
let missingAbsenQueue = [];
let currentPage = 'loginPage';
let currentCalDate = new Date();
let isEditAbsenMode = false;
let manualAbsenDateStr = "";

// ==========================================
// INISIALISASI (KUNCI KONTAK UTAMA)
// ==========================================
window.onload = () => { 
    updateSyncIndicator();
    if(localStorage.getItem('user_username')) {
        showPage('mainPage'); 
        if (getHydratedData().length === 0 && navigator.onLine) syncAllData(false);
        checkMissingAbsensi(); 
        processQueue();
    } else {
        showPage('loginPage'); 
    }
};

// ==========================================
// SISTEM ENGINE (OTA, ANTRIAN, SYNC)
// ==========================================
function updateSyncIndicator() {
    const ind = document.getElementById('syncIndicator');
    if(ind) {
        ind.className = navigator.onLine && offlineQueue.length === 0
            ? "fixed top-4 right-4 z-[600] w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" 
            : "fixed top-4 right-4 z-[600] w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]";
        if(navigator.onLine && offlineQueue.length > 0) ind.className = "fixed top-4 right-4 z-[600] w-3 h-3 rounded-full bg-yellow-400";
    }
}

function checkAppVersion(serverVersion) {
    if (serverVersion && serverVersion !== APP_VERSION) {
        alert("Versi baru Five Star App tersedia! Sistem akan memuat ulang untuk pembaruan.");
        localStorage.removeItem('all_app_data'); 
        window.location.reload(true);
    }
}

function generateUniqueId() {
    return 'TX-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2,7).toUpperCase();
}

async function processQueue() {
    updateSyncIndicator();
    if (!navigator.onLine || offlineQueue.length === 0) return;
    
    let queueCopy = [...offlineQueue];
    for (let item of queueCopy) {
        try {
            const res = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(item.payload) });
            const result = await res.json();
            if (result.status === 'success') {
                offlineQueue = offlineQueue.filter(q => q.id !== item.id);
                localStorage.setItem('fs_queue', JSON.stringify(offlineQueue));
            }
        } catch (e) { break; } 
    }
    updateSyncIndicator();
}

function addToQueueAndRun(payload, msg) {
    payload.tx_id = generateUniqueId();
    payload.action = "addData";
    payload.username = localStorage.getItem('user_username');

    offlineQueue.push({ id: payload.tx_id, payload: payload });
    localStorage.setItem('fs_queue', JSON.stringify(offlineQueue));
    
    let localData = JSON.parse(localStorage.getItem('all_app_data')) || [];
    localData.push({
        tanggal: payload.tanggal, kategori: payload.kategori, lokasi: payload.lokasi,
        status_treatment: payload.status_treatment, durasi_nominal: payload.durasi_nominal
    });
    localStorage.setItem('all_app_data', JSON.stringify(localData));

    showNotif(msg);
    processQueue();
}

async function syncAllData(showManualMsg = false) {
    if(!navigator.onLine) return;
    try {
        if(showManualMsg) showNotif("Menarik data dari server...");
        const res = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: "syncAll", username: localStorage.getItem('user_username') }) });
        const result = await res.json();
        if (result.status === 'success') {
            localStorage.setItem('all_app_data', JSON.stringify(result.data));
            checkAppVersion(result.server_version);
            if(showManualMsg) showNotif("Sinkronisasi Selesai!");
        }
    } catch(e) {}
}

function getHydratedData() { return JSON.parse(localStorage.getItem('all_app_data')) || []; }

// ==========================================
// AUTENTIKASI (LOGIN / REGIS / LOGOUT)
// ==========================================
async function login() {
    const user = document.getElementById('loginUser').value.toLowerCase().trim();
    const pass = document.getElementById('loginPass').value;
    if(!user || !pass) return showNotif("Isi Username & Password!", "error");

    const btn = document.getElementById('btnLogin');
    btn.innerText = "MENGECEK...";
    try {
        const res = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: "login", username: user, password: pass }) });
        const result = await res.json();
        if(result.status === 'success') { 
            localStorage.setItem('user_username', result.data.username);
            localStorage.setItem('user_nama_lengkap', result.data.nama_lengkap);
            showNotif("Login Berhasil!");
            await syncAllData(false);
            showPage('mainPage');
            checkMissingAbsensi();
        } else showNotif(result.message, "error");
    } catch (e) { showNotif("Offline: Gagal Terhubung Server", "error"); }
    btn.innerText = "MASUK";
}

async function register() {
    const user = document.getElementById('regUser').value.toLowerCase().trim();
    const pass = document.getElementById('regPass').value;
    const confirmPass = document.getElementById('regConfirmPass').value;
    const name = document.getElementById('regName').value;
    const gender = document.getElementById('regGender').value;
    const date = document.getElementById('regDate').value;
    const address = document.getElementById('regAddress').value;

    // Validasi Form
    if(!user || !pass || !name || !confirmPass) return showNotif("Lengkapi data yang wajib!", "error");
    if(pass !== confirmPass) return showNotif("Password tidak cocok!", "error");

    try { 
        // Bungkus semua data untuk dikirim ke Google Apps Script
        const payload = {
            action: "register", 
            username: user, 
            password: pass, 
            nama_lengkap: name,
            jk: gender,
            tgl_lahir: date,
            alamat: address
        };

        const res = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) }); 
        const result = await res.json(); 
        
        if(result.status === 'success') { 
            showNotif("Registrasi Berhasil!"); 
            // Kosongkan form setelah berhasil
            document.getElementById('regUser').value = "";
            document.getElementById('regPass').value = "";
            document.getElementById('regConfirmPass').value = "";
            document.getElementById('regName').value = "";
            document.getElementById('regGender').value = "";
            document.getElementById('regDate').value = "";
            document.getElementById('regAddress').value = "";
            
            setTimeout(() => showPage('loginPage'), 1500);
        } else {
            showNotif(result.message, "error"); 
        }
    } catch (e) { 
        showNotif("Error Server!", "error"); 
    }
}

function doLogout() {
    if (offlineQueue.length > 0) {
        alert("Harap tunggu, masih ada antrean data yang sedang dikirim ke server.");
        processQueue();
        return;
    }
    localStorage.clear();
    missingAbsenQueue = [];
    showPage('loginPage');
}

// ==========================================
// FITUR ABSENSI & UI LOCK
// ==========================================
function getLocalDate() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function checkMissingAbsensi(silentMode = false) {
    const dataLokal = getHydratedData();
    missingAbsenQueue = [];
    
    const todayStr = getLocalDate();
    const [ty, tm, td] = todayStr.split('-');
    let end = new Date(ty, tm - 1, td);
    let current = new Date(end);
    current.setDate(current.getDate() - 3); 
    
    // Cek di dataLokal apakah ada kategori="Absensi" di tanggal tsb
    while (current <= end) {
        const dStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;
        const hasAbsen = dataLokal.some(d => d.kategori === "Absensi" && d.tanggal && d.tanggal.startsWith(dStr));
        if (!hasAbsen) missingAbsenQueue.push(dStr);
        current.setDate(current.getDate() + 1);
    }
    
    checkMainMenuLock();
    if (missingAbsenQueue.length > 0 && !silentMode) showNextMissingAbsen();
}

function showNextMissingAbsen() {
    if (missingAbsenQueue.length === 0) return document.getElementById('queueAbsenModal').classList.add('hidden');
    document.getElementById('queueAbsenTargetDate').innerText = missingAbsenQueue[0];
    document.getElementById('queueAbsenModal').classList.remove('hidden');
}

function skipMissingAbsen() {
    document.getElementById('queueAbsenModal').classList.add('hidden');
    checkMainMenuLock();
}

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

function submitQueueAbsen(status) {
    const lok = document.getElementById('queueAbsenLokasi').value;
    if(!lok && status === 'Masuk') return showNotif("Pilih Lokasi Kerja!", "error");

    const payload = { kategori: "Absensi", tanggal: missingAbsenQueue[0], status_treatment: status, lokasi: lok||"-" };
    addToQueueAndRun(payload, `Absen ${status} Diantrekan!`);
    
    missingAbsenQueue.shift();
    document.getElementById('queueAbsenModal').classList.add('hidden');
    checkMainMenuLock();
    setTimeout(() => { showNextMissingAbsen(); }, 800);
}

function submitManualAbsen(status) {
    const lok = document.getElementById('manualAbsenLokasi').value;
    if(!lok && status === 'Masuk') return showNotif("Pilih Lokasi Kerja!", "error");
    
    const payload = { kategori: "Absensi", tanggal: manualAbsenDateStr, status_treatment: status, lokasi: lok||"-" };
    addToQueueAndRun(payload, `Absen ${status} Diantrekan!`);
    
    document.getElementById('manualAbsenModal').classList.add('hidden');
    checkMissingAbsensi(true);
    if(currentPage === 'absenPage') renderCalendar();
}

// KALENDER ABSEN
function renderCalendar() {
    const year = currentCalDate.getFullYear();
    const month = currentCalDate.getMonth();
    const bNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    document.getElementById('calMonthYear').innerText = `${bNames[month]} ${year}`;

    const grid = document.getElementById('calGrid');
    grid.innerHTML = '';
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const dataLokal = getHydratedData();

    for (let i = 0; i < firstDay; i++) grid.innerHTML += `<div></div>`;

    for (let i = 1; i <= daysInMonth; i++) {
        const dStr = `${year}-${String(month+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        const absenHariIni = dataLokal.reverse().find(d => d.kategori === "Absensi" && d.tanggal && d.tanggal.startsWith(dStr)); // ambil yg terakhir
        dataLokal.reverse(); // kembalikan urutan
        
        let bgClass = "bg-white text-slate-700 border border-slate-100";
        if (dStr === getLocalDate()) bgClass = "border-2 border-red-300";
        let pointer = isEditAbsenMode ? "cursor-pointer hover:bg-slate-50" : "";

        let badge = "";
        if (absenHariIni) {
            let col = "bg-green-500";
            if(absenHariIni.status_treatment === "Off") col = "bg-slate-400";
            if(absenHariIni.status_treatment === "Izin") col = "bg-yellow-500";
            if(absenHariIni.status_treatment === "Alfa") col = "bg-red-600";
            badge = `<div class="mt-1 flex flex-col items-center gap-[2px] w-full px-[1px]"><span class="block w-full text-[6px] font-bold text-white ${col} rounded-[3px] truncate px-[2px]">${absenHariIni.status_treatment}</span></div>`;
        }

        grid.innerHTML += `<div onclick="selectCalDate('${dStr}')" class="p-1 rounded-xl ${bgClass} ${pointer} min-h-[55px] flex flex-col items-center overflow-hidden"><span class="text-xs font-bold leading-none mt-1">${i}</span>${badge}</div>`;
    }
}
function changeCalMonth(dir) { currentCalDate.setMonth(currentCalDate.getMonth() + dir); renderCalendar(); }
function toggleEditAbsenMode() { 
    isEditAbsenMode = !isEditAbsenMode; 
    const btn = document.getElementById('btnToggleEditAbsen');
    
    if (isEditAbsenMode) {
        btn.classList.remove('bg-yellow-500');
        btn.classList.add('bg-red-500');
        btn.innerHTML = `<i class="fa fa-times mr-2"></i> Tutup Mode Edit`;
        showNotif("Mode Edit Aktif! Klik tanggal di kalender.");
    } else {
        btn.classList.remove('bg-red-500');
        btn.classList.add('bg-yellow-500');
        btn.innerHTML = `<i class="fa fa-pencil mr-2"></i> Edit Kehadiran`;
        showNotif("Mode edit dimatikan");
    }
    renderCalendar(); 
}
function selectCalDate(dStr) { if(!isEditAbsenMode) return; manualAbsenDateStr = dStr; document.getElementById('manualAbsenTargetDate').innerText = dStr; document.getElementById('manualAbsenModal').classList.remove('hidden'); }
function closeManualAbsenModal() { document.getElementById('manualAbsenModal').classList.add('hidden'); }

// ==========================================
// FORMULIR KERJA & KASBON
// ==========================================
function simpanCatatan() {
    const payload = { kategori: "Kerja", tanggal: document.getElementById('kerjaDate').value, lokasi: document.getElementById('kerjaLokasi').value, status_treatment: document.getElementById('kerjaTreatment').value, durasi_nominal: document.getElementById('kerjaDurasi').value };
    if(!payload.tanggal || !payload.lokasi || !payload.status_treatment || !payload.durasi_nominal) return showNotif("Lengkapi form!", "error");
    addToQueueAndRun(payload, "Catatan Kerja Disimpan Lokal!");
    showPage('mainPage');
}
function simpanKasbon() {
    const payload = { kategori: "Kasbon", tanggal: document.getElementById('kasbonDate').value, status_treatment: document.getElementById('kasbonJenis').value, durasi_nominal: document.getElementById('kasbonJumlah').value };
    if(!payload.tanggal || !payload.status_treatment || !payload.durasi_nominal) return showNotif("Lengkapi form!", "error");
    addToQueueAndRun(payload, "Kasbon Disimpan Lokal!");
    showPage('mainPage');
}

// ==========================================
// KALKULATOR ZERO-LATENCY (LOKAL HP)
// ==========================================
function ambilTotalJamLocal() {
    const tM = document.getElementById('filterMulai').value;
    const tA = document.getElementById('filterAkhir').value;
    if(!tM || !tA) return showNotif("Isi filter tanggal!", "error");

    const dataLokal = getHydratedData();
    let m1=0, r1=0, m2=0, r2=0;

    dataLokal.forEach(d => {
        if(d.kategori === "Kerja" && d.tanggal >= tM && d.tanggal <= tA) {
            let dur = parseFloat(d.durasi_nominal) || 0;
            if(d.lokasi === "Five Star 1") { if(d.status_treatment==="Massage") m1+=dur; else if(d.status_treatment==="Reflexy") r1+=dur; }
            if(d.lokasi === "Five Star 2") { if(d.status_treatment==="Massage") m2+=dur; else if(d.status_treatment==="Reflexy") r2+=dur; }
        }
    });

    document.getElementById('mFS1').innerText = m1; document.getElementById('rFS1').innerText = r1; document.getElementById('subFS1').innerText = m1+r1;
    document.getElementById('mFS2').innerText = m2; document.getElementById('rFS2').innerText = r2; document.getElementById('subFS2').innerText = m2+r2;
    document.getElementById('resTotalJam').innerText = m1+r1+m2+r2;
}

function hitungGajiLocal() {
    const dataLokal = getHydratedData();
    const bln = document.getElementById('gajiBulan').value; 
    if(!bln) return showNotif("Pilih bulan!", "error");

    let hKerja=0, jamM1=0, jamR1=0, jamM2=0, jamR2=0, kasbon=0, denda=0;

    dataLokal.forEach(d => {
        if(d.tanggal && d.tanggal.startsWith(bln)) {
            if(d.kategori === "Absensi") {
                if(d.status_treatment === "Masuk") hKerja++;
                if(d.status_treatment === "Alfa") denda += 100000;
                if(d.status_treatment === "Izin") denda += 50000;
            }
            if(d.kategori === "Kerja") {
                let dur = parseFloat(d.durasi_nominal) || 0;
                if(d.lokasi === "Five Star 1") { if(d.status_treatment==="Massage") jamM1+=dur; else if(d.status_treatment==="Reflexy") jamR1+=dur; }
                if(d.lokasi === "Five Star 2") { if(d.status_treatment==="Massage") jamM2+=dur; else if(d.status_treatment==="Reflexy") jamR2+=dur; }
            }
            if(d.kategori === "Kasbon") kasbon += parseFloat(d.durasi_nominal) || 0;
        }
    });

    const gapok = 900000; const uMakan = hKerja * 20000;
    const nomM = (jamM1 + jamM2) * 21000; const nomR = (jamR1 + jamR2) * 20000;
    const bonus = 0; // Sesuaikan jika ada tarif bonus
    
    const kotor = gapok + uMakan + nomM + nomR + bonus;
    const bersih = kotor - kasbon - denda;

    const f = num => num.toLocaleString('id-ID');
    document.getElementById('uiGajiBersih').innerText = "Rp " + f(bersih);
    
    // Siapkan Cetakan PDF
    document.getElementById('pdfNama').innerText = localStorage.getItem('user_nama_lengkap');
    document.getElementById('pdfPeriode').innerText = bln;
    document.getElementById('pdfGapok').innerText = f(gapok);
    document.getElementById('pdfHariMakan').innerText = hKerja;
    document.getElementById('pdfUangMakan').innerText = f(uMakan);
    document.getElementById('pdfJamM').innerText = (jamM1 + jamM2);
    document.getElementById('pdfNomM').innerText = f(nomM);
    document.getElementById('pdfJamR').innerText = (jamR1 + jamR2);
    document.getElementById('pdfNomR').innerText = f(nomR);
    document.getElementById('pdfBonus').innerText = f(bonus);
    document.getElementById('pdfInfoFS1').innerText = (jamM1 + jamR1);
    document.getElementById('pdfBruto').innerText = f(kotor);
    document.getElementById('pdfKasbon').innerText = f(kasbon);
    document.getElementById('pdfDenda').innerText = f(denda);
    document.getElementById('pdfBersih').innerText = "Rp " + f(bersih);

    document.getElementById('slipGajiContainer').classList.remove('hidden');
}

function downloadPDF() {
    const el = document.getElementById('pdfPrintArea');
    const nama = localStorage.getItem('user_nama_lengkap') || "Staff";
    const bln = document.getElementById('gajiBulan').value;
    
    el.parentNode.style.display = 'block'; 
    const opt = { margin: 0.5, filename: `Slip_Gaji_${nama}_${bln}.pdf`, image: { type: 'jpeg', quality: 1 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' } };
    html2pdf().set(opt).from(el).save().then(() => { el.parentNode.style.display = 'none'; showNotif("PDF Diunduh!"); });
}

// ==========================================
// UTILS UI NAVIGASI
// ==========================================
function togglePass(id, icon) { const i = document.getElementById(id); i.type = i.type==="password"?"text":"password"; icon.classList.toggle('fa-eye-slash'); }
function showPage(id) {
    document.querySelectorAll('.page-section').forEach(p => p.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    currentPage = id;
    if(id === 'mainPage') {
        const name = localStorage.getItem('user_nama_lengkap');
        document.getElementById('welcomeName').innerText = name;
        document.getElementById('userAvatar').innerText = name ? name.charAt(0).toUpperCase() : 'U';
    }
    if(id === 'absenPage') { isEditAbsenMode = false; currentCalDate = new Date(); renderCalendar(); }
    if(id === 'kerjaPage') document.getElementById('kerjaDate').value = getLocalDate();
    if(id === 'kasbonPage') document.getElementById('kasbonDate').value = getLocalDate();
}
function showAccount() {
    showPage('accountViewPage');
    document.getElementById('viewName').innerText = localStorage.getItem('user_nama_lengkap');
    document.getElementById('viewUser').innerText = localStorage.getItem('user_username');
}
function showNotif(msg, type="success") {
    document.getElementById('successMsg').innerText = msg;
    const n = document.getElementById('successNotif');
    n.classList.remove('hidden', 'notif-hidden'); n.classList.add('notif-show');
    setTimeout(() => { n.classList.remove('notif-show'); n.classList.add('notif-hidden'); setTimeout(() => n.classList.add('hidden'), 500); }, 3000);
}

window.addEventListener('online', processQueue);
window.addEventListener('offline', updateSyncIndicator);
setInterval(processQueue, 15000);
