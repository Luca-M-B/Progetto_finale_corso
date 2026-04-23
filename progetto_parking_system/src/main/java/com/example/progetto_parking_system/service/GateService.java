package com.example.progetto_parking_system.service;

import com.example.progetto_parking_system.dto.GateCheckInRequest;
import com.example.progetto_parking_system.dto.GateCheckOutRequest;
import com.example.progetto_parking_system.dto.GateResponse;
import com.example.progetto_parking_system.enums.SpotType;
import com.example.progetto_parking_system.model.ParkingSession;
import com.example.progetto_parking_system.model.Spot;
import com.example.progetto_parking_system.repository.ParkingSessionRepository;
import com.example.progetto_parking_system.repository.SpotRepository;
import com.example.progetto_parking_system.model.Subscription;
import com.example.progetto_parking_system.repository.SubscriptionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

/**
 * Servizio principale per la gestione degli ingressi (Check-in) e delle uscite (Check-out) dal parcheggio.
 * Coordina l'assegnazione dei posti auto, la validazione dei QR code e il calcolo dei costi delle soste.
 */
@Service
public class GateService {

    private static final double PRICE_PER_HOUR = 3.50; // Tariffa standard oraria per i non abbonati

    private final ParkingSessionRepository sessionRepository; // Accesso ai dati delle sessioni di sosta
    private final SpotRepository spotRepository;             // Accesso ai dati dei singoli posti auto
    private final SubscriptionRepository subscriptionRepository; // Accesso ai dati degli abbonamenti

    /**
     * Iniezione delle dipendenze tramite costruttore.
     */
    public GateService(ParkingSessionRepository sessionRepository,
            SpotRepository spotRepository,
            SubscriptionRepository subscriptionRepository) {
        this.sessionRepository = sessionRepository;
        this.spotRepository = spotRepository;
        this.subscriptionRepository = subscriptionRepository;
    }

    /**
     * Gestisce l'ingresso di un utente abbonato.
     * Verifica la validità del QR code dell'abbonamento e assegna il posto auto riservato senza costi aggiuntivi.
     * 
     * @param subscriptionQr Il codice QR dell'abbonamento mostrato al gate
     * @param licensePlate La targa del veicolo rilevata dalla telecamera
     * @return GateResponse con i dettagli del check-in (posto assegnato, piano, ecc.)
     */
    @Transactional
    public GateResponse handleSubscriptionCheckIn(String subscriptionQr, String licensePlate) {
        // Cerca l'abbonamento attivo corrispondente al QR code
        Optional<Subscription> subOpt = subscriptionRepository.findByQrCodeAndActiveTrueAndDeletedFalse(subscriptionQr);

        if (subOpt.isEmpty()) {
            GateResponse r = new GateResponse();
            r.setSuccess(false);
            r.setMessage("QR abbonamento non valido o abbonamento non più attivo");
            return r;
        }

        Subscription sub = subOpt.get();
        
        // Pulizia e validazione formale della targa tramite regex
        String rawTarga = licensePlate != null ? licensePlate.toUpperCase().trim() : "";
        if (!rawTarga.matches("^[A-Z0-9]{1,3}[-\\s]?[A-Z0-9]{1,6}$")) {
            GateResponse r = new GateResponse();
            r.setSuccess(false);
            r.setMessage("Formato targa non riconosciuto: " + rawTarga);
            return r;
        }
        
        // Normalizzazione targa (senza separatori) per l'archiviazione
        String plate = rawTarga.replace(" ", "").replace("-", "");

        // Impedisce il doppio ingresso se il veicolo risulta già all'interno
        if (sessionRepository.existsByLicensePlateAndIsCompletedFalse(plate)) {
            GateResponse r = new GateResponse();
            r.setSuccess(false);
            r.setMessage("Il veicolo " + plate + " è già presente nel sistema di sosta attiva");
            return r;
        }

        // Tipo di veicolo registrato per l'abbonamento
        String vType = sub.getVehicleType() != null ? sub.getVehicleType().name() : "CAR";

        // Verifica temporale dell'abbonamento
        if (LocalDate.now().isAfter(sub.getEndDate())) {
            sub.setActive(false); // Disattivazione automatica se scaduto
            subscriptionRepository.save(sub);
            GateResponse r = new GateResponse();
            r.setSuccess(false);
            r.setMessage("Abbonamento scaduto in data " + sub.getEndDate());
            return r;
        }

        // Verifica che la targa faccia parte dei veicoli autorizzati per questo abbonamento
        if (sub.getVehicles() != null && !sub.getVehicles().isEmpty()) {
            boolean plateAllowed = sub.getVehicles().stream()
                    .anyMatch(v -> plate.equalsIgnoreCase(v.getTarga()));
            if (!plateAllowed) {
                GateResponse r = new GateResponse();
                r.setSuccess(false);
                r.setMessage("Attenzione: la targa " + plate + " non è autorizzata per questo abbonamento");
                return r;
            }
        }

        // Recupera il posto auto riservato all'abbonato
        Spot spot = sub.getAssignedSpot();
        if (spot != null) {
            if (!spot.isOccupied()) {
                spot.setOccupied(true); // Occupa fisicamente il posto
                spotRepository.save(spot);
            }
        } else {
            // Se l'abbonamento non ha un posto fisso, ne cerca uno libero temporaneo
            Optional<Spot> spotOpt = spotRepository.findFirstByTypeAndOccupiedFalse(
                    sub.getVehicleType() != null ? sub.getVehicleType() : SpotType.CAR);
            if (spotOpt.isEmpty())
                spotOpt = spotRepository.findFirstByOccupiedFalse();

            if (spotOpt.isEmpty()) {
                GateResponse r = new GateResponse();
                r.setSuccess(false);
                r.setMessage("Spiacenti, il parcheggio è attualmente al completo");
                return r;
            }
            spot = spotOpt.get();
            spot.setOccupied(true);
            spotRepository.save(spot);

            sub.setAssignedSpot(spot);
            subscriptionRepository.save(sub);
        }

        // Registrazione della sessione di sosta (a costo zero per gli abbonati)
        LocalDateTime entryTime = LocalDateTime.now();
        ParkingSession session = new ParkingSession();
        session.setLicensePlate(plate);
        session.setVehicleType(vType);
        session.setHasDisability(sub.getVehicleType() == SpotType.HANDICAPPED);
        session.setEntryTime(entryTime);
        session.setIsCompleted(false);
        session.setQrCode(UUID.randomUUID().toString()); // Token per il check-out
        session.setSpot(spot);
        session.setCalculatedPrice(0.0); 
        sessionRepository.save(session);

        GateResponse resp = new GateResponse();
        resp.setSuccess(true);
        resp.setMessage("✅ Benvenuto! Ingresso abbonato autorizzato. Posto: " + spot.getCode()
                + " (Piano " + spot.getFloor().getLevel() + ")");
        resp.setQrCode(session.getQrCode());
        resp.setSpotCode(spot.getCode());
        resp.setFloorLevel(spot.getFloor().getLevel());
        resp.setEntryTime(entryTime);
        return resp;
    }

    /**
     * Gestisce l'ingresso di un utente occasionale (senza abbonamento).
     * 
     * @param request Dettagli del check-in (targa, tipologia veicolo)
     * @return GateResponse con il posto assegnato e il QR code per il pagamento
     */
    @Transactional
    public GateResponse handleCheckIn(GateCheckInRequest request) {
        // Validazione targa
        String rawTarga = request.getLicensePlate() != null ? request.getLicensePlate().toUpperCase().trim() : "";
        if (!rawTarga.matches("^[A-Z0-9]{1,3}[-\\s]?[A-Z0-9]{1,6}$")) {
            GateResponse r = new GateResponse();
            r.setSuccess(false);
            r.setMessage("Formato targa non valido: " + rawTarga);
            return r;
        }
        
        String plate = rawTarga.replace(" ", "").replace("-", "");
        String vType = request.getVehicleType() != null ? request.getVehicleType().toUpperCase() : "CAR";

        if (sessionRepository.existsByLicensePlateAndIsCompletedFalse(plate)) {
            GateResponse r = new GateResponse();
            r.setSuccess(false);
            r.setMessage("Veicolo già presente nel parcheggio");
            return r;
        }

        // Ricerca del posto auto idoneo (CAR, MOTORBIKE, ELECTRIC, ecc.)
        SpotType desiredType;
        switch (vType) {
            case "MOTORBIKE": desiredType = SpotType.MOTORBIKE; break;
            case "ELECTRIC":  desiredType = SpotType.ELECTRIC;  break;
            case "HANDICAPPED": desiredType = SpotType.HANDICAPPED; break;
            default: desiredType = SpotType.CAR; break;
        }

        // Priorità per disabili se specificato
        if (Boolean.TRUE.equals(request.getHasDisability())) {
            desiredType = SpotType.HANDICAPPED;
        }

        // Logica di fallback nella ricerca del posto
        Optional<Spot> spotOpt = spotRepository.findFirstByTypeAndOccupiedFalse(desiredType);
        if (spotOpt.isEmpty() && desiredType != SpotType.CAR) {
            spotOpt = spotRepository.findFirstByTypeAndOccupiedFalse(SpotType.CAR);
        }
        if (spotOpt.isEmpty()) {
            spotOpt = spotRepository.findFirstByOccupiedFalse();
        }

        if (spotOpt.isEmpty()) {
            GateResponse r = new GateResponse();
            r.setSuccess(false);
            r.setMessage("Spiacenti, nessun posto libero disponibile per questo tipo di veicolo");
            return r;
        }

        Spot spot = spotOpt.get();
        spot.setOccupied(true);
        spotRepository.save(spot);

        LocalDateTime entryTime = LocalDateTime.now();

        // Inizio nuova sessione di parcheggio
        ParkingSession session = new ParkingSession();
        session.setLicensePlate(plate);
        session.setVehicleType(vType);
        session.setHasDisability(Boolean.TRUE.equals(request.getHasDisability()));
        session.setEntryTime(entryTime);
        session.setIsCompleted(false);
        session.setQrCode(UUID.randomUUID().toString()); // Generazione ticket virtuale
        session.setSpot(spot);
        sessionRepository.save(session);

        GateResponse resp = new GateResponse();
        resp.setSuccess(true);
        resp.setMessage("Check-in completato. Parcheggia al posto: " + spot.getCode() + " (Piano " + spot.getFloor().getLevel() + ")");
        resp.setQrCode(session.getQrCode());
        resp.setSpotCode(spot.getCode());
        resp.setFloorLevel(spot.getFloor().getLevel());
        resp.setEntryTime(entryTime);
        return resp;
    }

    /**
     * Prima fase del check-out: scansione del ticket e calcolo importo.
     * 
     * @param request QR code del ticket e targa
     * @return Dettagli della sosta con l'importo calcolato da pagare
     */
    @Transactional(readOnly = true)
    public GateResponse handleCheckOut(GateCheckOutRequest request) {
        // Cerca la sessione ancora aperta tramite il QR code del ticket
        Optional<ParkingSession> optionalSession = sessionRepository
                .findByQrCodeAndIsCompletedFalse(request.getQrCode());

        if (optionalSession.isEmpty()) {
            GateResponse r = new GateResponse();
            r.setSuccess(false);
            r.setMessage("Il ticket scansionato non è valido o la sosta è già stata pagata");
            return r;
        }

        ParkingSession session = optionalSession.get();

        // Verifica di sicurezza sulla targa inserita dall'utente
        if (session.getLicensePlate() != null
                && !session.getLicensePlate().equalsIgnoreCase(request.getLicensePlate().replace(" ", "").replace("-", ""))) {
            GateResponse r = new GateResponse();
            r.setSuccess(false);
            r.setMessage("La targa inserita non corrisponde a quella registrata nel ticket");
            return r;
        }

        LocalDateTime exitTime = LocalDateTime.now();
        double calculatedPrice = calculatePrice(session, exitTime);

        // Informazioni sugli sconti applicati in base ai criteri del sistema
        String vType = session.getVehicleType() != null ? session.getVehicleType().toUpperCase() : "CAR";
        StringBuilder discountInfo = new StringBuilder();
        if (!vType.equals("CAR")) {
            if (vType.equals("ELECTRIC")) discountInfo.append(" [-20% Sconto Elettrico]");
            if (vType.equals("MOTORBIKE")) discountInfo.append(" [-30% Sconto Moto]");
        }
        if (Boolean.TRUE.equals(session.getHasDisability())) {
            discountInfo.append(" [-50% Sconto Disabilità]");
        }

        Spot spot = session.getSpot();
        String spotCode = spot != null ? spot.getCode() : "N/D";
        int floorLevel = (spot != null && spot.getFloor() != null) ? spot.getFloor().getLevel() : 0;

        GateResponse resp = new GateResponse();
        resp.setSuccess(true);
        resp.setMessage("Riepilogo sosta. Totale: €" + String.format("%.2f", calculatedPrice)
                + (discountInfo.length() > 0 ? "  " + discountInfo.toString().trim() : ""));
        resp.setAmountDue(calculatedPrice);
        resp.setQrCode(session.getQrCode());
        resp.setLicensePlate(session.getLicensePlate());
        resp.setSpotCode(spotCode);
        resp.setFloorLevel(floorLevel);
        resp.setEntryTime(session.getEntryTime());
        resp.setExitTime(exitTime);
        return resp;
    }

    /**
     * Seconda fase del check-out: conferma definitiva del pagamento.
     * Chiude la sessione e libera il posto auto per altri utenti.
     */
    @Transactional
    public GateResponse handlePaymentConfirmation(GateCheckOutRequest request) {
        Optional<ParkingSession> optionalSession = sessionRepository
                .findByQrCodeAndIsCompletedFalse(request.getQrCode());

        if (optionalSession.isEmpty()) {
            GateResponse r = new GateResponse();
            r.setSuccess(false);
            r.setMessage("Errore: sessione di parcheggio già chiusa o non trovata");
            return r;
        }

        ParkingSession session = optionalSession.get();
        LocalDateTime exitTime = LocalDateTime.now();
        double finalPrice = calculatePrice(session, exitTime);

        // Chiusura definitiva della sessione con salvataggio dei dati economici
        session.setExitTime(exitTime);
        session.setCalculatedPrice(finalPrice);
        session.setIsCompleted(true);

        // Libera il posto auto, a meno che non sia riservato permanentemente a un abbonato attivo
        Spot spot = session.getSpot();
        if (spot != null) {
            boolean isAssignedToActiveSub = subscriptionRepository.existsByAssignedSpotAndActiveTrueAndDeletedFalse(spot);
            if (!isAssignedToActiveSub) {
                spot.setOccupied(false);
                spotRepository.save(spot);
            }
        }

        sessionRepository.save(session);

        GateResponse resp = new GateResponse();
        resp.setSuccess(true);
        resp.setMessage("Pagamento confermato! Sbarra aperta. Arrivederci!");
        resp.setAmountDue(finalPrice);
        resp.setExitTime(exitTime);
        return resp;
    }

    /**
     * Calcola il prezzo finale basato sulla durata e sulla tipologia di veicolo/utente.
     * 
     * @param session La sessione di parcheggio
     * @param exitTime Orario di uscita
     * @return Importo totale in euro
     */
    private double calculatePrice(ParkingSession session, LocalDateTime exitTime) {
        long totalMinutes = Duration.between(session.getEntryTime(), exitTime).toMinutes();
        if (totalMinutes < 1) totalMinutes = 1; // Minimo un minuto di sosta
        double hours = totalMinutes / 60.0;
        double basePrice = hours * PRICE_PER_HOUR;

        double priceMultiplier = 1.0;
        String vType = session.getVehicleType() != null ? session.getVehicleType().toUpperCase() : "CAR";
        
        // Sconti per veicoli ecologici o moto
        switch (vType) {
            case "ELECTRIC":  priceMultiplier *= 0.80; break; // -20%
            case "MOTORBIKE": priceMultiplier *= 0.70; break; // -30%
            default: break;
        }

        // Sconto per disabili (cumulabile con altri sconti)
        if (Boolean.TRUE.equals(session.getHasDisability())) {
            priceMultiplier *= 0.50; // -50%
        }

        return Math.round(basePrice * priceMultiplier * 100.0) / 100.0;
    }

    /**
     * Procedura di reset del parcheggio (utilizzata per i test automatici).
     * Chiude tutte le sessioni e libera i posti non riservati agli abbonati.
     */
    @Transactional
    public String resetForTesting() {
        java.util.List<ParkingSession> openSessions = sessionRepository.findAllByIsCompletedFalse();
        for (ParkingSession s : openSessions) {
            s.setIsCompleted(true);
            s.setExitTime(LocalDateTime.now());
            s.setCalculatedPrice(0.0);
        }
        sessionRepository.saveAll(openSessions);

        java.util.List<Spot> occupiedSpots = spotRepository.findAllByOccupied(true);
        for (Spot sp : occupiedSpots) {
            boolean isReserved = subscriptionRepository.existsByAssignedSpotAndActiveTrueAndDeletedFalse(sp);
            if (!isReserved) {
                sp.setOccupied(false);
            }
        }
        spotRepository.saveAll(occupiedSpots);

        return "Reset del sistema completato con successo.";
    }

    /**
     * Verifica se un token di sessione è ancora in stato attivo.
     */
    public boolean isCheckInQrActive(String token) {
        return sessionRepository.findByQrCodeAndIsCompletedFalse(token).isPresent();
    }
}
