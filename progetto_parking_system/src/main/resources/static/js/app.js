/**
 * Configurazione e logica client-side per l'applicazione Parking System.
 * Gestisce l'autenticazione, la visualizzazione dei dati e le interazioni con le API.
 */

const API_BASE = 'http://localhost:8082'; // URL base per le chiamate API al backend

/**
 * Helper per la gestione del LocalStorage e SessionStorage.
 * Permette di salvare i dati di sessione (es. username, stato login).
 */
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

/**
 * Stato globale dell'applicazione.
 * Contiene informazioni sull'utente autenticato e sulla vista corrente.
 */
let appState = {
    isLoggedIn: storage.get('isLoggedIn') === 'true',
    username: storage.get('username') || null,
    role: storage.get('role') || null,
    hasActiveSubscription: false,
    activeSubscriptionVehicleType: null, // Tipo veicolo consentito dall'abbonamento attivo
    currentView: 'auth',
    language: storage.get('language') || 'it'
};

/**
 * Funzioni per l'internazionalizzazione (i18n)
 */
function i18n(key) {
    return (translations[appState.language] && translations[appState.language][key]) || key;
}

function setLanguage(lang) {
    appState.language = lang;
    storage.set('language', lang, true);
    updatePageTranslations();
    
    // Aggiorna classi attive sui pulsanti lingua
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.id === `lang-${lang}` || btn.id === `lang-${lang}-side`) {
            btn.classList.add('active');
        }
    });
}

function updatePageTranslations() {
    // Traduzione elementi con data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.innerHTML = i18n(key);
    });

    // Traduzione placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = i18n(key);
    });

    // Aggiorna titolo pagina se necessario
    const currentSection = document.querySelector('.nav-item.active')?.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
    if (currentSection) {
        updatePageTitle(currentSection);
    }
}

function updatePageTitle(section) {
    const pageTitle = document.getElementById('page-title');
    if (!pageTitle) return;

    switch (section) {
        case 'dashboard': pageTitle.textContent = i18n('dashboard_overview'); break;
        case 'vehicles': pageTitle.textContent = i18n('nav_vehicles'); break;
        case 'subscriptions': pageTitle.textContent = i18n('nav_subscriptions'); break;
        default: pageTitle.textContent = section.charAt(0).toUpperCase() + section.slice(1);
    }
}

/**
 * Validazione della targa con regex universale.
 * Accetta formati con o senza trattini/spazi intermedi (es: "AA123BB", "AA 123 BB", "AA-123-BB").
 * @param {string} plate La targa da validare
 * @returns {boolean} True se il formato è corretto
 */
function isValidPlate(plate) {
    // Regex: 1-3 caratteri, separatore opzionale (- o spazio), 1-6 caratteri
    const regex = /^[A-Z0-9]{1,3}[-\s]?[A-Z0-9]{1,6}$/i;
    return regex.test(plate.trim());
}

// DOM Elements
const views = {
    auth: document.getElementById('auth-view'),
    dashboard: document.getElementById('dashboard-view')
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    restoreSavedCredentials();
    setLanguage(appState.language); // Applica la lingua salvata
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
        document.getElementById('display-username').textContent = appState.username || i18n('user_placeholder');
        loadSection('dashboard');
    } else {
        showView('auth');
    }
}

/**
 * Passa tra la vista di autenticazione e la dashboard.
 */
function showView(viewId) {
    Object.values(views).forEach(v => v.classList.remove('active'));
    if (views[viewId]) views[viewId].classList.add('active');
}

/**
 * Cambia tab tra Login e Registrazione nella vista Auth.
 */
function switchAuthTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');
    document.getElementById(`${tab}-form`).classList.add('active');
}

/**
 * Gestisce il processo di login inviando le credenziali al backend.
 */
async function handleLogin(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> ${i18n('wait_btn')}`;

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

        if (!res.ok) throw new Error(i18n('invalid_credentials') || 'Credenziali non valide');
        const data = await res.json();

        // Aggiorna lo stato globale dell'app
        appState.isLoggedIn = true;
        appState.username = data.username;
        appState.role = data.role || 'USER';
        appState.hasActiveSubscription = !!data.hasActiveSubscription;
        appState.activeSubscriptionVehicleType = data.activeSubscriptionVehicleType || 'CAR';
        
        // Gestione opzione "Ricordami"
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
        showToast(i18n('login_success'), 'success');
        checkAuthState();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.innerHTML = `<span data-i18n="login_btn">${i18n('login_btn')}</span> <i class="fa-solid fa-arrow-right"></i>`;
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> ${i18n('registering_btn')}`;

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
            throw new Error(errText || i18n('reg_error'));
        }

        showToast(i18n('reg_success'), 'success');
        switchAuthTab('login');
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.innerHTML = `<span data-i18n="register_tab">${i18n('register_tab')}</span> <i class="fa-solid fa-user-plus"></i>`;
    }
}

/**
 * Effettua il logout pulendo lo stato locale e chiamando l'API di logout del server.
 */
async function logout() {
    try {
        await fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
    } catch (_) { /* ignora errori di rete durante il logout */ }

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
/**
 * Carica e visualizza una sezione specifica della dashboard.
 * Gestisce anche il controllo accessi per le sezioni che richiedono un abbonamento attivo.
 */
function loadSection(section) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const btn = document.querySelector(`button[onclick="loadSection('${section}')"]`);
    if (btn) btn.classList.add('active');

    const pageTitle = document.getElementById('page-title');
    const statsEl = document.querySelector('.dashboard-stats');

    // Controllo Accessi: Alcune sezioni richiedono un abbonamento attivo
    const restricted = ['vehicles', 'parkings', 'reservations'];
    if (restricted.includes(section) && !appState.hasActiveSubscription) {
        showToast(i18n('access_denied_sub'), 'error');
        // Se l'utente prova ad accedere a una sezione bloccata, lo reindirizziamo agli abbonamenti
        loadSection('subscriptions');
        return;
    }

    // Nascondi tutte le sezioni di dati prima di mostrare quella richiesta
    ['vehicles-section', 'subscriptions-section', 'reservations-section', 'parkings-section', 'dashboard-summary-section'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });

    switch (section) {
        case 'dashboard':
            updatePageTitle('dashboard');
            if (statsEl) statsEl.classList.remove('hidden');
            const summarySec = document.getElementById('dashboard-summary-section');
            if (summarySec) summarySec.classList.remove('hidden');
            fetchDashboardStats();
            break;

        case 'vehicles':
            updatePageTitle('vehicles');
            if (statsEl) statsEl.classList.add('hidden');
            document.getElementById('vehicles-section').classList.remove('hidden');
            fetchVehicles();
            break;

        case 'subscriptions':
            updatePageTitle('subscriptions');
            if (statsEl) statsEl.classList.add('hidden');
            document.getElementById('subscriptions-section').classList.remove('hidden');
            fetchSubscriptions();
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
                <h3><i class="fa-solid fa-calendar-check" style="margin-right:6px;"></i><span data-i18n="my_reservations">Le Mie Prenotazioni</span></h3>
                <button class="btn-primary btn-sm" onclick="openReservationModal()">
                    <i class="fa-solid fa-plus"></i> <span data-i18n="add_btn">Aggiungi</span>
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
                <h3><i class="fa-solid fa-square-parking" style="margin-right:6px;"></i><span data-i18n="parkings_available">Parcheggi Disponibili</span></h3>
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
/**
 * Wrapper per fetch che aggiunge automaticamente le credenziali di sessione (cookie) 
 * e gestisce centralmente gli errori di autenticazione (401/403).
 */
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
        credentials: 'include'   // Fondamentale per inviare il cookie di sessione
    });

    // Se il server restituisce 401 o 403, forziamo il logout
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

    return response;
}

// ─── Dashboard Stats ─────────────────────────────────────────────────────────
/**
 * Recupera le statistiche generali per visualizzarle nella dashboard (es. numero veicoli).
 */
async function fetchDashboardStats() {
    try {
        const vehiclesRes = await fetchWithAuth('/api/vehicles');
        const vehicles = await vehiclesRes.json();
        document.getElementById('stat-vehicles').textContent = vehicles.length || 0;

        // Recupera e mostra il riepilogo degli abbonamenti attivi
        fetchDashboardSubscriptions();
    } catch (e) {
        console.error('Errore nel recupero delle statistiche dashboard:', e);
    }
}

/**
 * Recupera gli abbonamenti attivi dell'utente per mostrarli nel pannello riassuntivo della dashboard.
 */
async function fetchDashboardSubscriptions() {
    const grid = document.getElementById('dashboard-subscriptions-grid');
    if (!grid) return;

    try {
        const res = await fetchWithAuth('/api/subscriptions');
        const subs = await res.json();
        // Filtra solo gli abbonamenti attivi e non scaduti
        const activeSubs = subs.filter(s => s.active !== false && new Date(s.endDate) > new Date());

        if (activeSubs.length === 0) {
            grid.innerHTML = `<p style="color:var(--text-muted); padding:1rem; grid-column:1/-1; text-align:center;">${i18n('no_active_subscriptions')}</p>`;
            return;
        }

        const typeLabel = { MONTHLY: i18n('monthly'), QUARTERLY: i18n('quarterly'), YEARLY: i18n('yearly') };
        const fmtDate = d => d ? new Date(d).toLocaleDateString(appState.language === 'it' ? 'it-IT' : 'en-US') : 'N/A';

        grid.innerHTML = activeSubs.map(s => `
            <div class="stat-card glass-panel" style="flex-direction:column;align-items:flex-start;gap:0.5rem;position:relative;overflow:hidden;">
                <div style="display:flex;justify-content:space-between;width:100%;align-items:center;">
                    <div class="stat-icon purple" style="width:40px;height:40px;font-size:1.2rem;">
                        <i class="fa-solid fa-id-card"></i>
                    </div>
                    <span style="background:rgba(72,219,152,0.2);color:#48db98;padding:3px 10px;border-radius:20px;font-size:0.75rem;font-weight:600;">${i18n('active_badge')}</span>
                </div>
                <h3 style="color:#fff;font-size:1.1rem;margin-top:0.5rem;">
                    ${typeLabel[s.type] || s.type || i18n('nav_subscriptions')}
                </h3>
                <div style="width:100%;background:rgba(255,255,255,0.05);padding:10px;border-radius:8px;margin:5px 0;">
                    <p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:4px;">
                        <i class="fa-regular fa-calendar"></i> ${i18n('expiry_label')}: <strong>${fmtDate(s.endDate)}</strong>
                    </p>
                    <p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:4px;">
                        <i class="fa-solid fa-car-side"></i> ${i18n('vehicle_label')}: <strong>${s.vehicleType || 'N/A'}</strong>
                    </p>
                    <p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:4px;">
                        <i class="fa-solid fa-map-pin"></i> ${i18n('spot_code_label')}: <strong style="color:#63b3ed;">${s.spotCode || '...'}</strong>
                    </p>
                </div>
                ${s.vehiclePlates && s.vehiclePlates.length ? `
                    <p style="font-size:0.8rem;color:#63b3ed;margin-top:5px;">
                        <i class="fa-solid fa-car"></i> ${i18n('nav_vehicles')}: ${s.vehiclePlates.join(', ')}
                    </p>` : ''}
            </div>
        `).join('');
    } catch (e) {
        grid.innerHTML = '<p style="color:var(--danger); padding:1rem;">Errore nel caricamento degli abbonamenti.</p>';
    }
}

// ─── Veicoli ─────────────────────────────────────────────────────────────────
/**
 * Recupera l'elenco di tutti i veicoli dell'utente e li visualizza nella sezione dedicata.
 */
async function fetchVehicles() {
    const grid = document.getElementById('vehicles-grid');
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;"><i class="fa-solid fa-spinner fa-spin fa-2x"></i></div>';

    try {
        const res = await fetchWithAuth('/api/vehicles');
        if (!res.ok) throw new Error('Errore nel caricamento veicoli');
        const vehicles = await res.json();

        if (!vehicles.length) {
            grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:var(--text-muted)">${i18n('no_vehicles_found')}</div>`;
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
                <h3 style="color:#fff;font-size:1rem;margin:0.5rem 0 0.2rem 0;">${i18n('vehicle_type')}: ${i18n(v.tipo.toLowerCase()) || v.tipo}</h3>
                
                <div style="display:flex;gap:10px;margin-top:1rem;width:100%;">
                    <button class="btn-primary" style="flex:1;padding:0.4rem;font-size:0.85rem;background:rgba(255,255,255,0.1);color:#fff;"
                        onclick='openEditVehicleModal(${JSON.stringify(v).replace(/"/g, '&quot;')})'>
                        <i class="fa-solid fa-pen"></i> ${i18n('edit_btn')}
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

/**
 * Apre il modal per l'aggiunta di un nuovo veicolo, resettando il form.
 */
function openAddVehicleModal() {
    const modal = document.getElementById('vehicle-modal');
    modal.querySelector('h2').textContent = i18n('add_vehicle_title');
    const form = document.getElementById('add-vehicle-form');
    form.reset();
    form.dataset.editId = '';
    modal.style.display = 'flex';
}

/**
 * Apre il modal per la modifica di un veicolo, caricando i dati esistenti (targa).
 */
function openEditVehicleModal(v) {
    const modal = document.getElementById('vehicle-modal');
    modal.querySelector('h2').textContent = i18n('edit_vehicle_title');
    const form = document.getElementById('add-vehicle-form');
    form.dataset.editId = v.id;
    document.getElementById('veh-targa').value = v.targa;
    modal.style.display = 'flex';
}

/**
 * Chiude il modal del veicolo e pulisce i dati temporanei.
 */
function closeAddVehicleModal() {
    document.getElementById('vehicle-modal').style.display = 'none';
    document.getElementById('add-vehicle-form').reset();
    document.getElementById('add-vehicle-form').dataset.editId = '';
}

/**
 * Gestisce l'aggiunta o la modifica di un veicolo.
 */
async function handleAddVehicle(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const editId = e.target.dataset.editId;
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> ${i18n('saving_btn')}`;

    const targaRaw = document.getElementById('veh-targa').value.trim();
    if (!isValidPlate(targaRaw)) {
        showToast(i18n('invalid_plate'), "error");
        btn.innerHTML = i18n('save_btn');
        return;
    }

    try {
        const payload = {
            targa: targaRaw.toUpperCase().replace(/[\s\-]/g, ''),
            tipo: appState.activeSubscriptionVehicleType || 'CAR'
        };

        const method = editId ? 'PUT' : 'POST';
        const url = editId ? `/api/vehicles/${editId}` : '/api/vehicles';

        const res = await fetchWithAuth(url, { method, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error(await res.text());

        showToast(editId ? i18n('vehicle_updated') : i18n('vehicle_added'), 'success');
        closeAddVehicleModal();
        fetchVehicles();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.innerHTML = i18n('save_btn');
    }
}

/**
 * Gestisce l'eliminazione di un veicolo previa conferma dell'utente.
 */
async function deleteVehicle(id) {
    if (!confirm(i18n('confirm_delete_vehicle'))) return;
    try {
        const res = await fetchWithAuth(`/api/vehicles/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error(i18n('loading_error'));
        showToast(i18n('vehicle_deleted'), 'success');
        fetchVehicles();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ─── Abbonamenti ─────────────────────────────────────────────────────────────
/**
 * Recupera l'elenco completo degli abbonamenti dell'utente e li visualizza in griglia.
 * Aggiorna anche lo stato globale 'hasActiveSubscription' per gestire i permessi di navigazione.
 */
async function fetchSubscriptions() {
    const grid = document.getElementById('subscriptions-grid');
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;"><i class="fa-solid fa-spinner fa-spin fa-2x"></i></div>';

    try {
        const res = await fetchWithAuth('/api/subscriptions');
        if (!res.ok) throw new Error('Errore nel caricamento abbonamenti');
        const subs = await res.json();

        if (!subs.length) {
            grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:var(--text-muted)">${i18n('no_subscriptions_found')}</div>`;
            return;
        }

        const typeLabel = { MONTHLY: i18n('monthly'), QUARTERLY: i18n('quarterly'), YEARLY: i18n('yearly') };
        const fmtDate = d => d ? new Date(d).toLocaleDateString(appState.language === 'it' ? 'it-IT' : 'en-US') : 'N/A';

        // Verifica se esiste almeno un abbonamento attivo e aggiorna lo stato globale
        const activeSub = subs.find(s => s.active !== false && new Date(s.endDate) > new Date());
        appState.hasActiveSubscription = !!activeSub;
        appState.activeSubscriptionVehicleType = activeSub ? activeSub.vehicleType : 'CAR';
        
        applySubscriptionUI(); // Aggiorna l'interfaccia in base allo stato dell'abbonamento

        grid.innerHTML = subs.map(s => {
            const isActive = s.active !== false && new Date(s.endDate) > new Date();
            const badge = isActive
                ? `<span style="background:rgba(72,219,152,0.2);color:#48db98;padding:3px 10px;border-radius:20px;font-size:0.75rem;font-weight:600;">${i18n('active_badge')}</span>`
                : `<span style="background:rgba(255,99,132,0.2);color:#ff6384;padding:3px 10px;border-radius:20px;font-size:0.75rem;font-weight:600;">${i18n('expired_badge')}</span>`;

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
                        ${typeLabel[s.type] || s.type || i18n('nav_subscriptions')}
                    </h3>
                    <div style="width:100%;background:rgba(255,255,255,0.05);padding:10px;border-radius:8px;margin:5px 0;">
                        <p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:4px;">
                            <i class="fa-regular fa-calendar"></i> ${i18n('expiry_label')}: <strong>${fmtDate(s.endDate)}</strong>
                        </p>
                        <p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:4px;">
                            <i class="fa-solid fa-car-side"></i> ${i18n('vehicle_label')}: <strong>${s.vehicleType || 'N/A'}</strong>
                        </p>
                        <p style="font-size:0.82rem;color:var(--text-muted);margin-bottom:4px;">
                            <i class="fa-solid fa-map-pin"></i> ${i18n('spot_code_label')}: <strong style="color:#63b3ed;">${s.spotCode || '...'}</strong>
                        </p>
                        <p style="font-size:0.9rem;color:${isActive ? '#48db98' : '#ff6384'};font-weight:600;">
                            <i class="fa-solid fa-hourglass-half"></i> ${isActive ? `${daysRemaining} ${i18n('days_remaining')}` : i18n('subscription_expired')}
                        </p>
                    </div>
                    ${s.vehiclePlates && s.vehiclePlates.length ? `
                        <p style="font-size:0.8rem;color:#63b3ed;margin-top:5px;">
                            <i class="fa-solid fa-car"></i> ${i18n('nav_vehicles')}: ${s.vehiclePlates.join(', ')}
                        </p>` : ''}
                    <div style="display:flex;gap:8px;width:100%;margin-top:0.8rem;align-items:center;">
                        ${s.qrCode ? `
                            <button class="btn-primary" style="flex:1;font-size:0.85rem;background:rgba(99,179,237,0.15);padding:8px 4px;"
                                onclick='openSubDetailModal(${JSON.stringify(s)})'>
                                <i class="fa-solid fa-qrcode"></i> ${i18n('qr_btn')}
                            </button>` : ''}
                        <button class="btn-primary btn-accent" style="flex:1;font-size:0.85rem;padding:8px 4px;"
                            onclick='openSubscriptionModal()'>
                            <i class="fa-solid fa-rotate"></i> ${i18n('renew_btn')}
                        </button>
                        ${!isActive ? `
                        <button class="btn-primary" style="width:40px;height:36px;flex-shrink:0;background:rgba(239,68,68,0.15);color:var(--danger);border-color:transparent;display:flex;align-items:center;justify-content:center;"
                            onclick='deleteSubscription(${s.id})' title="${i18n('delete_tooltip')}">
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

/**
 * Sposta un abbonamento nel cestino (soft delete).
 */
async function deleteSubscription(id) {
    if (!confirm(i18n('confirm_bin_sub'))) return;
    try {
        const res = await fetch(`${API_BASE}/api/subscriptions/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        if (!res.ok) {
            const data = await res.json();
            throw new Error(data.message || i18n('loading_error'));
        }
        showToast(i18n('sub_moved_bin'), 'success');
        fetchSubscriptions();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

/**
 * Apre il modal del cestino e carica gli abbonamenti eliminati.
 */
async function openBinModal() {
    document.getElementById('bin-modal').style.display = 'flex';
    fetchBinSubscriptions();
}

/**
 * Chiude il modal del cestino.
 */
function closeBinModal() {
    document.getElementById('bin-modal').style.display = 'none';
}

/**
 * Recupera gli abbonamenti nel cestino per visualizzarli nel modal.
 */
async function fetchBinSubscriptions() {
    const grid = document.getElementById('bin-grid');
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;"><i class="fa-solid fa-spinner fa-spin fa-2x"></i></div>';
    
    try {
        const res = await fetch(`${API_BASE}/api/subscriptions/deleted`, { credentials: 'include' });
        const subs = await res.json();
        
        if (subs.length === 0) {
            grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--text-muted);">${i18n('empty_bin')}</div>`;
            return;
        }

        const typeLabel = { MONTHLY: i18n('monthly'), QUARTERLY: i18n('quarterly'), YEARLY: i18n('yearly') };
        const fmtDate = d => d ? new Date(d).toLocaleDateString(appState.language === 'it' ? 'it-IT' : 'en-US') : '—';

        grid.innerHTML = subs.map(s => `
            <div class="stat-card glass-panel" style="flex-direction:column;align-items:flex-start;gap:0.5rem;border-color:rgba(239,68,68,0.2);">
                <h3 style="color:#fff;font-size:1rem;margin:0;">${typeLabel[s.type] || s.type}</h3>
                <p style="font-size:0.75rem;color:var(--text-muted);margin:0;">
                    ${i18n('expired_at')}: <strong>${fmtDate(s.endDate)}</strong>
                </p>
                <div style="display:flex;gap:8px;width:100%;margin-top:0.5rem;">
                    <button class="btn-primary" style="flex:1;font-size:0.75rem;background:rgba(72,219,152,0.1);color:#48db98;border-color:#48db98;"
                        onclick='restoreSubscription(${s.id})'>
                        <i class="fa-solid fa-rotate-left"></i> ${i18n('restore_btn')}
                    </button>
                </div>
            </div>
        `).join('');
    } catch (err) {
        grid.innerHTML = `<div style="grid-column:1/-1;color:var(--danger);">${err.message}</div>`;
    }
}

/**
 * Ripristina un abbonamento dal cestino.
 */
async function restoreSubscription(id) {
    try {
        const res = await fetch(`${API_BASE}/api/subscriptions/${id}/restore`, {
            method: 'POST',
            credentials: 'include'
        });
        if (!res.ok) throw new Error(i18n('loading_error'));
        showToast(i18n('sub_restored'), 'success');
        fetchBinSubscriptions();
        fetchSubscriptions();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ─── Modal Acquisto Abbonamento ───────────────────────────────────────────────
/**
 * Apre il modal per l'acquisto o il rinnovo di un abbonamento.
 * Carica dinamicamente l'elenco dei veicoli dell'utente per permetterne la selezione.
 */
async function openSubscriptionModal() {
    console.log("Apertura modal abbonamento...");
    const modal = document.getElementById('subscription-modal');
    if (!modal) {
        console.error("Modal 'subscription-modal' non trovato!");
        return;
    }
    modal.style.display = 'flex';
    document.getElementById('subscription-form').classList.add('active');

    const listEl = document.getElementById('sub-vehicles-list');
    if (listEl) {
        listEl.innerHTML = `<p style="color:var(--text-muted);font-size:0.85rem;"><i class="fa-solid fa-spinner fa-spin"></i> ${i18n('loading_vehicles')}</p>`;
    }

    try {
        const res = await fetchWithAuth('/api/vehicles');
        if (!res.ok) throw new Error();
        const vehicles = await res.json();

        if (!vehicles.length) {
            listEl.innerHTML = `<p style="color:var(--text-muted);font-size:0.85rem;">${i18n('no_vehicles_available')}</p>`;
            return;
        }

        // Popola la lista dei veicoli selezionabili tramite checkbox
        listEl.innerHTML = vehicles.map(v => `
            <label style="display:flex;align-items:center;gap:0.6rem;background:rgba(255,255,255,0.05);padding:0.5rem 0.8rem;border-radius:8px;cursor:pointer;">
                <input type="checkbox" name="sub-vehicle" value="${v.id}" style="width:auto;">
                <span><strong>${v.targa}</strong> — ${i18n(v.tipo.toLowerCase()) || v.tipo}</span>
            </label>
        `).join('');
    } catch {
        listEl.innerHTML = `<p style="color:var(--danger);font-size:0.85rem;">${i18n('loading_error')}</p>`;
    }
}

/**
 * Chiude il modal di acquisto abbonamento e resetta il form.
 */
function closeSubscriptionModal() {
    document.getElementById('subscription-modal').style.display = 'none';
    document.getElementById('subscription-form').reset();
}

/**
 * Gestisce l'invio del form per l'acquisto di un nuovo abbonamento.
 */
async function handlePurchaseSubscription(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> ${i18n('buying_btn')}`;

    try {
        // Raccoglie gli ID dei veicoli selezionati
        const selectedVehicles = [...document.querySelectorAll('input[name="sub-vehicle"]:checked')]
            .map(cb => parseInt(cb.value));

        if (selectedVehicles.length === 0) {
            showToast(i18n('select_at_least_one_vehicle'), 'error');
            btn.innerHTML = i18n('buy_btn');
            return;
        }

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
            throw new Error(errText || i18n('loading_error'));
        }

        const data = await res.json();
        showToast(i18n('sub_purchased_success'), 'success');
        closeSubscriptionModal();
        fetchSubscriptions();

        // Se il backend restituisce un QR code, apriamo subito il dettaglio per mostrarlo
        if (data.qrCode) {
            setTimeout(() => openSubDetailModal(data), 500);
        }
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.innerHTML = `${i18n('buy_btn')} <i class="fa-solid fa-credit-card"></i>`;
    }
}

// ─── Modal dettaglio QR abbonamento ──────────────────────────────────────────
/**
 * Visualizza i dettagli di un abbonamento specifico, incluso il QR code per l'accesso.
 */
function openSubDetailModal(sub) {
    const modal = document.getElementById('sub-detail-modal');
    modal.style.display = 'flex';

    document.getElementById('sub-qr-display').textContent = sub.qrCode || i18n('qr_not_available');

    // Carica l'immagine del QR code generata dal backend
    const qrImgEl = document.getElementById('sub-qr-image');
    if (qrImgEl && sub.qrCode) {
        qrImgEl.src = `${API_BASE}/api/subscriptions/qr/${sub.qrCode}`;
        qrImgEl.style.display = 'block';
    } else if (qrImgEl) {
        qrImgEl.style.display = 'none';
    }

    const fmtDate = d => d ? new Date(d).toLocaleDateString(appState.language === 'it' ? 'it-IT' : 'en-US') : 'N/A';
    document.getElementById('sub-validity').textContent =
        `${i18n('validity_label')}: ${fmtDate(sub.startDate)} → ${fmtDate(sub.endDate)}`;

    const veicoliDisplay = document.getElementById('sub-vehicles-display');
    if (sub.vehicles && sub.vehicles.length) {
        veicoliDisplay.textContent = `${i18n('associated_vehicles')}: ${sub.vehicles.map(v => v.targa || v).join(', ')}`;
        veicoliDisplay.style.display = 'block';
    } else {
        veicoliDisplay.textContent = '';
        veicoliDisplay.style.display = 'none';
    }
}

/**
 * Chiude il modal dei dettagli abbonamento.
 */
function closeSubDetailModal() {
    document.getElementById('sub-detail-modal').style.display = 'none';
}

/**
 * Recupera l'elenco dei parcheggi disponibili e il numero di posti liberi.
 */
async function fetchParkings() {
    const grid = document.getElementById('parkings-grid');
    if (!grid) return;
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;"><i class="fa-solid fa-spinner fa-spin fa-2x"></i></div>';

    try {
        const res = await fetchWithAuth('/api/parkings');
        if (!res.ok) throw new Error(i18n('loading_error'));
        const parkings = await res.json();

        if (!parkings.length) {
            grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:var(--text-muted)">${i18n('no_parkings_found')}</div>`;
            return;
        }

        grid.innerHTML = parkings.map(p => `
            <div class="stat-card glass-panel" style="flex-direction:column;align-items:flex-start;gap:0.5rem;">
                <div style="display:flex;justify-content:space-between;width:100%;align-items:center;">
                    <div class="stat-icon" style="width:40px;height:40px;font-size:1.2rem;background:rgba(72,219,152,0.15);">
                        <i class="fa-solid fa-square-parking"></i>
                    </div>
                    <span style="background:rgba(255,255,255,0.1);padding:4px 8px;border-radius:4px;font-size:0.8rem;">
                        ${i18n('floor_label')} ${p.floorLevel ?? 'N/A'}
                    </span>
                </div>
                <h3 style="color:#fff;font-size:1rem;margin-top:0.5rem;">${p.name || p.code || i18n('parking')}</h3>
                <p style="font-size:0.82rem;color:var(--text-muted);">
                    ${i18n('free_spots')}: <strong style="color:#48db98;">${p.availableSpots ?? 'N/A'}</strong>
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
/**
 * Gestisce il check-in manuale al gate (per utenti senza abbonamento o test).
 */
async function handleGateCheckIn() {
    const plate = document.getElementById('gate-plate').value.trim();
    const type = document.getElementById('gate-type').value;
    const disability = document.getElementById('gate-disability').checked;

    if (!plate) { showToast(i18n('enter_plate'), 'error'); return; }
    
    if (!isValidPlate(plate)) {
        showToast(i18n('invalid_plate'), "error");
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
            showToast(data.message || i18n('loading_error'), 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

/**
 * Mostra i dettagli del check-in appena effettuato, incluso il posto assegnato e il QR code.
 */
function showCheckInResult(data) {
    const existing = document.getElementById('checkin-result');
    if (existing) existing.remove();

    const entryTime = data.entryTime
        ? new Date(data.entryTime).toLocaleTimeString(appState.language === 'it' ? 'it-IT' : 'en-US')
        : new Date().toLocaleTimeString(appState.language === 'it' ? 'it-IT' : 'en-US');

    const div = document.createElement('div');
    div.id = 'checkin-result';
    div.style.cssText = 'background:rgba(72,219,152,0.15);border:1px solid rgba(72,219,152,0.4);border-radius:12px;padding:1.2rem;margin-top:1rem;text-align:center;';
    div.innerHTML = `
        <i class="fa-solid fa-circle-check" style="font-size:2rem;color:#48db98;margin-bottom:0.5rem;"></i>
        <h4 style="color:#48db98;margin-bottom:0.8rem;">${i18n('checkin_performed')}</h4>
        <div style="background:rgba(0,0,0,0.3);border-radius:8px;padding:0.8rem;margin-bottom:0.8rem;">
            <p style="margin:0.2rem 0;"><strong>${i18n('floor_label')}:</strong> ${data.floorLevel ?? 'N/A'}</p>
            <p style="margin:0.2rem 0;"><strong>${i18n('spot_label')}:</strong> ${data.spotCode ?? 'N/A'}</p>
            <p style="margin:0.2rem 0;"><strong>${i18n('entry_time_label')}:</strong> ${entryTime}</p>
        </div>
        <p style="font-size:0.78rem;color:var(--text-muted);margin-bottom:0.4rem;">${i18n('qr_for_checkout')}</p>
        <img src="${API_BASE}/api/gate/qr/${data.qrCode}"
             alt="QR Code check-in"
             style="width:180px;height:180px;border-radius:8px;margin:0.5rem auto;display:block;background:#fff;padding:6px;"
             onerror="this.style.display='none'">
        <p style="font-size:0.72rem;color:var(--text-muted);margin-bottom:0.3rem;">${i18n('alt_token_label')}</p>
        <div style="background:rgba(0,0,0,0.4);border-radius:8px;padding:0.6rem;word-break:break-all;font-family:monospace;font-size:0.75rem;color:#fff;margin-bottom:0.8rem;">
            ${data.qrCode}
        </div>
        <button onclick="document.getElementById('checkin-result').remove()"
            style="font-size:0.8rem;background:transparent;border:1px solid rgba(255,255,255,0.2);color:#fff;padding:0.4rem 1rem;border-radius:6px;cursor:pointer;">
            ${i18n('close_btn')}
        </button>
    `;
    document.getElementById('gate-checkin-section').appendChild(div);
    showToast(i18n('checkin_success') + (data.spotCode ?? 'N/A'), 'success');
}

// ─── GATE: CHECK-OUT ─────────────────────────────────────────────────────────
let activeCheckoutData = null;

/**
 * Gestisce la scansione (o inserimento manuale) del ticket per il check-out.
 */
async function handleTicketScan() {
    const qr = document.getElementById('gate-out-qr').value.trim();
    const plate = document.getElementById('gate-out-plate')?.value.trim() || '';

    if (!qr) { showToast(i18n('enter_qr_token'), 'error'); return; }
    if (!plate) { showToast(i18n('enter_plate'), 'error'); return; }

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
            showToast(data.message || i18n('loading_error'), 'error');
        }
    } catch (err) {
        showToast(err.message, 'error');
    }
}

/**
 * Mostra la schermata di riepilogo pagamento per la sosta.
 */
function showPaymentPage(data) {
    document.getElementById('scan-ticket-step').style.display = 'none';
    document.getElementById('pay-ticket-step').style.display = 'block';

    const fmt = dt =>
        dt ? new Date(dt).toLocaleTimeString(appState.language === 'it' ? 'it-IT' : 'en-US', { hour: '2-digit', minute: '2-digit' })
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

/**
 * Resetta il flusso di check-out riportando l'utente alla scansione iniziale.
 */
function resetCheckOutFlow() {
    activeCheckoutData = null;
    document.getElementById('gate-out-qr').value = '';
    const plateEl = document.getElementById('gate-out-plate');
    if (plateEl) plateEl.value = '';
    document.getElementById('scan-ticket-step').style.display = 'block';
    document.getElementById('pay-ticket-step').style.display = 'none';
}

/**
 * Aggiorna gli elementi della navigazione per indicare visivamente quali sezioni 
 * richiedono un abbonamento attivo.
 */
function applySubscriptionUI() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        const onClick = item.getAttribute('onclick');
        if (onClick && (onClick.includes('vehicles') || onClick.includes('parkings') || onClick.includes('reservations'))) {
            if (!appState.hasActiveSubscription) {
                item.style.opacity = '0.5';
                item.title = 'Richiede un abbonamento attivo';
            } else {
                item.style.opacity = '1';
                item.title = '';
            }
        }
    });
}

/**
 * Gestisce la conferma del pagamento e l'apertura della sbarra in uscita.
 */
async function handlePayAndLeave() {
    if (!activeCheckoutData) return;
    
    const btn = document.querySelector('#pay-ticket-step .btn-primary');
    const originalHtml = btn.innerHTML;
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> ${i18n('processing_btn')}`;
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
            showToast(i18n('payment_confirmed'), 'success');
            setTimeout(() => {
                alert(`✅ ${i18n('payment_confirmed')}\n\n${i18n('total_label')}: €${activeCheckoutData.amountDue.toFixed(2)}`);
                resetCheckOutFlow();
            }, 500);
        } else {
            showToast(data.message || i18n('loading_error'), 'error');
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