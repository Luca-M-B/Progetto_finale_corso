const API_BASE = 'http://localhost:8080';

// App State
let appState = {
    isLoggedIn: localStorage.getItem('isLoggedIn') === 'true',
    username: localStorage.getItem('username') || null,
    role: localStorage.getItem('role') || null,
    hasActiveSubscription: false,
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
        
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('username', data.username);
        localStorage.setItem('role', appState.role);

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
            subscriptionType: document.getElementById('reg-subscription').value
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
    
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
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
    ['vehicles-section', 'subscriptions-section', 'reservations-section', 'parkings-section'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    switch (section) {
        case 'dashboard':
            pageTitle.textContent = 'Dashboard Overview';
            if (statsEl) statsEl.classList.remove('hidden');
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
        const [vehiclesRes, reservationsRes] = await Promise.all([
            fetchWithAuth('/api/vehicles'),
            fetchWithAuth('/api/reservations').catch(() => null)
        ]);

        const vehicles = await vehiclesRes.json();
        let reservations = [];
        if (reservationsRes) {
            try { reservations = await reservationsRes.json(); } catch (e) {}
        }

        document.getElementById('stat-vehicles').textContent = vehicles.length || 0;
        document.getElementById('stat-reservations').textContent = reservations.length || 0;
    } catch (e) {
        console.error('Error fetching stats:', e);
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
            <div class="stat-card glass-panel" style="flex-direction:column;align-items:flex-start;gap:0.5rem;">
                <div style="display:flex;justify-content:space-between;width:100%;align-items:center;">
                    <div class="stat-icon" style="width:40px;height:40px;font-size:1.2rem;">
                        <i class="fa-solid fa-car"></i>
                    </div>
                    <span style="background:rgba(255,255,255,0.1);padding:4px 8px;border-radius:4px;font-size:0.8rem;">
                        ${v.targa || 'N/A'}
                    </span>
                </div>
                <h3 style="color:#fff;font-size:1.1rem;margin-top:0.5rem;">${v.modello || 'Modello Sconosciuto'}</h3>
                <p style="font-size:0.85rem;color:var(--text-muted);">Tipo: ${v.tipo || 'Auto'}</p>
                <div style="display:flex;gap:10px;margin-top:1rem;width:100%;">
                    <button class="btn-primary" style="flex:1;padding:0.4rem;font-size:0.85rem;background:rgba(255,255,255,0.1);color:#fff;"
                        onclick="openEditVehicleModal(${v.id}, '${v.targa}', '${v.modello}', '${v.tipo}')">
                        <i class="fa-solid fa-pen"></i>
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
    form.classList.add('active'); // Assicura visibilità
    modal.style.display = 'flex';
}

function openEditVehicleModal(id, targa, modello, tipo) {
    const modal = document.getElementById('vehicle-modal');
    modal.querySelector('h2').textContent = 'Modifica Veicolo';
    document.getElementById('veh-targa').value = targa;
    document.getElementById('veh-modello').value = modello;
    document.getElementById('veh-tipo').value = tipo;
    document.getElementById('add-vehicle-form').dataset.editId = id;
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

    try {
        const payload = {
            targa: document.getElementById('veh-targa').value.trim(),
            modello: document.getElementById('veh-modello').value.trim(),
            tipo: document.getElementById('veh-tipo').value.trim()
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
        appState.hasActiveSubscription = subs.some(s => s.active !== false && new Date(s.endDate) > new Date());
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
                        <p style="font-size:0.9rem;color:${isActive ? '#48db98' : '#ff6384'};font-weight:600;">
                            <i class="fa-solid fa-hourglass-half"></i> ${isActive ? `${daysRemaining} giorni rimanenti` : 'Abbonamento scaduto'}
                        </p>
                    </div>
                    ${s.vehiclePlates && s.vehiclePlates.length ? `
                        <p style="font-size:0.8rem;color:#63b3ed;margin-top:5px;">
                            <i class="fa-solid fa-car"></i> Veicoli: ${s.vehiclePlates.join(', ')}
                        </p>` : ''}
                    <div style="display:flex;gap:8px;width:100%;margin-top:0.8rem;">
                        ${s.qrCode ? `
                            <button class="btn-primary" style="flex:1;font-size:0.85rem;background:rgba(99,179,237,0.15);"
                                onclick='openSubDetailModal(${JSON.stringify(s)})'>
                                <i class="fa-solid fa-qrcode"></i> Mostra QR
                            </button>` : ''}
                        <button class="btn-primary btn-accent" style="flex:1;font-size:0.85rem;"
                            onclick='openSubscriptionModal()'>
                            <i class="fa-solid fa-rotate"></i> Rinnova
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        grid.innerHTML = `<div style="grid-column:1/-1;color:var(--danger);">${err.message}</div>`;
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
        const subType = document.getElementById('sub-type').value;
        const selectedVehicles = [...document.querySelectorAll('input[name="sub-vehicle"]:checked')]
            .map(cb => parseInt(cb.value));

        const payload = {
            type: subType,
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

    const veicoli = sub.vehicles && sub.vehicles.length
        ? sub.vehicles.map(v => v.targa || v).join(', ')
        : 'Nessun veicolo associato';
    document.getElementById('sub-vehicles-display').textContent = `Veicoli: ${veicoli}`;
}

function closeSubDetailModal() {
    document.getElementById('sub-detail-modal').style.display = 'none';
}

// ─── Prenotazioni ─────────────────────────────────────────────────────────────
async function fetchReservations() {
    const grid = document.getElementById('reservations-grid');
    if (!grid) return;
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;"><i class="fa-solid fa-spinner fa-spin fa-2x"></i></div>';

    try {
        const res = await fetchWithAuth('/api/reservations');
        if (!res.ok) throw new Error('Errore nel caricamento prenotazioni');
        const reservations = await res.json();

        if (!reservations.length) {
            grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--text-muted)">Nessuna prenotazione. Creane una nuova.</div>';
            return;
        }

        const fmtDt = d => d ? new Date(d).toLocaleString('it-IT', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }) : 'N/A';
        const statusMap = {
            ACTIVE: { label: 'ATTIVA', color: '#48db98', bg: 'rgba(72,219,152,0.2)' },
            PENDING: { label: 'IN ATTESA', color: '#f6d365', bg: 'rgba(246,211,101,0.2)' },
            COMPLETED: { label: 'COMPLETATA', color: '#63b3ed', bg: 'rgba(99,179,237,0.2)' },
            CANCELLED: { label: 'ANNULLATA', color: '#ff6384', bg: 'rgba(255,99,132,0.2)' }
        };

        grid.innerHTML = reservations.map(r => {
            const st = statusMap[r.status] || { label: r.status || 'N/A', color: '#fff', bg: 'rgba(255,255,255,0.1)' };
            const canCancel = r.status === 'ACTIVE' || r.status === 'PENDING';
            return `
                <div class="stat-card glass-panel" style="flex-direction:column;align-items:flex-start;gap:0.5rem;">
                    <div style="display:flex;justify-content:space-between;width:100%;align-items:center;">
                        <div class="stat-icon" style="width:40px;height:40px;font-size:1.2rem;background:rgba(99,179,237,0.15);">
                            <i class="fa-solid fa-calendar-check"></i>
                        </div>
                        <span style="background:${st.bg};color:${st.color};padding:3px 10px;border-radius:20px;font-size:0.75rem;font-weight:600;">
                            ${st.label}
                        </span>
                    </div>
                    <h3 style="color:#fff;font-size:1rem;margin-top:0.5rem;">
                        Posto: ${r.spotCode || r.parkingSpot?.code || 'N/A'}
                    </h3>
                    <p style="font-size:0.82rem;color:var(--text-muted);">
                        <i class="fa-regular fa-clock"></i> ${fmtDt(r.startTime)} → ${fmtDt(r.endTime)}
                    </p>
                    ${r.vehicle ? `
                        <p style="font-size:0.8rem;color:#63b3ed;">
                            <i class="fa-solid fa-car"></i> ${r.vehicle.targa || r.vehicle}
                        </p>` : ''}
                    ${r.totalCost != null ? `
                        <p style="font-size:0.9rem;color:var(--secondary);font-weight:600;">
                            € ${r.totalCost.toFixed(2)}
                        </p>` : ''}
                    ${canCancel ? `
                        <button class="btn-primary" style="width:100%;margin-top:0.5rem;font-size:0.85rem;background:var(--danger);"
                            onclick="cancelReservation(${r.id})">
                            <i class="fa-solid fa-xmark"></i> Annulla
                        </button>` : ''}
                </div>
            `;
        }).join('');
    } catch (err) {
        grid.innerHTML = `<div style="grid-column:1/-1;color:var(--danger);">${err.message}</div>`;
    }
}

async function cancelReservation(id) {
    if (!confirm('Vuoi annullare questa prenotazione?')) return;
    try {
        const res = await fetchWithAuth(`/api/reservations/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Errore durante annullamento');
        showToast('Prenotazione annullata', 'success');
        fetchReservations();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ─── Modal Nuova Prenotazione ─────────────────────────────────────────────────
function ensureReservationModal() {
    if (document.getElementById('reservation-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'reservation-modal';
    modal.style.cssText = 'display:none;position:fixed;z-index:9300;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);align-items:center;justify-content:center;';
    modal.innerHTML = `
        <div class="glass-panel auth-box" style="margin:auto;max-height:90vh;overflow-y:auto;width:420px;">
            <div class="auth-header">
                <i class="fa-solid fa-calendar-plus logo-icon"></i>
                <h2>Nuova Prenotazione</h2>
            </div>
            <form id="reservation-form" class="auth-form active">
                <div class="input-group">
                    <label><i class="fa-solid fa-car"></i> Veicolo</label>
                    <select id="res-vehicle" style="width:100%;padding:0.8rem;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(0,0,0,0.2);color:#fff;font-family:'Inter',sans-serif;">
                        <option value="">Caricamento...</option>
                    </select>
                </div>
                <div class="input-group">
                    <label><i class="fa-regular fa-clock"></i> Data/Ora Inizio</label>
                    <input type="datetime-local" id="res-start" style="width:100%;padding:0.8rem;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(0,0,0,0.2);color:#fff;font-family:'Inter',sans-serif;" required>
                </div>
                <div class="input-group">
                    <label><i class="fa-regular fa-clock"></i> Data/Ora Fine</label>
                    <input type="datetime-local" id="res-end" style="width:100%;padding:0.8rem;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(0,0,0,0.2);color:#fff;font-family:'Inter',sans-serif;" required>
                </div>
                <div style="display:flex;gap:10px;">
                    <button type="button" class="btn-danger-outline" onclick="closeReservationModal()">Annulla</button>
                    <button type="submit" class="btn-primary btn-accent" style="flex:1;">
                        Prenota <i class="fa-solid fa-calendar-check"></i>
                    </button>
                </div>
            </form>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('reservation-form').addEventListener('submit', handleCreateReservation);
}

async function openReservationModal() {
    ensureReservationModal();
    const modal = document.getElementById('reservation-modal');
    modal.style.display = 'flex';

    // Precompila data minima = adesso
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    const isoNow = now.toISOString().slice(0, 16);
    document.getElementById('res-start').min = isoNow;
    document.getElementById('res-end').min = isoNow;

    // Carica veicoli
    const sel = document.getElementById('res-vehicle');
    sel.innerHTML = '<option value="">Caricamento...</option>';
    try {
        const res = await fetchWithAuth('/api/vehicles');
        const vehicles = await res.json();
        if (!vehicles.length) {
            sel.innerHTML = '<option value="">Nessun veicolo disponibile</option>';
        } else {
            sel.innerHTML = vehicles.map(v =>
                `<option value="${v.id}">${v.targa} — ${v.modello}</option>`
            ).join('');
        }
    } catch {
        sel.innerHTML = '<option value="">Errore caricamento</option>';
    }
}

function closeReservationModal() {
    const modal = document.getElementById('reservation-modal');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('reservation-form').reset();
    }
}

async function handleCreateReservation(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Prenotazione...';

    try {
        const vehicleId = document.getElementById('res-vehicle').value;
        const startTime = document.getElementById('res-start').value;
        const endTime = document.getElementById('res-end').value;

        if (!vehicleId) throw new Error('Seleziona un veicolo');
        if (!startTime || !endTime) throw new Error('Inserisci data/ora di inizio e fine');
        if (new Date(endTime) <= new Date(startTime)) throw new Error('La fine deve essere dopo l\'inizio');

        const payload = {
            vehicleId: parseInt(vehicleId),
            startTime: new Date(startTime).toISOString(),
            endTime: new Date(endTime).toISOString()
        };

        const res = await fetchWithAuth('/api/reservations', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(errText || 'Errore durante la prenotazione');
        }

        showToast('Prenotazione creata con successo!', 'success');
        closeReservationModal();
        fetchReservations();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.innerHTML = 'Prenota <i class="fa-solid fa-calendar-check"></i>';
    }
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
    const amount = activeCheckoutData.amountDue ?? 0;
    showToast(`Pagamento di €${amount.toFixed(2)} confermato. Buona giornata!`, 'success');
    setTimeout(() => {
        alert(`✅ Pagamento confermato!\n\nImporto: €${amount.toFixed(2)}\nSbarra aperta — Arrivederci!`);
        resetCheckOutFlow();
    }, 500);
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