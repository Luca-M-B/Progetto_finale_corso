# ParkSync - Smart Parking Management System 🚗💨

**ParkSync** è una soluzione enterprise all'avanguardia per la gestione intelligente e automatizzata di parcheggi multipiano. Sviluppato come progetto finale di eccellenza, integra logiche di business complesse con una user experience premium, offrendo un ecosistema completo per utenti e gestori.

---

## 🎯 Obiettivo del Progetto
L'obiettivo di ParkSync è rivoluzionare la gestione della sosta urbana attraverso l'automazione. La piattaforma risolve tre criticità fondamentali:
1.  **Automazione dell'Accesso**: Utilizzo di QR Code dinamici e riconoscimento targhe per un'esperienza "touchless".
2.  **Gestione Smart degli Abbonamenti**: Assegnazione automatica di posti riservati garantiti basati sulla tipologia di veicolo.
3.  **Ottimizzazione dei Flussi**: Algoritmi di tariffazione dinamica che incentivano la mobilità sostenibile (sconti per veicoli elettrici e moto).

---

## 🛠️ Stack Tecnologico
Il progetto è stato costruito utilizzando le tecnologie più robuste e scalabili del panorama software attuale:

*   **Backend**: Java 17 con **Spring Boot 3.4**, Spring Security (Session-based Auth), Spring Data JPA.
*   **Database**: **MySQL 8.0** con gestione transazionale e sincronizzazione temporale localizzata.
*   **Frontend**: Architettura Single Page Application (SPA) sviluppata in **Vanilla JavaScript (ES6+)**, HTML5 e CSS3 moderno (Glassmorphism).
*   **Infrastruttura**: Completamente containerizzato tramite **Docker** e gestito con **Docker Compose** per una distribuzione immediata e consistente.
*   **Strumenti**: Maven per la build automation, FontAwesome 6 per l'iconografia, e motori di validazione Regex personalizzati.

---

## 🚀 Guida Rapida all'Avvio
ParkSync è pronto all'uso in pochi secondi grazie alla sua configurazione Docker:

1.  **Clona il repository**:
    ```bash
    git clone https://github.com/tuo-username/progetto_parking_system.git
    cd progetto_parking_system
    ```
2.  **Avvia lo stack**:
    ```bash
    docker-compose up --build -d
    ```
3.  **Accedi alla piattaforma**:
    *   **Web App**: [http://localhost:8082](http://localhost:8082)
    *   **Amministrazione DB**: [http://localhost:8081](http://localhost:8081)

---

## 💡 Approfondimenti Tecnici e Funzionali

### 🧠 Logiche di Business Avanzate
*   **Riconoscimento Targhe Intelligente**: Il sistema riconosce automaticamente gli abbonati al gate d'ingresso e d'uscita tramite la targa, consentendo l'accesso e l'uscita gratuita senza la necessità di ticket o QR Code fisici.
*   **Algoritmo Tariffario Dinamico**: Il costo della sosta (€3.50/ora base) viene calcolato al minuto e applica sconti cumulativi:
    *   **Elettrico**: -20%
    *   **Moto**: -30%
    *   **Disabilità**: -50%
*   **Posto Riservato Garantito**: Ogni abbonato riceve un posto auto esclusivo (Spot) che rimane bloccato per tutta la durata del piano, assicurando la disponibilità anche in condizioni di parcheggio pieno.

### 🛡️ Sicurezza e UX
*   **Internazionalizzazione (i18n)**: Interfaccia bilingue (IT/EN) con persistenza della lingua di registrazione per i documenti contrattuali.
*   **Design Premium**: L'interfaccia utilizza effetti di trasparenza, micro-animazioni e un sistema di icone dinamiche che si adattano al tipo di veicolo rilevato.
*   **Integrità dei Dati**: Implementazione di meccanismi di "Soft Delete" per gli abbonamenti e isolamento dei dati per ogni sessione utente.

---
*Sviluppato con passione per ridefinire il futuro della smart mobility.*
