const API_BASE = 'http://localhost:8082';

// Storage Helper
const storage = {
    get: (key) => localStorage.getItem(key) || sessionStorage.getItem(key),
    set: (key, value, remember) => {
        if (remember) localStorage.setItem(key, value);
        else sessionStorage.setItem(key, value);
    },
    clear: (key) => {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
    }
};

// App State
let appState = {
    isLoggedIn: storage.get('isLoggedIn') === 'true',
    username: storage.get('username') || null,
    role: storage.get('role') || null,
    hasActiveSubscription: false,
    activeSubscriptionVehicleType: null, // Tipo veicolo dell'abbonamento attivo
    currentView: 'auth'
};

// License Plate Validation (Differentiated by type)
function isValidPlate(plate, type = 'CAR') {
    const cleanPlate = plate.replace(/[\s\-]/g, '').toUpperCase();
    
    if (type === 'MOTORBIKE') {
        // Moto: Spesso più corte (5-7 caratteri)
        return /^[A-Z0-9]{5,7}$/.test(cleanPlate);
    } else {
        // Auto: Standard europeo (7-10 caratteri)
        return /^[A-Z0-9]{7,10}$/.test(cleanPlate);
    }
}

// DOM Elements
const views = {
    auth: document.getElementById('auth-view'),
    dashboard: document.getElementById('dashboard-view')
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    restoreSavedCredentials();
    checkAuthState();
    setupEventListeners();
});

function restoreSavedCredentials() {
    if (localStorage.getItem('rememberMe') === 'true') {
        const userIn = document.getElementById('login-username');
        const passIn = document.getElementById('login-password');
        const rememberCheck = document.getElementById('login-remember');
        if (userIn) userIn.value = localStorage.getItem('savedUsername') || '';
        if (passIn) passIn.value = localStorage.getItem('savedPassword') || '';
        if (rememberCheck) rememberCheck.checked = true;
    }
}

function setupEventListeners() {
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);

    const vForm = document.getElementById('add-vehicle-form');
    if (vForm) vForm.addEventListener('submit', handleAddVehicle);

    const sForm = document.getElementById('subscription-form');
    if (sForm) sForm.addEventListener('submit', handlePurchaseSubscription);
}

// Authentication Logic
function checkAuthState() {
    if (appState.isLoggedIn || appState.username) {
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
            credentials: 'include',
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error('Credenziali non valide');
        const data = await res.json();

        appState.isLoggedIn = true;
        appState.username = data.username;
        appState.role = data.role || 'USER';
        appState.hasActiveSubscription = !!data.hasActiveSubscription;
        appState.activeSubscriptionVehicleType = data.activeSubscriptionVehicleType || 'CAR';
        
        const remember = document.getElementById('login-remember').checked;
        storage.set('isLoggedIn', 'true', remember);
        storage.set('username', data.username, remember);
        storage.set('role', appState.role, remember);

        if (remember) {
            localStorage.setItem('savedUsername', document.getElementById('login-username').value);
            localStorage.setItem('savedPassword', document.getElementById('login-password').value);
            localStorage.setItem('rememberMe', 'true');
        } else {
            localStorage.removeItem('savedUsername');
            localStorage.removeItem('savedPassword');
            localStorage.removeItem('rememberMe');
        }

        document.getElementById('display-username').textContent = data.username;
        applySubscriptionUI();
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
            subscriptionType: document.getElementById('reg-subscription').value,
            vehicleType: document.getElementById('reg-vehicle-type').value
        };

        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
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

async function logout() {
    try {
        await fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
    } catch (_) { /* ignora errori di rete */ }

    appState.isLoggedIn = false;
    appState.username = null;
    appState.role = null;
    appState.hasActiveSubscription = false;
    appState.activeSubscriptionVehicleType = null;
    
    storage.clear('isLoggedIn');
    storage.clear('username');
    storage.clear('role');

    // Se "Ricordami" non è attivo, pulisci i campi. Altrimenti, caricali.
    const remember = localStorage.getItem('rememberMe') === 'true';
    const userIn = document.getElementById('login-username');
    const passIn = document.getElementById('login-password');
    const rememberCheck = document.getElementById('login-remember');

    if (!remember) {
        if (userIn) userIn.value = '';
        if (passIn) passIn.value = '';
        if (rememberCheck) rememberCheck.checked = false;
    } else {
        restoreSavedCredentials();
    }

    checkAuthState();
}

// Navigation & Data Loading
function loadSection(section) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const btn = document.querySelector(`button[onclick="loadSection('${section}')"]`);
    if (btn) btn.classList.add('active');

    const pageTitle = document.getElementById('page-title');
    const statsEl = document.querySelector('.dashboard-stats');

    // Access Control: Abbonamento obbligatorio per certe sezioni
    const restricted = ['vehicles', 'parkings', 'reservations'];
    if (restricted.includes(section) && !appState.hasActiveSubscription) {
        showToast('Accesso negato. Rinnova l\'abbonamento per accedere a questa sezione.', 'error');
        // Se l'utente prova ad andare in una sezione bloccata, lo mandiamo forzatamente su abbonamenti
        loadSection('subscriptions');
        return;
    }

    // Nascondi tutte le sezioni
    ['vehicles-section', 'subscriptions-section', 'reservations-section', 'parkings-section', 'dashboard-summary-section'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    switch (section) {
        case 'dashboard':
            pageTitle.textContent = 'Dashboard Overview';
            if (statsEl) statsEl.classList.remove('hidden');
            const summarySec = document.getElementById('dashboard-summary-section');
            if (summarySec) summarySec.classList.remove('hidden');
            fetchDashboardStats();
            break;

        case 'vehicles':
            pageTitle.textContent = 'Gestione Veicoli';
            if (statsEl) statsEl.classList.add('hidden');
            document.getElementById('vehicles-section').classList.remove('hidden');
            fetchVehicles();
            break;

        case 'subscriptions':
            pageTitle.textContent = 'I Miei Abbonamenti';
            if (statsEl) statsEl.classList.add('hidden');
            document.getElementById('subscriptions-section').classList.remove('hidden');
            fetchSubscriptions();
            break;

        case 'reservations':
            pageTitle.textContent = 'Le Mie Prenotazioni';
            if (statsEl) statsEl.classList.add('hidden');
            ensureReservationsSection();
            document.getElementById('reservations-section').classList.remove('hidden');
            fetchReservations();
            break;

        case 'parkings':
            pageTitle.textContent = 'Parcheggi Disponibili';
            if (statsEl) statsEl.classList.add('hidden');
            ensureParkingsSection();
            document.getElementById('parkings-section').classList.remove('hidden');
            fetchParkings();
            break;

        default:
            pageTitle.textContent = section.charAt(0).toUpperCase() + section.slice(1);
            if (statsEl) statsEl.classList.add('hidden');
    }
}

// Crea sezione prenotazioni dinamicamente se non esiste nell'HTML
function ensureReservationsSection() {
    if (!document.getElementById('reservations-section')) {
        const area = document.getElementById('main-content-area');
        const div = document.createElement('div');
        div.className = 'data-section mt-4 hidden';
        div.id = 'reservations-section';
        div.innerHTML = `
            <div class="section-header">
                <h3><i class="fa-solid fa-calendar-check" style="margin-right:6px;"></i>Le Mie Prenotazioni</h3>
                <button class="btn-primary btn-sm" onclick="openReservationModal()">
                    <i class="fa-solid fa-plus"></i> Nuova Prenotazione
                </button>
            </div>
            <div class="grid-container" id="reservations-grid"></div>
        `;
        area.appendChild(div);
        // Aggiungi anche il modal di prenotazione
        ensureReservationModal();
    }
}

// Crea sezione parcheggi dinamicamente
function ensureParkingsSection() {
    if (!document.getElementById('parkings-section')) {
        const area = document.getElementById('main-content-area');
        const div = document.createElement('div');
        div.className = 'data-section mt-4 hidden';
        div.id = 'parkings-section';
        div.innerHTML = `
            <div class="section-header">
                <h3><i class="fa-solid fa-square-parking" style="margin-right:6px;"></i>Parcheggi Disponibili</h3>
            </div>
            <div class="grid-container" id="parkings-grid"></div>
        `;
        area.appendChild(div);
    }
}

function fetchData() {
    const activeNav = document.querySelector('.nav-item.active');
    if (activeNav) {
        const onclick = activeNav.getAttribute('onclick');
        if (onclick) eval(onclick);
    }
}

// ─── API Helper ──────────────────────────────────────────────────────────────
async function fetchWithAuth(url, options = {}) {
    if (!appState.username && !appState.isLoggedIn) { 
        logout(); 
        throw new Error('Non autenticato'); 
    }
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    const response = await fetch(`${API_BASE}${url}`, {
        ...options,
        headers,
        credentials: 'include'   // invia automaticamente il cookie di sessione
    });

    // Se il server restituisce 401/403, andiamo comunque al login view
    if (response.status === 401 || response.status === 403) {
    if (response.status === 401 || response.status === 403) {
        appState.isLoggedIn = false;
        appState.username = null;
        appState.role = null;
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('username');
        localStorage.removeItem('role');
        showView('auth');
        throw new Error('Sessione scaduta o accesso negato');
    }
    }

    return response;
}

// ─── Dashboard Stats ─────────────────────────────────────────────────────────
async function fetchDashboardStats() {
    try {
        const vehiclesRes = await fetchWithAuth('/api/vehicles');
        const vehicles = await vehiclesRes.json();
        document.getElementById('stat-vehicles').textContent = vehicles.length || 0;

        // Recupera e mostra abbonamenti attivi in dashboard
        fetchDashboardSubscriptions();
    } catch (e) {
        console.error('Error fetching stats:', e);
    }
}

async function fetchDashboardSubscriptions() {
    const grid = document.getElementById('dashboard-subscriptions-grid');
    if (!grid) return;

    try {
        const res = await fetchWithAuth('/api/subscriptions');
        const subs = await res.json();
        const activeSubs = subs.filter(s => s.active !== false && new Date(s.endDate) > new Date());

        if (activeSubs.length === 0) {
            grid.innerHTML = '<p style="color:var(--text-muted); padding:1rem; grid-column:1/-1; text-align:center;">Nessun abbonamento attivo.</p>';
            return;
        }

        const typeLabel = { MONTHLY: 'Mensile', QUARTERLY: 'Trimestrale', YEARLY: 'Annuale' };
        const fmtDate = d => d ? new Date(d).toLocaleDateString('it-IT') : 'N/A';

        grid.innerHTML = activeSubs.map(s => `
            <div class="stat-card glass-panel" style="flex-direction:column;align-items:flex-start;gap:0.5rem;position:relative;overflow:hidden;">
                <div style="display:flex;justify-content:space-between;width:100%;align-items:center;">
                    <div class="stat-icon purple" style="width:40px;height:40px;font-size:1.2rem;">
                        <i class="fa-solid fa-id-card"></i>
                    </div>
                    <span style="background:rgba(72,219,152,0.2);color:#48db98;padding:3px 10px;border-radius:20px;font-size:0.75rem;font-weight:600;">ATTIVO</span>
                </div>
                <h3 style="color:#fff;font-size:1.1rem;margin-top:0.5rem;">
                    ${typeLabel[s.type] || s.type || 'Abbonamento'}
                </h3>
                <div style="width:100%;background:rgba(255,255,255,0.05);padding:10px;border-radius:8px;margin:5px 0;">
                    <p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:4px;">
                        <i class="fa-regular fa-calendar"></i> Scadenza: <strong>${fmtDate(s.endDate)}</strong>
                    </p>
                    <p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:4px;">
                        <i class="fa-solid fa-car-side"></i> Veicolo: <strong>${s.vehicleType || 'N/A'}</strong>
                    </p>
                    <p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:4px;">
                        <i class="fa-solid fa-map-pin"></i> Posto: <strong style="color:#63b3ed;">${s.spotCode || 'Assegnazione...'}</strong>
                    </p>
                </div>
                ${s.vehiclePlates && s.vehiclePlates.length ? `
                    <p style="font-size:0.8rem;color:#63b3ed;margin-top:5px;">
                        <i class="fa-solid fa-car"></i> Veicoli: ${s.vehiclePlates.join(', ')}
                    </p>` : ''}
            </div>
        `).join('');
    } catch (e) {
        grid.innerHTML = '<p style="color:var(--danger); padding:1rem;">Errore nel caricamento degli abbonamenti.</p>';
    }
}

// ─── Veicoli ─────────────────────────────────────────────────────────────────
async function fetchVehicles() {
    const grid = document.getElementById('vehicles-grid');
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;"><i class="fa-solid fa-spinner fa-spin fa-2x"></i></div>';

    try {
        const res = await fetchWithAuth('/api/vehicles');
        if (!res.ok) throw new Error('Errore nel caricamento veicoli');
        const vehicles = await res.json();

        if (!vehicles.length) {
            grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--text-muted)">Nessun veicolo trovato. Aggiungine uno.</div>';
            return;
        }

        grid.innerHTML = vehicles.map(v => `
            <div class="stat-card glass-panel" style="flex-direction:column;align-items:flex-start;gap:0.5rem; position:relative;">
                <div style="display:flex;justify-content:space-between;width:100%;align-items:center;">
                    <div class="stat-icon" style="width:40px;height:40px;font-size:1.2rem;background:rgba(99,179,237,0.15);">
                        <i class="fa-solid fa-car"></i>
                    </div>
                    <span style="background:rgba(255,255,255,0.1);padding:4px 8px;border-radius:4px;font-size:0.85rem;font-weight:600;letter-spacing:0.05em;">
                        ${v.targa}
                    </span>
                </div>
                <h3 style="color:#fff;font-size:1rem;margin:0.5rem 0 0.2rem 0;">Tipo: ${v.tipo}</h3>
                
                <div style="display:flex;gap:10px;margin-top:1rem;width:100%;">
                    <button class="btn-primary" style="flex:1;padding:0.4rem;font-size:0.85rem;background:rgba(255,255,255,0.1);color:#fff;"
                        onclick='openEditVehicleModal(${JSON.stringify(v).replace(/"/g, '&quot;')})'>
                        <i class="fa-solid fa-pen"></i> Modifica
                    </button>
                    <button class="btn-primary" style="flex:1;padding:0.4rem;font-size:0.85rem;background:var(--danger);"
                        onclick="deleteVehicle(${v.id})">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        grid.innerHTML = `<div style="grid-column:1/-1;color:var(--danger);">${err.message}</div>`;
    }
}

function openAddVehicleModal() {
    const modal = document.getElementById('vehicle-modal');
    modal.querySelector('h2').textContent = 'Aggiungi Veicolo';
    const form = document.getElementById('add-vehicle-form');
    form.reset();
    form.dataset.editId = '';
    modal.style.display = 'flex';
}

function openEditVehicleModal(v) {
    const modal = document.getElementById('vehicle-modal');
    modal.querySelector('h2').textContent = 'Modifica Veicolo';
    const form = document.getElementById('add-vehicle-form');
    form.dataset.editId = v.id;
    document.getElementById('veh-targa').value = v.targa;
    modal.style.display = 'flex';
}

function closeAddVehicleModal() {
    document.getElementById('vehicle-modal').style.display = 'none';
    document.getElementById('add-vehicle-form').reset();
    document.getElementById('add-vehicle-form').dataset.editId = '';
}

async function handleAddVehicle(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const editId = e.target.dataset.editId;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Salvataggio...';

    const vType = appState.activeSubscriptionVehicleType || 'CAR';
    const targaRaw = document.getElementById('veh-targa').value.trim();
    if (!isValidPlate(targaRaw, vType)) {
        showToast(`Targa non valida per il tipo ${vType}.`, 'error');
        return;
    }

    try {
        const payload = {
            targa: targaRaw.toUpperCase().replace(/[\s\-]/g, ''),
            tipo: vType
        };

        let res;
        if (editId) {
            res = await fetchWithAuth(`/api/vehicles/${editId}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
        } else {
            res = await fetchWithAuth('/api/vehicles', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        }

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(errText || 'Errore nel salvataggio del veicolo');
        }

        showToast(editId ? 'Veicolo aggiornato!' : 'Veicolo aggiunto con successo!', 'success');
        closeAddVehicleModal();
        fetchVehicles();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.innerHTML = 'Salva';
    }
}

async function deleteVehicle(id) {
    if (!confirm('Sei sicuro di voler eliminare questo veicolo?')) return;
    try {
        const res = await fetchWithAuth(`/api/vehicles/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Errore durante eliminazione');
        showToast('Veicolo eliminato', 'success');
        fetchVehicles();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ─── Abbonamenti ─────────────────────────────────────────────────────────────
async function fetchSubscriptions() {
    const grid = document.getElementById('subscriptions-grid');
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;"><i class="fa-solid fa-spinner fa-spin fa-2x"></i></div>';

    try {
        const res = await fetchWithAuth('/api/subscriptions');
        if (!res.ok) throw new Error('Errore nel caricamento abbonamenti');
        const subs = await res.json();

        if (!subs.length) {
            grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--text-muted)">Nessun abbonamento attivo. Acquistane uno.</div>';
            return;
        }

        const typeLabel = { MONTHLY: 'Mensile', QUARTERLY: 'Trimestrale', YEARLY: 'Annuale' };
        const fmtDate = d => d ? new Date(d).toLocaleDateString('it-IT') : 'N/A';

        // Aggiorna lo stato globale in base agli abbonamenti ricevuti
        const activeSub = subs.find(s => s.active !== false && new Date(s.endDate) > new Date());
        appState.hasActiveSubscription = !!activeSub;
        appState.activeSubscriptionVehicleType = activeSub ? activeSub.vehicleType : 'CAR'; // Default CAR se senza abbonamento
        
        applySubscriptionUI();

        grid.innerHTML = subs.map(s => {
            const isActive = s.active !== false && new Date(s.endDate) > new Date();
            const badge = isActive
                ? `<span style="background:rgba(72,219,152,0.2);color:#48db98;padding:3px 10px;border-radius:20px;font-size:0.75rem;font-weight:600;">ATTIVO</span>`
                : `<span style="background:rgba(255,99,132,0.2);color:#ff6384;padding:3px 10px;border-radius:20px;font-size:0.75rem;font-weight:600;">SCADUTO</span>`;

            const endDate = new Date(s.endDate);
            const today = new Date();
            const diffTime = endDate - today;
            const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

            return `
                <div class="stat-card glass-panel" style="flex-direction:column;align-items:flex-start;gap:0.5rem;position:relative;overflow:hidden;">
                    <div style="display:flex;justify-content:space-between;width:100%;align-items:center;">
                        <div class="stat-icon purple" style="width:40px;height:40px;font-size:1.2rem;">
                            <i class="fa-solid fa-id-card"></i>
                        </div>
                        ${badge}
                    </div>
                    <h3 style="color:#fff;font-size:1.1rem;margin-top:0.5rem;">
                        ${typeLabel[s.type] || s.type || 'Abbonamento'}
                    </h3>
                    <div style="width:100%;background:rgba(255,255,255,0.05);padding:10px;border-radius:8px;margin:5px 0;">
                        <p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:4px;">
                            <i class="fa-regular fa-calendar"></i> Scadenza: <strong>${fmtDate(s.endDate)}</strong>
                        </p>
                        <p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:4px;">
                            <i class="fa-solid fa-car-side"></i> Veicolo: <strong>${s.vehicleType || 'N/A'}</strong>
                        </p>
                        <p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:4px;">
                            <i class="fa-solid fa-map-pin"></i> Posto: <strong style="color:#63b3ed;">${s.spotCode || 'Assegnazione...'}</strong>
                        </p>
                        <p style="font-size:0.9rem;color:${isActive ? '#48db98' : '#ff6384'};font-weight:600;">
                            <i class="fa-solid fa-hourglass-half"></i> ${isActive ? `${daysRemaining} giorni rimanenti` : 'Abbonamento scaduto'}
                        </p>
                    </div>
                    ${s.vehiclePlates && s.vehiclePlates.length ? `
                        <p style="font-size:0.8rem;color:#63b3ed;margin-top:5px;">
                            <i class="fa-solid fa-car"></i> Veicoli: ${s.vehiclePlates.join(', ')}
                        </p>` : ''}
                    <div style="display:flex;gap:8px;width:100%;margin-top:0.8rem;align-items:center;">
                        ${s.qrCode ? `
                            <button class="btn-primary" style="flex:1;font-size:0.85rem;background:rgba(99,179,237,0.15);padding:8px 4px;"
                                onclick='openSubDetailModal(${JSON.stringify(s)})'>
                                <i class="fa-solid fa-qrcode"></i> QR
                            </button>` : ''}
                        <button class="btn-primary btn-accent" style="flex:1;font-size:0.85rem;padding:8px 4px;"
                            onclick='openSubscriptionModal()'>
                            <i class="fa-solid fa-rotate"></i> Rinnova
                        </button>
                        ${!isActive ? `
                        <button class="btn-primary" style="width:40px;height:36px;flex-shrink:0;background:rgba(239,68,68,0.15);color:var(--danger);border-color:transparent;display:flex;align-items:center;justify-content:center;"
                            onclick='deleteSubscription(${s.id})' title="Sposta nel cestino">
                            <i class="fa-solid fa-trash"></i>
                        </button>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        grid.innerHTML = `<div style="grid-column:1/-1;color:var(--danger);">${err.message}</div>`;
    }
}

async function deleteSubscription(id) {
    if (!confirm('Vuoi spostare questo abbonamento scaduto nel cestino?')) return;
    try {
        const res = await fetch(`${API_BASE}/api/subscriptions/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.message || 'Errore durante l\'eliminazione');
        }
        showToast('Abbonamento spostato nel cestino', 'success');
        fetchSubscriptions();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function openBinModal() {
    document.getElementById('bin-modal').style.display = 'flex';
    fetchBinSubscriptions();
}

function closeBinModal() {
    document.getElementById('bin-modal').style.display = 'none';
}

async function fetchBinSubscriptions() {
    const grid = document.getElementById('bin-grid');
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;"><i class="fa-solid fa-spinner fa-spin fa-2x"></i></div>';
    
    try {
        const res = await fetch(`${API_BASE}/api/subscriptions/deleted`, { credentials: 'include' });
        const subs = await res.json();
        
        if (subs.length === 0) {
            grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--text-muted);">Il cestino è vuoto</div>';
            return;
        }

        const typeLabel = { 'MONTHLY': 'Mensile', 'QUARTERLY': 'Trimestrale', 'YEARLY': 'Annuale' };
        const fmtDate = d => d ? new Date(d).toLocaleDateString('it-IT') : '—';

        grid.innerHTML = subs.map(s => `
            <div class="stat-card glass-panel" style="flex-direction:column;align-items:flex-start;gap:0.5rem;border-color:rgba(239,68,68,0.2);">
                <h3 style="color:#fff;font-size:1rem;margin:0;">${typeLabel[s.type] || s.type}</h3>
                <p style="font-size:0.75rem;color:var(--text-muted);margin:0;">
                    Scaduto il: <strong>${fmtDate(s.endDate)}</strong>
                </p>
                <div style="display:flex;gap:8px;width:100%;margin-top:0.5rem;">
                    <button class="btn-primary" style="flex:1;font-size:0.75rem;background:rgba(72,219,152,0.1);color:#48db98;border-color:#48db98;"
                        onclick='restoreSubscription(${s.id})'>
                        <i class="fa-solid fa-rotate-left"></i> Ripristina
                    </button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        grid.innerHTML = `<div style="grid-column:1/-1;color:var(--danger);">${err.message}</div>`;
    }
}

async function restoreSubscription(id) {
    try {
        const res = await fetch(`${API_BASE}/api/subscriptions/${id}/restore`, {
            method: 'POST',
            credentials: 'include'
        });
        if (!res.ok) throw new Error('Errore durante il ripristino');
        showToast('Abbonamento ripristinato', 'success');
        fetchBinSubscriptions();
        fetchSubscriptions();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ─── Modal Acquisto Abbonamento ───────────────────────────────────────────────
async function openSubscriptionModal() {
    console.log("Opening subscription modal...");
    const modal = document.getElementById('subscription-modal');
    if (!modal) {
        console.error("Modal 'subscription-modal' not found!");
        return;
    }
    modal.style.display = 'flex';
    document.getElementById('subscription-form').classList.add('active');

    const listEl = document.getElementById('sub-vehicles-list');
    if (listEl) {
        listEl.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;"><i class="fa-solid fa-spinner fa-spin"></i> Caricamento veicoli...</p>';
    }

    try {
        const res = await fetchWithAuth('/api/vehicles');
        if (!res.ok) throw new Error();
        const vehicles = await res.json();

        if (!vehicles.length) {
            listEl.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">Nessun veicolo disponibile. Aggiungine uno prima.</p>';
            return;
        }

        listEl.innerHTML = vehicles.map(v => `
            <label style="display:flex;align-items:center;gap:0.6rem;background:rgba(255,255,255,0.05);padding:0.5rem 0.8rem;border-radius:8px;cursor:pointer;">
                <input type="checkbox" name="sub-vehicle" value="${v.id}" style="width:auto;">
                <span><strong>${v.targa}</strong> — ${v.modello} (${v.tipo})</span>
            </label>
        `).join('');
    } catch {
        listEl.innerHTML = '<p style="color:var(--danger);font-size:0.85rem;">Errore caricamento veicoli.</p>';
    }
}

function closeSubscriptionModal() {
    document.getElementById('subscription-modal').style.display = 'none';
    document.getElementById('subscription-form').reset();
}

async function handlePurchaseSubscription(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Acquisto in corso...';

    try {
        const selectedVehicles = [...document.querySelectorAll('input[name="sub-vehicle"]:checked')]
            .map(cb => parseInt(cb.value));

        const payload = {
            type: document.getElementById('sub-type').value,
            vehicleType: document.getElementById('sub-vehicle-type').value,
            vehicleIds: selectedVehicles
        };

        const res = await fetchWithAuth('/api/subscriptions', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(errText || 'Errore durante l\'acquisto');
        }

        const data = await res.json();
        showToast('Abbonamento acquistato con successo!', 'success');
        closeSubscriptionModal();
        fetchSubscriptions();

        // Mostra QR se disponibile
        if (data.qrCode) {
            setTimeout(() => openSubDetailModal(data), 500);
        }
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.innerHTML = 'Acquista <i class="fa-solid fa-credit-card"></i>';
    }
}

// ─── Modal dettaglio QR abbonamento ──────────────────────────────────────────
function openSubDetailModal(sub) {
    const modal = document.getElementById('sub-detail-modal');
    modal.style.display = 'flex';

    document.getElementById('sub-qr-display').textContent = sub.qrCode || 'QR non disponibile';

    // Mostra immagine QR abbonamento (valida finché l'abbonamento è attivo)
    const qrImgEl = document.getElementById('sub-qr-image');
    if (qrImgEl && sub.qrCode) {
        qrImgEl.src = `${API_BASE}/api/subscriptions/qr/${sub.qrCode}`;
        qrImgEl.style.display = 'block';
    } else if (qrImgEl) {
        qrImgEl.style.display = 'none';
    }

    const fmtDate = d => d ? new Date(d).toLocaleDateString('it-IT') : 'N/A';
    document.getElementById('sub-validity').textContent =
        `Valido: ${fmtDate(sub.startDate)} → ${fmtDate(sub.endDate)}`;

    const veicoliDisplay = document.getElementById('sub-vehicles-display');
    if (sub.vehicles && sub.vehicles.length) {
        veicoliDisplay.textContent = `Veicoli: ${sub.vehicles.map(v => v.targa || v).join(', ')}`;
        veicoliDisplay.style.display = 'block';
    } else {
        veicoliDisplay.textContent = '';
        veicoliDisplay.style.display = 'none';
    }
}

function closeSubDetailModal() {
    document.getElementById('sub-detail-modal').style.display = 'none';
}

// ─── Parcheggi ───────────────────────────────────────────────────────────────
async function fetchParkings() {
    const grid = document.getElementById('parkings-grid');
    if (!grid) return;
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;"><i class="fa-solid fa-spinner fa-spin fa-2x"></i></div>';

    try {
        const res = await fetchWithAuth('/api/parkings');
        if (!res.ok) throw new Error('Errore nel caricamento parcheggi');
        const parkings = await res.json();

        if (!parkings.length) {
            grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--text-muted)">Nessun parcheggio disponibile.</div>';
            return;
        }

        grid.innerHTML = parkings.map(p => `
            <div class="stat-card glass-panel" style="flex-direction:column;align-items:flex-start;gap:0.5rem;">
                <div style="display:flex;justify-content:space-between;width:100%;align-items:center;">
                    <div class="stat-icon" style="width:40px;height:40px;font-size:1.2rem;background:rgba(72,219,152,0.15);">
                        <i class="fa-solid fa-square-parking"></i>
                    </div>
                    <span style="background:rgba(255,255,255,0.1);padding:4px 8px;border-radius:4px;font-size:0.8rem;">
                        Piano ${p.floorLevel ?? 'N/A'}
                    </span>
                </div>
                <h3 style="color:#fff;font-size:1rem;margin-top:0.5rem;">${p.name || p.code || 'Parcheggio'}</h3>
                <p style="font-size:0.82rem;color:var(--text-muted);">
                    Posti liberi: <strong style="color:#48db98;">${p.availableSpots ?? 'N/A'}</strong>
                    / ${p.totalSpots ?? 'N/A'}
                </p>
                ${p.pricePerHour != null ? `
                    <p style="font-size:0.85rem;color:var(--secondary);font-weight:600;">
                        € ${p.pricePerHour.toFixed(2)} / ora
                    </p>` : ''}
            </div>
        `).join('');
    } catch (err) {
        grid.innerHTML = `<div style="grid-column:1/-1;color:var(--danger);">${err.message}</div>`;
    }
}

// ─── GATE: CHECK-IN ──────────────────────────────────────────────────────────
async function handleGateCheckIn() {
    const plate = document.getElementById('gate-plate').value.trim();
    const type = document.getElementById('gate-type').value;
    const disability = document.getElementById('gate-disability').checked;

    if (!plate) { showToast('Inserisci la targa', 'error'); return; }
    
    if (!isValidPlate(plate, type)) {
        showToast(`Targa non valida per un veicolo di tipo ${type}.`, 'error');
        return;
    }

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
    const existing = document.getElementById('checkin-result');
    if (existing) existing.remove();

    const entryTime = data.entryTime
        ? new Date(data.entryTime).toLocaleTimeString('it-IT')
        : new Date().toLocaleTimeString('it-IT');

    const div = document.createElement('div');
    div.id = 'checkin-result';
    div.style.cssText = 'background:rgba(72,219,152,0.15);border:1px solid rgba(72,219,152,0.4);border-radius:12px;padding:1.2rem;margin-top:1rem;text-align:center;';
    div.innerHTML = `
        <i class="fa-solid fa-circle-check" style="font-size:2rem;color:#48db98;margin-bottom:0.5rem;"></i>
        <h4 style="color:#48db98;margin-bottom:0.8rem;">Check-in Effettuato!</h4>
        <div style="background:rgba(0,0,0,0.3);border-radius:8px;padding:0.8rem;margin-bottom:0.8rem;">
            <p style="margin:0.2rem 0;"><strong>Piano:</strong> ${data.floorLevel ?? 'N/A'}</p>
            <p style="margin:0.2rem 0;"><strong>Posto:</strong> ${data.spotCode ?? 'N/A'}</p>
            <p style="margin:0.2rem 0;"><strong>Orario ingresso:</strong> ${entryTime}</p>
        </div>
        <p style="font-size:0.78rem;color:var(--text-muted);margin-bottom:0.4rem;">QR Code per il check-out (valido fino all'uscita):</p>
        <img src="${API_BASE}/api/gate/qr/${data.qrCode}"
             alt="QR Code check-in"
             style="width:180px;height:180px;border-radius:8px;margin:0.5rem auto;display:block;background:#fff;padding:6px;"
             onerror="this.style.display='none'">
        <p style="font-size:0.72rem;color:var(--text-muted);margin-bottom:0.3rem;">Token testuale (alternativo):</p>
        <div style="background:rgba(0,0,0,0.4);border-radius:8px;padding:0.6rem;word-break:break-all;font-family:monospace;font-size:0.75rem;color:#fff;margin-bottom:0.8rem;">
            ${data.qrCode}
        </div>
        <button onclick="document.getElementById('checkin-result').remove()"
            style="font-size:0.8rem;background:transparent;border:1px solid rgba(255,255,255,0.2);color:#fff;padding:0.4rem 1rem;border-radius:6px;cursor:pointer;">
            Chiudi
        </button>
    `;
    document.getElementById('gate-checkin-section').appendChild(div);
    showToast('Check-in completato! Posto: ' + (data.spotCode ?? 'N/A'), 'success');
}

// ─── GATE: CHECK-OUT ─────────────────────────────────────────────────────────
let activeCheckoutData = null;

async function handleTicketScan() {
    const qr = document.getElementById('gate-out-qr').value.trim();
    const plate = document.getElementById('gate-out-plate')?.value.trim() || '';

    if (!qr) { showToast('Inserisci il Token QR', 'error'); return; }
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

    const fmt = dt =>
        dt ? new Date(dt).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
           : '--';

    let durationStr = '--';
    if (data.entryTime && data.exitTime) {
        const diffMs = new Date(data.exitTime) - new Date(data.entryTime);
        const mins = Math.floor(diffMs / 60000);
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        durationStr = h > 0 ? `${h}h ${m}min` : `${m} min`;
    }

    document.getElementById('ticket-spot').textContent = data.spotCode ?? 'N/A';
    document.getElementById('ticket-duration').textContent = durationStr;
    document.getElementById('ticket-price').textContent = data.amountDue != null
        ? `€ ${data.amountDue.toFixed(2)}`
        : 'N/D';

    const entryEl = document.getElementById('ticket-entry-time');
    const exitEl = document.getElementById('ticket-exit-time');
    if (entryEl) entryEl.textContent = fmt(data.entryTime);
    if (exitEl) exitEl.textContent = fmt(data.exitTime);
}

function resetCheckOutFlow() {
    activeCheckoutData = null;
    document.getElementById('gate-out-qr').value = '';
    const plateEl = document.getElementById('gate-out-plate');
    if (plateEl) plateEl.value = '';
    document.getElementById('scan-ticket-step').style.display = 'block';
    document.getElementById('pay-ticket-step').style.display = 'none';
}

function applySubscriptionUI() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        const onClick = item.getAttribute('onclick');
        if (onClick && (onClick.includes('vehicles') || onClick.includes('parkings') || onClick.includes('reservations'))) {
            if (!appState.hasActiveSubscription) {
                item.style.opacity = '0.5';
                item.title = 'Richiede abbonamento attivo';
            } else {
                item.style.opacity = '1';
                item.title = '';
            }
        }
    });
}

async function handlePayAndLeave() {
    if (!activeCheckoutData) return;
    
    const btn = document.querySelector('#pay-ticket-step .btn-primary');
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Elaborazione...';
    btn.disabled = true;

    try {
        const payload = {
            qrCode: activeCheckoutData.qrCode,
            licensePlate: activeCheckoutData.licensePlate
        };

        const res = await fetch(`${API_BASE}/api/gate/confirm-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (res.ok && data.success) {
            showToast(`Pagamento confermato. Buona giornata!`, 'success');
            setTimeout(() => {
                alert(`✅ Pagamento confermato!\n\nImporto: €${activeCheckoutData.amountDue.toFixed(2)}\nSbarra aperta — Arrivederci!`);
                resetCheckOutFlow();
            }, 500);
        } else {
            showToast(data.message || 'Errore durante la conferma del pagamento', 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.innerHTML = originalHtml;
        btn.disabled = false;
    }
}

// ─── UI Utilities ─────────────────────────────────────────────────────────────
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