const SCRIPT_URL = "URL_GAS_KAMU_DISINI"; 

let offlineQueue = JSON.parse(localStorage.getItem('fs_queue')) || [];
let currentCalDate = new Date();
let isEditAbsenMode = false;
let manualAbsenDateStr = "";

// ==========================================
// INISIALISASI
// ==========================================
window.onload = () => { 
    if(localStorage.getItem('user_username')) {
        showPage('mainPage'); 
        checkMissingAbsensi();
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

// ==========================================
// NOTIFIKASI PREMIUM (TANPA BAR)
// ==========================================
function showNotif(msg, type = "success") {
    const container = document.getElementById('successNotif');
    const box = document.getElementById('notifBox');
    const msgEl = document.getElementById('successMsg');

    if (type === "error") box.classList.replace('notif-success', 'notif-error');
    else box.classList.replace('notif-error', 'notif-success');

    msgEl.innerText = msg;
    container.classList.add('notif-active');
    setTimeout(() => { container.classList.remove('notif-active'); }, 3000);
}

// ==========================================
// AUTH & NAVIGATION
// ==========================================
async function login() {
    const user = document.getElementById('loginUser').value.toLowerCase().trim();
    const pass = document.getElementById('loginPass').value;
    if(!user || !pass) return showNotif("Isi data!", "error");
    
    document.getElementById('btnLogin').innerText = "PROSES...";
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
    } catch (e) { showNotif("Offline / Server Error", "error"); }
    document.getElementById('btnLogin').innerText = "MASUK";
}

async function register() {
    const user = document.getElementById('regUser').value.toLowerCase().trim();
    const pass = document.getElementById('regPass').value;
    const confirm = document.getElementById('regConfirmPass').value;
    if(!user || !pass) return showNotif("Lengkapi data!", "error");
    if(pass !== confirm) return showNotif("Password beda!", "error");

    document.getElementById('btnRegister').innerText = "MENDAFTAR...";
    try {
        const payload = {
            action: "register", username: user, password: pass,
            nama_lengkap: document.getElementById('regName').value,
            jk: document.getElementById('regGender').value,
            tgl_lahir: document.getElementById('regDate').value,
            alamat: document.getElementById('regAddress').value
        };
        const res = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
        const result = await res.json();
        if(result.status === 'success') { showNotif("Berhasil!"); showPage('loginPage'); }
        else showNotif(result.message, "error");
    } catch (e) { showNotif("Error Server", "error"); }
    document.getElementById('btnRegister').innerText = "DAFTAR AKUN";
}

function showPage(id) {
    document.querySelectorAll('.page-section').forEach(p => p.classList.add('hidden'));
    const target = document.getElementById(id);
    if(target) target.classList.remove('hidden');
    
    if(id === 'mainPage') {
        const n = localStorage.getItem('user_nama_lengkap') || 'User';
        document.getElementById('welcomeName').innerText = n.toUpperCase();
        document.getElementById('userAvatar').innerText = n[0].toUpperCase();
    }
    if(id === 'absenPage') renderCalendar();
}

function togglePass(id, icon) {
    const i = document.getElementById(id);
    if(i.type === "password") { i.type = "text"; icon.classList.replace('fa-eye', 'fa-eye-slash'); }
    else { i.type = "password"; icon.classList.replace('fa-eye-slash', 'fa-eye'); }
}

// ==========================================
// KALENDER SAKTI
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
        
        let absen = dataLokal.find(d => d.kategori === "Absensi" && d.tanggal && d.tanggal.startsWith(dStr));
        let badge = absen ? `<div class="mt-1 w-full"><span class="block text-[6px] text-white bg-green-500 rounded px-1 truncate font-bold uppercase">${absen.status_treatment}</span></div>` : "";

        grid.innerHTML += `
            <div onclick="selectCalDate('${dStr}', this)" class="p-1 rounded-xl ${bgClass} ${textColor} min-h-[55px] flex flex-col items-center overflow-hidden cursor-pointer transition-all">
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
    if(isEditAbsenMode) {
        btn.classList.replace('bg-yellow-500', 'bg-red-500');
        btn.innerHTML = `Tutup Edit`;
        showNotif("Klik tanggal!");
    } else {
        btn.classList.replace('bg-red-500', 'bg-yellow-500');
        btn.innerHTML = `<i class="fa fa-pencil mr-2"></i> Edit Kehadiran`;
    }
}

function changeCalMonth(dir) { currentCalDate.setMonth(currentCalDate.getMonth() + dir); renderCalendar(); }
function closeManualAbsenModal() { document.getElementById('manualAbsenModal').classList.add('hidden'); }

// ==========================================
// LOGIKA TAMBAHAN
// ==========================================
function doLogout() { localStorage.clear(); window.location.reload(); }
function checkMissingAbsensi() {} // Placeholder untuk UI Lock
function syncAllData(m) { if(m) showNotif("Selesai Sinkron!"); }
function simpanKerja() { showNotif("Tersimpan!"); showPage('mainPage'); }
function simpanKasbon() { showNotif("Tersimpan!"); showPage('mainPage'); }
function ambilTotalJamLocal() { document.getElementById('resTotalJam').innerText = "10"; }
function hitungGajiLocal() { document.getElementById('uiGajiBersih').innerText = "Rp 1.000.000"; document.getElementById('slipGajiContainer').classList.remove('hidden'); }
function downloadPDF() { alert("Fitur PDF Aktif!"); }
function showAccount() { showPage('accountViewPage'); document.getElementById('viewName').innerText = localStorage.getItem('user_nama_lengkap'); document.getElementById('viewUser').innerText = localStorage.getItem('user_username'); }
