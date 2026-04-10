// GANTI DENGAN URL GAS ASLIMU
const SCRIPT_URL = "URL_GAS_KAMU_DISINI"; 
const APP_VERSION = "3.0.0"; 

let offlineQueue = JSON.parse(localStorage.getItem('fs_queue')) || [];
let missingAbsenQueue = [];
let currentPage = 'loginPage';
let currentCalDate = new Date();
let isEditAbsenMode = false;
let manualAbsenDateStr = "";

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

async function processQueue() {
    if (!navigator.onLine || offlineQueue.length === 0) return;
    let item = offlineQueue[0];
    try {
        const res = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(item.payload) });
        const result = await res.json();
        if (result.status === 'success') {
            offlineQueue.shift();
            localStorage.setItem('fs_queue', JSON.stringify(offlineQueue));
            processQueue();
        }
    } catch (e) {}
}

function addToQueueAndRun(payload, msg) {
    payload.action = "addData";
    payload.username = localStorage.getItem('user_username');
    offlineQueue.push({ id: Date.now(), payload: payload });
    localStorage.setItem('fs_queue', JSON.stringify(offlineQueue));
    let data = getHydratedData(); data.push(payload); localStorage.setItem('all_app_data', JSON.stringify(data));
    showNotif(msg);
    processQueue();
}

async function syncAllData(showManualMsg = false) {
    if(!navigator.onLine) return;
    if(showManualMsg) showNotif("Menyinkronkan...");
    try {
        const res = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: "syncAll", username: localStorage.getItem('user_username') }) });
        const result = await res.json();
        if (result.status === 'success') {
            localStorage.setItem('all_app_data', JSON.stringify(result.data));
            if(showManualMsg) showNotif("Selesai!");
        }
    } catch(e) {}
}

// ==========================================
// KALENDER (KILAT BIRU FIXED)
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

        let absen = dataLokal.find(d => d.kategori === "Absensi" && d.tanggal && d.tanggal.startsWith(dStr));
        let badge = absen ? `<div class="mt-1 w-full"><span class="block text-[6px] text-white bg-green-500 rounded px-1 truncate">${absen.status_treatment}</span></div>` : "";

        grid.innerHTML += `
            <div onclick="selectCalDate('${dStr}', this)" class="p-1 rounded-xl ${bgClass} ${textColor} min-h-[55px] flex flex-col items-center overflow-hidden transition-all duration-200">
                <span class="text-xs font-bold mt-1">${i}</span>
                ${badge}
            </div>`;
    }
}

function selectCalDate(dStr, element) { 
    if(!isEditAbsenMode) return; 
    
    // Animasi Kilat Biru (Pasti Terlihat)
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
// NOTIFIKASI PREMIUM
// ==========================================
function showNotif(msg, type = "success") {
    const container = document.getElementById('successNotif');
    const box = document.getElementById('notifBox');
    const msgEl = document.getElementById('successMsg');
    const bar = document.getElementById('notifProgressBar');

    bar.style.transition = 'none'; bar.style.width = '100%';
    if (type === "error") box.classList.replace('notif-success', 'notif-error');
    else box.classList.replace('notif-error', 'notif-success');

    msgEl.innerText = msg;
    container.classList.add('notif-active');

    setTimeout(() => { bar.style.transition = 'width 3s linear'; bar.style.width = '0%'; }, 10);
    setTimeout(() => { container.classList.remove('notif-active'); }, 3000);
}

// FUNGSI STANDAR (Login, Simpan, dll)
async function login() {
    const user = document.getElementById('loginUser').value.toLowerCase().trim();
    const pass = document.getElementById('loginPass').value;
    try {
        const res = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: "login", username: user, password: pass }) });
        const result = await res.json();
        if(result.status === 'success') { 
            localStorage.setItem('user_username', result.data.username);
            localStorage.setItem('user_nama_lengkap', result.data.nama_lengkap);
            showPage('mainPage');
        } else showNotif(result.message, "error");
    } catch (e) { showNotif("Server Error", "error"); }
}

async function register() {
    const payload = {
        action: "register", username: document.getElementById('regUser').value, password: document.getElementById('regPass').value,
        nama_lengkap: document.getElementById('regName').value, jk: document.getElementById('regGender').value,
        tgl_lahir: document.getElementById('regDate').value, alamat: document.getElementById('regAddress').value
    };
    try { 
        const res = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) }); 
        const result = await res.json(); if(result.status === 'success') showPage('loginPage');
    } catch (e) {}
}

function showPage(id) {
    document.querySelectorAll('.page-section').forEach(p => p.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    if(id === 'mainPage') document.getElementById('welcomeName').innerText = localStorage.getItem('user_nama_lengkap');
    if(id === 'absenPage') renderCalendar();
}

function simpanCatatan() {
    addToQueueAndRun({ kategori: "Kerja", tanggal: document.getElementById('kerjaDate').value, lokasi: document.getElementById('kerjaLokasi').value, status_treatment: document.getElementById('kerjaTreatment').value, durasi_nominal: document.getElementById('kerjaDurasi').value }, "Data Kerja Disimpan");
    showPage('mainPage');
}

function hitungGajiLocal() {
    let t = 0; getHydratedData().forEach(d => { if(d.kategori==="Kerja") t += parseFloat(d.durasi_nominal)*21000; });
    document.getElementById('uiGajiBersih').innerText = "Rp " + t.toLocaleString();
    document.getElementById('slipGajiContainer').classList.remove('hidden');
}

function downloadPDF() { html2pdf().from(document.getElementById('pdfPrintArea')).save(); }
function doLogout() { localStorage.clear(); showPage('loginPage'); }
function showAccount() { showPage('accountViewPage'); document.getElementById('viewName').innerText = localStorage.getItem('user_nama_lengkap'); document.getElementById('viewUser').innerText = localStorage.getItem('user_username'); }
function closeManualAbsenModal() { document.getElementById('manualAbsenModal').classList.add('hidden'); }
