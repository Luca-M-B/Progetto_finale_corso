# ParkSync - Sistema di Gestione Parcheggio Intelligente

**ParkSync** è un'applicazione web moderna per la gestione automatizzata di un parcheggio multipiano. Il sistema è progettato per ottimizzare l'assegnazione dei posti, gestire abbonamenti ricorrenti e fornire un'interfaccia intuitiva sia per gli utenti che per la simulazione degli accessi (Gate).

## 🎯 Obiettivi del Progetto

L'obiettivo principale di ParkSync è eliminare la gestione manuale del parcheggio, introducendo:
1.  **Assegnazione Dinamica**: Selezione automatica del miglior posto disponibile in base alla tipologia di veicolo (Auto, Moto, Elettrica, Disabili).
2.  **Sistema di Abbonamento Premium**: Gestione di abbonamenti con **posto riservato garantito** (il posto bleibt assegnato all'utente per tutta la durata dell'abbonamento).
3.  **Monitoraggio in Tempo Reale**: Tracciamento delle sessioni di parcheggio, dei tempi di permanenza e dei pagamenti dovuti.
4.  **Sicurezza e Isolamento**: Accesso protetto tramite autenticazione basata su sessione, dove ogni utente può gestire solo i propri veicoli e abbonamenti.

---

## 🚀 Funzionamento del Programma

### 1. Autenticazione e Profilo Utente
Gli utenti possono registrarsi selezionando un tipo di abbonamento iniziale. Il sistema utilizza Spring Security per gestire le sessioni in modo sicuro. Una volta loggati, gli utenti hanno accesso a una dashboard personalizzata.

### 2. Gestione Veicoli
Nella sezione "I Miei Veicoli", l'utente può registrare le proprie targhe.
-   **Semplificazione**: Non è necessario inserire il modello del veicolo.
-   **Automazione**: La tipologia del veicolo viene ereditata automaticamente dall'abbonamento attivo dell'utente.
-   **Validazione**: Il sistema controlla che le targhe rispettino i formati europei standard e che siano coerenti con il tipo di veicolo (es. formati specifici per le moto).

### 3. Abbonamenti e Posti Riservati
L'applicazione offre piani Mensili, Trimestrali e Annuali.
-   **Acquisto**: Al momento dell'acquisto, il sistema assegna istantaneamente un posto libero corrispondente al tipo di veicolo dell'utente.
-   **Persistenza**: Quel posto è **esclusivo**. Nessun altro utente (standard o abbonato) potrà occuparlo, nemmeno se il veicolo dell'abbonato non è fisicamente nel parcheggio.
-   **QR Code**: Viene generato un codice univoco per l'accesso rapido al gate.

### 4. Simulatore Gate (Ingresso/Uscita)
Il simulatore permette di testare i flussi di check-in e check-out:

*   **Check-in Standard**: Un utente senza abbonamento inserisce la targa e il tipo di veicolo. Il sistema assegna un posto libero e inizia il conteggio del tempo.
*   **Check-in Abbonati**: Utilizzando il proprio QR Code e la targa, l'abbonato viene riconosciuto e indirizzato al suo **posto riservato**.
*   **Check-out**: Il sistema calcola il tempo trascorso, applica la tariffa oraria (gratuito per gli abbonati) e genera una ricevuta.
*   **Protezione Posti**: Quando un abbonato esce, il suo posto **rimane occupato/riservato** nel sistema, assicurando che sia sempre disponibile al suo ritorno.

---

## 🛠️ Stack Tecnologico

-   **Backend**: Java 17 con **Spring Boot 3.x**
    -   **Spring Security**: Gestione autenticazione e autorizzazioni.
    -   **Spring Data JPA**: Persistenza dei dati su database relazionale.
    -   **Lombok**: Riduzione del boilerplate code.
-   **Frontend**: HTML5, CSS3 (Vanilla con design moderno/vetro-morfismo), JavaScript (Vanilla ES6+).
-   **Database**: H2 (Database in-memory per sviluppo rapido) o MySQL/PostgreSQL.

---

## 📦 Installazione e Avvio

1.  Assicurarsi di avere installato **Java 17** e **Maven**.
2.  Clonare il repository.
3.  Eseguire il comando per compilare e avviare:
    ```bash
    ./mvnw spring-boot:run
    ```
4.  Aprire il browser all'indirizzo: `http://localhost:8080`

---

## 🛡️ Controlli di Sicurezza e Validazione
-   **Validazione Targhe**: Regex differenziate per Auto (7-10 caratteri) e Moto (5-7 caratteri).
-   **Protezione Dati**: Ogni utente può visualizzare, modificare o eliminare solo i veicoli associati al proprio account.
-   **Gestione Errori**: Tutte le operazioni critiche (check-in, check-out, acquisto abbonamento) sono gestite tramite transazioni database per garantire la coerenza.
