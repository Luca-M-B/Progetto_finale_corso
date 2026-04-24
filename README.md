# ParkSync
# Smart Parking Management System

## Stack Tecnologico
*   Backend: Java 17, Spring Boot 3, Spring Security (Session-based Auth)
*   Database: MySQL 8.0
*   Frontend: HTML5, CSS3 (Vanilla), JavaScript (ES6+)
*   Integrazioni: ZXing per la generazione di QR Code
*   Infrastruttura: Docker, Docker Compose
*   Build Tool: Maven

## Architettura e Scelte Tecniche
Il sistema adotta un'architettura Model-View-Controller (MVC) dove Spring Boot gestisce la logica di backend e l'esposizione delle API REST, mentre il frontend comunica in modo asincrono per garantire una User Experience fluida.

*   Sicurezza: Implementazione di Spring Security con autenticazione basata su sessione per proteggere i dati sensibili degli utenti e degli abbonamenti.
*   Logica di Business: Calcolo dinamico della tariffazione basato sulla tipologia di veicolo (sconti per elettrico e moto) e gestione automatizzata degli Spot riservati per gli abbonati.
*   Internazionalizzazione: Sistema "i18n" implementato nel frontend per il supporto completo alla lingua italiana e inglese.
*   Data Layer: Utilizzo di Spring Data JPA per l'astrazione del database e gestione delle relazioni complesse tra Utenti, Veicoli, Abbonamenti e Posti Auto.

## Configurazione iniziale
Per avviare l'intero ecosistema ParkSync, assicurarsi di avere Docker e Docker Compose installati sul sistema.

1.  Clonare il repository:
    git clone https://github.com/Luca-M-B/Progetto_ParkSync
2.  Accedere alla directory del progetto:
    cd Progetto_ParkSync
3.  Avviare i container:
    docker-compose up --build -d
4.  Utilizzo:
    - Web Application: http://localhost:8082
    - Database Administration (phpMyAdmin): http://localhost:8081

## Limitazioni del progetto
*   Simulazione Hardware: L'interazione con i sensori di parcheggio e le telecamere per il riconoscimento delle targhe è simulata tramite logica software.
*   Gateway di Pagamento: Le transazioni per l'acquisto di abbonamenti non sono collegate a circuiti bancari reali; il processo è puramente dimostrativo.
*   Notifiche: Il sistema non invia notifiche push o email reali, limitandosi a feedback visuali all'interno della piattaforma.

## Roadmap per scalabilità e sviluppi futuri
*   Integrazione Hardware: Collegamento a sistemi reali di riconoscimento targhe (LPR) e sensori IoT per il monitoraggio degli stalli in tempo reale.
*   Pagamenti Reali: Integrazione di SDK come Stripe o PayPal per la gestione sicura dei pagamenti online.
*   Microservizi: Refactoring dell'architettura in microservizi per separare la gestione utenti, il motore di tariffazione e il monitoraggio fisico dei parcheggi.
*   App Mobile: Sviluppo di un'applicazione nativa per permettere agli utenti di gestire il proprio profilo e visualizzare la disponibilità del parcheggio in mobilità.
*   Servizi Extra: Integrare servizi extra come la possibilità di ricaricare il proprio veicolo elettrico presso le colonnine di ricarica presenti nel parcheggio, servizio di lavaggio auto, serivizi taxi / navetta (sfruttare API di partner esterni per offrire tali servizi).
*   Intelligenza Artificiale: Implementazione di un sistema di intelligenza artificiale per l'ottimizzazione dei prezzi e la gestione dinamica degli stalli, massimizzando i profitti e garantendo la soddisfazione dei clienti.
