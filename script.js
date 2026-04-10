// GANTI DENGAN URL GAS ASLIMU
const SCRIPT_URL = "URL_GAS_KAMU_DISINI"; 

let offlineQueue = JSON.parse(localStorage.getItem('fs_queue')) || [];
let missingAbsenQueue = [];
let currentPage = 'loginPage';
let currentCalDate = new Date();
let isEditAbsenMode = false;
let manualAbsenDateStr = "";

// ==========================================
// INISIALISASI
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

function getHydratedData() { 
    try {
        const val = localStorage.getItem('all_app_data');
        return val ? JSON.parse(val) : [];
    } catch (e) { return []; }
}

function updateSyncIndicator() {
    const ind = document.getElementById('syncIndicator');
    if(ind) ind.style.backgroundColor = navigator.onLine ? "#22c55e" : "#ef4444";
}

// ==========================================
// SISTEM INFO / NOTIFIKASI
// ==========================================
function showNotif(msg, type = "success") {
    const container = document.getElementById('successNotif');
    const box = document.getElementById('notifBox');
    const icon = document.getElementById('notifIcon');
    const msgEl = document.getElementById('successMsg');
    const bar = document.getElementById('notifProgressBar');

    bar.style.transition = 'none'; bar.style.width = '100%';
    if (type === "error") {
        box.classList.replace('notif-success', 'notif-error');
        icon.className = "fa fa-exclamation-triangle text-xl";
    } else {
        box.classList.replace('notif-error', 'notif-success');
        icon.className = "fa fa-check-circle text-xl";
    }

    msgEl.innerText = msg;
    container.classList.add('notif-active');

    setTimeout(() => { bar.style.transition = 'width 3s linear'; bar.style.width = '0%'; }, 10);
    setTimeout(() => { container.classList.remove('notif-active'); }, 3000);
}

// ==========================================
// CORE FUNCTIONS
// ==========================================
async function login() {
    const user = document.getElementById('loginUser').value.toLowerCase().trim();
    const pass = document.getElementById('loginPass').value;
    if(!user || !pass) return showNotif("Isi Username & Password!", "error");

    const btn = document.getElementById('btnLogin');
    btn.innerText = "PROSES...";
    try {
        const res = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: "login", username: user, password: pass }) });
        const result = await res.json();
        if(result.status === 'success') { 
            localStorage.setItem('user_username', result.data.username);
            localStorage.setItem('user_nama_lengkap', result.data.nama_lengkap);
            showNotif("Login Berhasil!");
            showPage('mainPage');
            checkMissingAbsensi();
        } else showNotif(result.message, "error");
    } catch (e) { showNotif("Server Error / Offline", "error"); }
    btn.innerText = "MASUK";
}

async function register() {
    const user = document.getElementById('regUser').value.toLowerCase().trim();
    const pass = document.getElementById('regPass').value;
    const confirm = document.getElementById('regConfirmPass').value;
    const name = document.getElementById('regName').value;

    if(!user || !pass || !name) return showNotif("Lengkapi data!", "error");
    if(pass !== confirm) return showNotif("Password tidak cocok!", "error");

    const btn = document.getElementById('btnRegister');
    btn.innerText = "MENDAFTAR...";
    try { 
        const payload = {
            action: "register", username: user, password: pass, nama_lengkap: name,
            jk: document.getElementById('regGender').value,
            tgl_lahir: document.getElementById('regDate').value,
            alamat: document.getElementById('regAddress').value
        };
        const res = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) }); 
        const result = await res.json(); 
        if(result.status === 'success') { showNotif("Berhasil Daftar!"); showPage('loginPage'); }
        else showNotif(result.message, "error");
    } catch (e) { showNotif("Gagal terhubung server", "error"); }
    btn.innerText = "DAFTAR AKUN";
}

function togglePass(id, icon) {
    const i = document.getElementById(id);
    if(i.type === "password") {
        i.type = "text";
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        i.type = "password";
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}

function showPage(id) {
    document.querySelectorAll('.page-section').forEach(p => p.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    if(id === 'mainPage') {
        document.getElementById('welcomeName').innerText = localStorage.getItem('user_nama_lengkap');
        document.getElementById('userAvatar').innerText = (localStorage.getItem('user_nama_lengkap') || 'U')[0].toUpperCase();
    }
    if(id === 'absenPage') renderCalendar();
}

// ==========================================
// KALENDER & ANIMASI KETUKAN
// ==========================================
function renderCalendar() {
    const year = currentCalDate.getFullYear();
    const month = currentCalDate.getMonth();
    const bNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    document.getElementById('calMonthYear').innerText = `${bNames[month]} ${year}`;
    const grid = document.getElementById('calGrid'); grid.innerHTML = '';
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dataLokal = getHydratedData();

    for (let i = 0; i < firstDay; i++) grid.innerHTML += `<div></div>`;

    for (let i = 1; i <= daysInMonth; i++) {
        const dStr = `${year}-${String(month+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        const isSunday = new Date(year, month, i).getDay() === 0;
        let textColor = isSunday ? "text-red-500" : "text-slate-700";
        let bgClass = "bg-white border border-slate-100";
        if (dStr === getLocalDate()) bgClass = "border-2 border-red-300";

        let absen = [...dataLokal].reverse().find(d => d.kategori === "Absensi" && d.tanggal && d.tanggal.startsWith(dStr));
        let badge = absen ? `<div class="mt-1 w-full"><span class="block text-[6px] text-white bg-green-500 rounded px-1 truncate font-bold uppercase">${absen.status_treatment}</span></div>` : "";

        grid.innerHTML += `
            <div onclick="selectCalDate('${dStr}', this)" class="p-1 rounded-xl ${bgClass} ${textColor} min-h-[55px] flex flex-col items-center overflow-hidden">
                <span class="text-xs font-bold mt-1">${i}</span>
                ${badge}
            </div>`;
    }
}

function selectCalDate(dStr, element) { 
    if(!isEditAbsenMode) return; 
    element.classList.add('tap-flash');
    setTimeout(() => {
        element.classList.remove('tap-flash');
        manualAbsenDateStr = dStr; 
        document.getElementById('manualAbsenTargetDate').innerText = dStr; 
        document.getElementById('manualAbsenModal').classList.remove('hidden'); 
    }, 250);
}

function toggleEditAbsenMode() { 
    isEditAbsenMode = !isEditAbsenMode; 
    const btn = document.getElementById('btnToggleEditAbsen');
    btn.classList.toggle('bg-yellow-500'); btn.classList.toggle('bg-red-500');
    btn.innerHTML = isEditAbsenMode ? "Tutup Edit" : "Edit Kehadiran";
}

function changeCalMonth(dir) { currentCalDate.setMonth(currentCalDate.getMonth() + dir); renderCalendar(); }

// ==========================================
// FITUR LAINNYA
// ==========================================
function simpanKerja() {
    const payload = { kategori: "Kerja", tanggal: document.getElementById('kerjaDate').value, lokasi: document.getElementById('kerjaLokasi').value, status_treatment: document.getElementById('kerjaTreatment').value, durasi_nominal: document.getElementById('kerjaDurasi').value };
    addToQueueAndRun(payload, "Data Kerja Tersimpan!");
    showPage('mainPage');
}

function simpanKasbon() {
    const payload = { kategori: "Kasbon", tanggal: document.getElementById('kasbonDate').value, status_treatment: document.getElementById('kasbonJenis').value, durasi_nominal: document.getElementById('kasbonJumlah').value };
    addToQueueAndRun(payload, "Kasbon Tersimpan!");
    showPage('mainPage');
}

function ambilTotalJamLocal() {
    let t = 0; getHydratedData().forEach(d => { if(d.kategori==="Kerja") t += parseFloat(d.durasi_nominal)||0; });
    document.getElementById('resTotalJam').innerText = t;
}

function hitungGajiLocal() {
    let t = 0; getHydratedData().forEach(d => { if(d.kategori==="Kerja") t += (parseFloat(d.durasi_nominal)||0)*21000; });
    document.getElementById('uiGajiBersih').innerText = "Rp " + t.toLocaleString();
    document.getElementById('slipGajiContainer').classList.remove('hidden');
}

function downloadPDF() { html2pdf().from(document.getElementById('pdfPrintArea')).save(); }
function doLogout() { localStorage.clear(); window.location.reload(); }
function showAccount() { showPage('accountViewPage'); document.getElementById('viewName').innerText = localStorage.getItem('user_nama_lengkap'); document.getElementById('viewUser').innerText = localStorage.getItem('user_username'); }
function closeManualAbsenModal() { document.getElementById('manualAbsenModal').classList.add('hidden'); }
function getLocalDate() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

// Placeholder functions for missing logic
async function processQueue() {}
async function syncAllData() {}
function checkMissingAbsensi() {}
function skipMissingAbsen() {}
function addToQueueAndRun(p, m) { showNotif(m); }
