# ParkSync - Smart Parking Management System

**ParkSync** è una piattaforma enterprise-ready per la gestione automatizzata di parcheggi multipiano. Progettata con un'architettura moderna, offre un'esperienza utente premium e una logica di business robusta per la gestione di abbonamenti, veicoli e accessi automatizzati via QR Code.

---

## 💎 Caratteristiche Principali

### 1. Esperienza Utente & Dashboard
- **Interfaccia Premium**: Design moderno basato su *Glassmorphism*, animazioni fluide e una UX intuitiva.
- **Supporto Multilingua**: Sistema di internazionalizzazione (i18n) completo (Italiano/Inglese) con persistenza della lingua di registrazione per i documenti ufficiali.
- **Dashboard Unificata**: Visualizzazione immediata dello stato del profilo, inclusi veicoli registrati e abbonamenti attivi in tempo reale.
- **Iconografia Dinamica**: Riconoscimento visivo immediato della tipologia di veicolo (Auto, Moto, Elettrica, Disabili) tramite icone dedicate.

### 2. Sistema di Abbonamenti Intelligente
- **Piani Flessibili**: Supporto per abbonamenti Mensili, Trimestrali e Annuali.
- **Posto Riservato Esclusivo**: Al momento dell'acquisto, il sistema assegna un posto specifico basato sulla tipologia del veicolo. Il posto rimane **garantito ed esclusivo** per l'utente per tutta la durata del piano.
- **Persistenza Linguistica**: Gli abbonamenti mantengono la lingua utilizzata al momento dell'acquisto (es. "Mensile" vs "Monthly") per coerenza amministrativa.

### 3. Logica di Gate Avanzata (Check-in/Out)
- **Flusso di Pagamento Sicuro**: Separazione tra *Verifica Sessione* e *Conferma Pagamento* per prevenire errori di gestione.
- **QR Code Dinamici**: Generazione di QR Code univoci per ogni sessione di parcheggio e per gli abbonamenti permanenti.
- **Validazione Targhe**: Motore di validazione basato su Regex per garantire formati corretti e prevenire duplicati o ingressi non autorizzati.

---

## 🛠️ Stack Tecnologico

Il progetto utilizza tecnologie moderne e standard di settore per garantire scalabilità e manutenibilità.

### Backend
- **Java 17**: Linguaggio core per la logica di business.
- **Spring Boot 3.4.x**: Framework principale per lo sviluppo dell'applicazione.
- **Spring Security**: Gestione dell'autenticazione e autorizzazione basata su Sessioni (Cookie-based).
- **Spring Data JPA**: Astrazione per l'accesso ai dati e la gestione delle entità.
- **Lombok**: Libreria per la riduzione del codice boilerplate (Getter, Setter, Constructors).
- **Hibernate**: Implementazione di JPA per l'Object-Relational Mapping (ORM).

### Database
- **MySQL 8.0**: Database relazionale per la persistenza dei dati.
- **Sincronizzazione Timezone**: Configurato su `Europe/Rome` per la precisione dei calcoli tariffari.

### Frontend
- **HTML5 & CSS3**: Struttura e stile moderno (Glassmorphism, Custom Properties).
- **Vanilla JavaScript (ES6+)**: Logica client-side senza dipendenze esterne pesanti.
- **FontAwesome 6.4.0**: Iconografia professionale e dinamica.
- **i18n Custom Engine**: Motore di traduzione dinamico sviluppato ad hoc.

### Infrastruttura & DevOps
- **Docker**: Containerizzazione dell'applicazione per ambienti isolati.
- **Docker Compose**: Orchestrazione dei servizi (App, Database, phpMyAdmin).
- **Maven**: Gestione delle dipendenze e build automation.

---

## 🏗️ Guida all'Installazione

### Prerequisiti
- Docker e Docker Compose installati sul sistema.

### Avvio dello Stack
```bash
# Clona il repository e avvia i container
docker-compose up --build -d
```

### Endpoint di Accesso
- **Web Application**: [http://localhost:8082](http://localhost:8082)
- **Database Admin (phpMyAdmin)**: [http://localhost:8081](http://localhost:8081)
- **API Documentation**: `http://localhost:8082/api`

---

## 📊 Business Logic: Algoritmo Tariffario
Il sistema applica tariffe dinamiche basate su sconti cumulativi:
- **Tariffa Base**: €3.50/ora.
- **Sconto Veicolo Elettrico**: -20%
- **Sconto Motociclo**: -30%
- **Sconto Disabilità**: -50%
- **Abbonati**: Accesso gratuito e illimitato sul posto riservato assegnato.

---

## 🛡️ Sicurezza e Integrità
- **Session Management**: Autenticazione robusta tramite sessioni Spring Security.
- **Data Isolation**: Isolamento dei dati utente a livello di service layer.
- **Soft Delete**: Sistema di "Cestino" per abbonamenti scaduti, permettendo il ripristino o l'analisi storica.
- **Validazione Rigorosa**: Controllo centralizzato dei formati targa e della disponibilità dei posti in tempo reale.
