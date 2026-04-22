# ParkSync - Smart Parking Management System

**ParkSync** è una piattaforma enterprise-ready per la gestione automatizzata di parcheggi multipiano. Progettata con un'architettura moderna a microservizi (simulata), offre un'esperienza utente premium e una logica di business robusta per la gestione di abbonamenti, veicoli e accessi automatizzati via QR Code.

---

## 💎 Caratteristiche Principali

### 1. Esperienza Utente & Dashboard
- **Interfaccia Premium**: Design moderno basato su *Glassmorphism*, animazioni fluide e una UX intuitiva.
- **Dashboard Unificata**: Visualizzazione immediata dello stato del profilo, inclusi veicoli registrati e abbonamenti attivi in tempo reale.
- **Gestione Multi-Veicolo**: Possibilità di associare più targhe a un singolo abbonamento.

### 2. Sistema di Abbonamenti Intelligente
- **Piani Flessibili**: Supporto per abbonamenti Mensili, Trimestrali e Annuali.
- **Posto Riservato Esclusivo**: Al momento dell'acquisto, il sistema assegna un posto specifico basato sulla tipologia del veicolo (Auto, Moto, Elettrica, Disabili). Il posto rimane **garantito ed esclusivo** per l'utente per tutta la durata del piano.
- **Ereditarietà Automatica**: I veicoli aggiunti dall'utente ereditano automaticamente i vantaggi e le tipologie definite dall'abbonamento attivo.

### 3. Logica di Gate Avanzata (Check-in/Out)
- **Flusso di Pagamento Sicuro**: Separazione tra *Verifica Sessione* e *Conferma Pagamento* per prevenire chiusure accidentali delle soste.
- **QR Code Dinamici**: Generazione integrata di QR Code per ogni sessione di parcheggio e per gli abbonamenti permanenti.
- **Validazione Targhe**: Motore di validazione differenziato (Regex) per Auto e Moto per garantire l'integrità dei dati.
- **Univocità Targhe**: Sistema anti-frode che impedisce l'ingresso a veicoli con targhe già presenti all'interno del parcheggio.

---

## 🛠️ Stack Tecnologico

- **Core Backend**: Java 17, Spring Boot 3.4.x
- **Sicurezza**: Spring Security con autenticazione basata su Sessione (Cookie-based).
- **Persistenza**: Spring Data JPA con supporto per transazioni atomiche.
- **Database**: MySQL 8.0 con sincronizzazione Timezone (Europe/Rome).
- **Frontend**: Architettura Single Page Application (SPA) in Vanilla JavaScript (ES6+), HTML5 e CSS3 moderno.
- **Infrastruttura**: Containerizzazione completa con Docker e Docker Compose.

---

## 🏗️ Architettura e Infrastruttura

Il progetto è completamente dockerizzato per garantire la portabilità tra ambienti di sviluppo, test e produzione.

### Struttura Docker:
- **Application Container**: Immagine ottimizzata basata su OpenJDK 17.
- **Database Container**: MySQL 8.0 pre-configurato.
- **Management**: phpMyAdmin integrato per il monitoraggio dei dati.

### Sincronizzazione Temporale:
Tutti i componenti (App, DB, Docker) sono sincronizzati sulla timezone `Europe/Rome` per garantire che i tempi di ingresso/uscita e i calcoli tariffari siano sempre precisi rispetto all'ora locale.

---

## 🚀 Guida all'Avvio Rapido

Il modo più semplice per avviare l'intero stack è utilizzare **Docker Compose**:

```bash
# Avvia tutti i servizi (App, Database, phpMyAdmin)
docker-compose up --build -d
```

### Endpoint Utili:
- **Web App**: [http://localhost:8082](http://localhost:8082)
- **Amministrazione DB (phpMyAdmin)**: [http://localhost:8081](http://localhost:8081)
- **API Base URL**: `http://localhost:8082/api`

---

## 📊 Business Logic: Algoritmo Tariffario

Il sistema applica sconti cumulativi e differenziati:
- **Base**: €3.50/ora (con tariffazione al minuto).
- **Sconto Elettrico**: -20%
- **Sconto Moto**: -30%
- **Sconto Disabilità**: -50% (applicabile a qualsiasi tipo di veicolo).
- **Abbonati**: Accesso gratuito e illimitato sul posto riservato.

---

## 🛡️ Sicurezza e Integrità
- **Data Isolation**: Ogni utente può accedere esclusivamente ai propri dati tramite filtri a livello di Repository.
- **Audit Ready**: Ogni sessione di parcheggio traccia orari di ingresso, uscita e calcoli economici certificati.
- **Soft Delete**: Gli abbonamenti scaduti vengono spostati in un "Cestino" prima della cancellazione definitiva, permettendo il ripristino o lo storico.
