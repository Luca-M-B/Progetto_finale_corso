const API_BASE = 'http://localhost:8080';
//const API_BASE = 'http://localhost:8080';

// App State
let appState = {
    token: localStorage.getItem('token') || null,
    username: localStorage.getItem('username') || null,
    currentView: 'auth'
};

// DOM Elements
const views = {
    auth: document.getElementById('auth-view'),
    dashboard: document.getElementById('dashboard-view')
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    checkAuthState();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);

    const vForm = document.getElementById('add-vehicle-form');
    if (vForm) {
        vForm.addEventListener('submit', handleAddVehicle);
    }
}

// Authentication Logic
function checkAuthState() {
    if (appState.token) {
        showView('dashboard');
        document.getElementById('display-username').textContent = appState.username || 'Utente';
        loadSection('dashboard');
    } else {
        showView('auth');
    }
}

function showView(viewId) {
    Object.values(views).forEach(v => v.classList.remove('active'));
    if (views[viewId]) views[viewId].classList.add('active');
}

function switchAuthTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));

    document.getElementById(`tab-${tab}`).classList.add('active');
    document.getElementById(`${tab}-form`).classList.add('active');
}

async function handleLogin(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Attendere...';

    try {
        const payload = {
            username: document.getElementById('login-username').value,
            password: document.getElementById('login-password').value
        };

        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error('Credenziali non valide');

        const data = await res.json();

        // Update State
        appState.token = data.token;
        appState.username = payload.username;
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', payload.username);

        showToast('Login effettuato con successo!', 'success');
        checkAuthState();

    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.innerHTML = 'Accedi <i class="fa-solid fa-arrow-right"></i>';
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Registrazione...';

    try {
        const payload = {
            username: document.getElementById('reg-username').value,
            password: document.getElementById('reg-password').value,
            subscriptionType: document.getElementById('reg-subscription').value
        };

        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(errText || 'Errore durante la registrazione');
        }

        showToast('Registrazione completata! Ora puoi fare login.', 'success');
        switchAuthTab('login');

    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.innerHTML = 'Registrati <i class="fa-solid fa-user-plus"></i>';
    }
}

function logout() {
    // Optionally call logout endpoint
    appState.token = null;
    appState.username = null;
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    checkAuthState();
}

// Navigation & Data Loading
function loadSection(section) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const btn = document.querySelector(`button[onclick="loadSection('${section}')"]`);
    if (btn) btn.classList.add('active');

    const pageTitle = document.getElementById('page-title');
    // Nascondi tutte le sezioni content
    ['vehicles-section', 'subscriptions-section'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    switch (section) {
        case 'dashboard':
            pageTitle.textContent = 'Dashboard Overview';
            document.querySelector('.dashboard-stats').classList.remove('hidden');
            fetchDashboardStats();
            break;
        case 'vehicles':
            pageTitle.textContent = 'Gestione Veicoli';
            document.querySelector('.dashboard-stats').classList.add('hidden');
            document.getElementById('vehicles-section').classList.remove('hidden');
            fetchVehicles();
            break;
        case 'subscriptions':
            pageTitle.textContent = 'I Miei Abbonamenti';
            document.querySelector('.dashboard-stats').classList.add('hidden');
            document.getElementById('subscriptions-section').classList.remove('hidden');
            fetchSubscriptions();
            break;
        default:
            pageTitle.textContent = section.charAt(0).toUpperCase() + section.slice(1);
            document.querySelector('.dashboard-stats').classList.add('hidden');
            break;
    }
}

function fetchData() {
    // Reloads current active section
    const activeNav = document.querySelector('.nav-item.active').getAttribute('onclick');
    if (activeNav) {
        eval(activeNav);
    }
}

// API Calls
async function fetchWithAuth(url, options = {}) {
    if (!appState.token) {
        logout();
        throw new Error('Non autenticato');
    }

    const headers = {
        'Authorization': `Bearer ${appState.token}`,
        'Content-Type': 'application/json',
        ...options.headers
    };

    const response = await fetch(`${API_BASE}${url}`, { ...options, headers });

    if (response.status === 401 || response.status === 403) {
        logout();
        throw new Error('Sessione scaduta o accesso negato');
    }

    return response;
}

async function fetchDashboardStats() {
    // Mocking stats for the UI, but here we could fetch aggregated data
    try {
        const [vehiclesRes, reservationsRes] = await Promise.all([
            fetchWithAuth('/api/vehicles'),
            fetchWithAuth('/api/reservations').catch(() => ({ json: () => [] })) // fallbacks if endpoint fails
        ]);

        const vehicles = await vehiclesRes.json();
        let reservations = [];
        try { reservations = await reservationsRes.json(); } catch (e) { }

        document.getElementById('stat-vehicles').textContent = vehicles.length || 0;
        document.getElementById('stat-reservations').textContent = reservations.length || 0;
    } catch (e) {
        console.error('Error fetching stats:', e);
    }
}

async function fetchVehicles() {
    const grid = document.getElementById('vehicles-grid');
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center;"><i class="fa-solid fa-spinner fa-spin fa-2x"></i></div>';

    try {
        const res = await fetchWithAuth('/api/vehicles');
        const vehicles = await res.json();

        if (vehicles.length === 0) {
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; color: var(--text-muted)">Nessun veicolo trovato. Aggiungine uno.</div>';
            return;
        }

        grid.innerHTML = vehicles.map(v => `
            <div class="stat-card glass-panel" style="flex-direction: column; align-items: flex-start; gap: 0.5rem; justify-content:center;">
                <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
                    <div class="stat-icon" style="width:40px; height:40px; font-size:1.2rem;"><i class="fa-solid fa-car"></i></div>
                    <span style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px; font-size: 0.8rem">${v.targa || 'N/A'}</span>
                </div>
                <h3 style="color: #fff; font-size:1.1rem; margin-top: 0.5rem;">${v.modello || 'Modello Sconosciuto'}</h3>
                <p style="font-size: 0.85rem; color: var(--text-muted);">Tipo: ${v.tipo || 'Auto'}</p>
                <div style="display:flex; gap: 10px; margin-top: 1rem; width: 100%">
                    <button class="btn-primary" style="flex:1; padding: 0.4rem; font-size:0.85rem; background: rgba(255,255,255,0.1); color: #fff"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn-primary" style="flex:1; padding: 0.4rem; font-size:0.85rem; background: var(--danger);"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        grid.innerHTML = `<div style="grid-column: 1/-1; color: var(--danger);">${err.message}</div>`;
    }
}

// UI Utilities
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-check-circle';
    if (type === 'error') icon = 'fa-exclamation-circle';

    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Modal Control - Add Vehicle
function openAddVehicleModal() {
    document.getElementById('vehicle-modal').style.display = 'flex';
}

function closeAddVehicleModal() {
    document.getElementById('vehicle-modal').style.display = 'none';
    document.getElementById('add-vehicle-form').reset();
}

async function handleAddVehicle(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Salvataggio...';

    try {
        const payload = {
            targa: document.getElementById('veh-targa').value,
            modello: document.getElementById('veh-modello').value,
            tipo: document.getElementById('veh-tipo').value
        };

        const res = await fetchWithAuth('/api/vehicles', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error('Errore nel salvataggio del veicolo');

        showToast('Veicolo aggiunto con successo!', 'success');
        closeAddVehicleModal();
        fetchVehicles(); // Reload vehicles

    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.innerHTML = 'Salva';
    }
}


// ───────────── GATE: CHECK-IN ─────────────
async function handleGateCheckIn() {
    const plate = document.getElementById('gate-plate').value.trim();
    const type  = document.getElementById('gate-type').value;
    const disability = document.getElementById('gate-disability').checked;

    if (!plate) { showToast('Inserisci la targa', 'error'); return; }

    try {
        const res = await fetch(`${API_BASE}/api/gate/check-in`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ licensePlate: plate, vehicleType: type, hasDisability: disability })
        });
        const data = await res.json();

        if (data.success) {
            showCheckInResult(data);
            document.getElementById('gate-plate').value = '';
            document.getElementById('gate-disability').checked = false;
        } else {
            showToast(data.message || 'Errore durante il check-in', 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function showCheckInResult(data) {
    // Mostra un pannello risultato con QR e posto assegnato
    const existing = document.getElementById('checkin-result');
    if (existing) existing.remove();

    const entryTime = data.entryTime ? new Date(data.entryTime).toLocaleTimeString('it-IT') : new Date().toLocaleTimeString('it-IT');
    const div = document.createElement('div');
    div.id = 'checkin-result';
    div.style.cssText = 'background:rgba(72,219,152,0.15); border:1px solid rgba(72,219,152,0.4); border-radius:12px; padding:1.2rem; margin-top:1rem; text-align:center;';
    div.innerHTML = `
        <i class="fa-solid fa-circle-check" style="font-size:2rem; color:#48db98; margin-bottom:0.5rem;"></i>
        <h4 style="color:#48db98; margin-bottom:0.8rem;">Check-in Effettuato!</h4>
        <div style="background:rgba(0,0,0,0.3); border-radius:8px; padding:0.8rem; margin-bottom:0.8rem;">
            <p style="margin:0.2rem 0;"><strong>Piano:</strong> ${data.floorLevel ?? 'N/A'}</p>
            <p style="margin:0.2rem 0;"><strong>Posto:</strong> ${data.spotCode ?? 'N/A'}</p>
            <p style="margin:0.2rem 0;"><strong>Orario ingresso:</strong> ${entryTime}</p>
        </div>
        <p style="font-size:0.78rem; color:var(--text-muted); margin-bottom:0.4rem;">Token QR per il check-out:</p>
        <div style="background:rgba(0,0,0,0.4); border-radius:8px; padding:0.6rem; word-break:break-all; font-family:monospace; font-size:0.75rem; color:#fff; margin-bottom:0.8rem;">${data.qrCode}</div>
        <button onclick="document.getElementById('checkin-result').remove()" style="font-size:0.8rem; background:transparent; border:1px solid rgba(255,255,255,0.2); color:#fff; padding:0.4rem 1rem; border-radius:6px; cursor:pointer;">Chiudi</button>
    `;
    document.getElementById('gate-checkin-section').appendChild(div);
    showToast('Check-in completato! Posto: ' + (data.spotCode ?? 'N/A'), 'success');
}

// ───────────── GATE: CHECK-OUT ─────────────
let activeCheckoutData = null;

async function handleTicketScan() {
    const qr    = document.getElementById('gate-out-qr').value.trim();
    const plate = document.getElementById('gate-out-plate') 
                  ? document.getElementById('gate-out-plate').value.trim() 
                  : '';

    if (!qr)    { showToast('Inserisci il Token QR', 'error'); return; }
    if (!plate) { showToast('Inserisci la targa', 'error'); return; }

    try {
        const res = await fetch(`${API_BASE}/api/gate/check-out`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ qrCode: qr, licensePlate: plate })
        });
        const data = await res.json();

        if (res.ok && data.success) {
            activeCheckoutData = data;
            showPaymentPage(data);
        } else {
            showToast(data.message || 'Errore lettura ticket', 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function showPaymentPage(data) {
    document.getElementById('scan-ticket-step').style.display = 'none';
    document.getElementById('pay-ticket-step').style.display = 'block';

    const fmt = (dt) => dt ? new Date(dt).toLocaleTimeString('it-IT', {hour:'2-digit', minute:'2-digit'}) : '--';
    const entryT = fmt(data.entryTime);
    const exitT  = fmt(data.exitTime);

    // Calcola durata
    let durationStr = '--';
    if (data.entryTime && data.exitTime) {
        const diffMs = new Date(data.exitTime) - new Date(data.entryTime);
        const mins   = Math.floor(diffMs / 60000);
        const h      = Math.floor(mins / 60);
        const m      = mins % 60;
        durationStr  = h > 0 ? `${h}h ${m}min` : `${m} min`;
    }

    document.getElementById('ticket-spot').textContent     = data.spotCode ?? 'N/A';
    document.getElementById('ticket-duration').textContent = durationStr;
    document.getElementById('ticket-price').textContent    = data.amountDue != null
        ? `€ ${data.amountDue.toFixed(2)}`
        : 'N/D';

    // Aggiungi dettagli orari se gli elementi esistono
    const entryEl = document.getElementById('ticket-entry-time');
    const exitEl  = document.getElementById('ticket-exit-time');
    if (entryEl) entryEl.textContent = entryT;
    if (exitEl)  exitEl.textContent  = exitT;
}

function resetCheckOutFlow() {
    activeCheckoutData = null;
    document.getElementById('gate-out-qr').value = '';
    if (document.getElementById('gate-out-plate')) {
        document.getElementById('gate-out-plate').value = '';
    }
    document.getElementById('scan-ticket-step').style.display = 'block';
    document.getElementById('pay-ticket-step').style.display = 'none';
}

async function handlePayAndLeave() {
    // Il check-out è già avvenuto – mostriamo solo il riepilogo pagamento
    if (!activeCheckoutData) return;
    const amount = activeCheckoutData.amountDue ?? 0;
    showToast(`Pagamento di €${amount.toFixed(2)} confermato. Buona giornata!`, 'success');
    setTimeout(() => {
        alert(`✅ Pagamento confermato!\n\nImporto: €${amount.toFixed(2)}\nSbarra aperta — Arrivederci!`);
        resetCheckOutFlow();
    }, 500);
}
