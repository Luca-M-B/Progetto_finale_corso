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

@Service
public class GateService {

    private static final double PRICE_PER_HOUR = 3.50;

    private final ParkingSessionRepository sessionRepository;
    private final SpotRepository spotRepository;
    private final SubscriptionRepository subscriptionRepository;

    public GateService(ParkingSessionRepository sessionRepository,
            SpotRepository spotRepository,
            SubscriptionRepository subscriptionRepository) {
        this.sessionRepository = sessionRepository;
        this.spotRepository = spotRepository;
        this.subscriptionRepository = subscriptionRepository;
    }

    /**
     * Check-in con QR abbonamento: verifica validità, assegna posto gratuitamente.
     * La targa deve essere tra quelle associate all'abbonamento.
     */
    @Transactional
    public GateResponse handleSubscriptionCheckIn(String subscriptionQr, String licensePlate) {
        Optional<Subscription> subOpt = subscriptionRepository.findByQrCodeAndActiveTrue(subscriptionQr);

        if (subOpt.isEmpty()) {
            GateResponse r = new GateResponse();
            r.setSuccess(false);
            r.setMessage("QR abbonamento non valido o abbonamento non attivo");
            return r;
        }

        Subscription sub = subOpt.get();
        String plate = licensePlate != null ? licensePlate.toUpperCase().replace(" ", "").replace("-", "") : "";

        // Determiniamo il tipo previsto (dall'abbonamento)
        String vType = sub.getVehicleType() != null ? sub.getVehicleType().name() : "CAR";

        // Validazione Targa differenziata
        boolean isValid;
        if ("MOTORBIKE".equalsIgnoreCase(vType)) {
            isValid = plate.matches("^[A-Z0-9]{5,7}$");
        } else {
            isValid = plate.matches("^[A-Z0-9]{7,10}$");
        }

        if (!isValid) {
            GateResponse r = new GateResponse();
            r.setSuccess(false);
            r.setMessage("Formato targa non valido per il tipo " + vType);
            return r;
        }

        // Controlla scadenza
        if (LocalDate.now().isAfter(sub.getEndDate())) {
            sub.setActive(false);
            subscriptionRepository.save(sub);
            GateResponse r = new GateResponse();
            r.setSuccess(false);
            r.setMessage("Abbonamento scaduto il " + sub.getEndDate());
            return r;
        }

        // Verifica che la targa sia tra quelle dell'abbonamento (se ci sono veicoli
        // associati)
        if (sub.getVehicles() != null && !sub.getVehicles().isEmpty()) {
            boolean plateAllowed = sub.getVehicles().stream()
                    .anyMatch(v -> plate.equalsIgnoreCase(v.getTarga()));
            if (!plateAllowed) {
                GateResponse r = new GateResponse();
                r.setSuccess(false);
                r.setMessage("Targa " + plate + " non associata a questo abbonamento");
                return r;
            }
        }

        // Usa il posto già assegnato all'abbonamento
        Spot spot = sub.getAssignedSpot();
        if (spot != null) {
            // Assicuriamoci che risulti occupato nel DB (es. dopo un reset-test o se
            // liberato per errore)
            if (!spot.isOccupied()) {
                spot.setOccupied(true);
                spotRepository.save(spot);
            }
        } else {
            // Fallback se per qualche motivo non ha un posto assegnato
            Optional<Spot> spotOpt = spotRepository.findFirstByTypeAndOccupiedFalse(
                    sub.getVehicleType() != null ? sub.getVehicleType() : SpotType.CAR);
            if (spotOpt.isEmpty())
                spotOpt = spotRepository.findFirstByOccupiedFalse();

            if (spotOpt.isEmpty()) {
                GateResponse r = new GateResponse();
                r.setSuccess(false);
                r.setMessage("Nessun posto disponibile");
                return r;
            }
            spot = spotOpt.get();
            spot.setOccupied(true);
            spotRepository.save(spot);

            sub.setAssignedSpot(spot);
            subscriptionRepository.save(sub);
        }

        LocalDateTime entryTime = LocalDateTime.now();
        ParkingSession session = new ParkingSession();
        session.setLicensePlate(plate);
        session.setVehicleType(sub.getVehicleType() != null ? sub.getVehicleType().name() : "CAR");
        session.setHasDisability(sub.getVehicleType() == SpotType.HANDICAPPED);
        session.setEntryTime(entryTime);
        session.setIsCompleted(false);
        session.setQrCode(UUID.randomUUID().toString()); // QR di sessione (!=QR abbonamento)
        session.setSpot(spot);
        session.setCalculatedPrice(0.0); // abbonato → gratis
        sessionRepository.save(session);

        GateResponse resp = new GateResponse();
        resp.setSuccess(true);
        resp.setMessage("✅ Abbonato — Ingresso gratuito! Posto RISERVATO: " + spot.getCode()
                + " - Piano " + spot.getFloor().getLevel()
                + " | Abbonamento valido fino al " + sub.getEndDate());
        resp.setQrCode(session.getQrCode());
        resp.setSpotCode(spot.getCode());
        resp.setFloorLevel(spot.getFloor().getLevel());
        resp.setEntryTime(entryTime);
        return resp;
    }

    @Transactional
    public GateResponse handleCheckIn(GateCheckInRequest request) {
        String plate = request.getLicensePlate() != null
                ? request.getLicensePlate().toUpperCase().replace(" ", "").replace("-", "")
                : "";
        String vType = request.getVehicleType() != null ? request.getVehicleType().toUpperCase() : "CAR";

        // Validazione Targa differenziata
        boolean isValid;
        if ("MOTORBIKE".equalsIgnoreCase(vType)) {
            isValid = plate.matches("^[A-Z0-9]{5,7}$");
        } else {
            isValid = plate.matches("^[A-Z0-9]{7,10}$");
        }

        if (!isValid) {
            GateResponse r = new GateResponse();
            r.setSuccess(false);
            r.setMessage("Formato targa non valido per il tipo " + vType);
            return r;
        }

        // Determina tipo di posto in base al veicolo
        SpotType desiredType;
        switch (vType) {
            case "MOTORBIKE":
                desiredType = SpotType.MOTORBIKE;
                break;
            case "ELECTRIC":
                desiredType = SpotType.ELECTRIC;
                break;
            default:
                desiredType = SpotType.CAR;
                break;
        }

        // Cerca posto libero del tipo corretto, fallback a CAR, poi qualsiasi libero
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
            r.setMessage("Nessun posto disponibile nel parcheggio");
            return r;
        }

        Spot spot = spotOpt.get();
        spot.setOccupied(true);
        spotRepository.save(spot);

        LocalDateTime entryTime = LocalDateTime.now();

        ParkingSession session = new ParkingSession();
        session.setLicensePlate(request.getLicensePlate().toUpperCase().trim());
        session.setVehicleType(vType);
        session.setHasDisability(Boolean.TRUE.equals(request.getHasDisability()));
        session.setEntryTime(entryTime);
        session.setIsCompleted(false);
        session.setQrCode(UUID.randomUUID().toString());
        session.setSpot(spot);

        sessionRepository.save(session);

        GateResponse resp = new GateResponse();
        resp.setSuccess(true);
        resp.setMessage("Check-in effettuato! Posto: " + spot.getCode()
                + " - Piano " + spot.getFloor().getLevel());
        resp.setQrCode(session.getQrCode());
        resp.setSpotCode(spot.getCode());
        resp.setFloorLevel(spot.getFloor().getLevel());
        resp.setEntryTime(entryTime);
        return resp;
    }

    @Transactional
    public GateResponse handleCheckOut(GateCheckOutRequest request) {
        Optional<ParkingSession> optionalSession = sessionRepository
                .findByQrCodeAndIsCompletedFalse(request.getQrCode());

        if (optionalSession.isEmpty()) {
            GateResponse r = new GateResponse();
            r.setSuccess(false);
            r.setMessage("QR Code non valido o sessione già terminata");
            return r;
        }

        ParkingSession session = optionalSession.get();

        // Verifica targa
        if (session.getLicensePlate() != null
                && !session.getLicensePlate().equalsIgnoreCase(request.getLicensePlate().trim())) {
            GateResponse r = new GateResponse();
            r.setSuccess(false);
            r.setMessage("Targa non corrispondente al QR Code");
            return r;
        }

        LocalDateTime exitTime = LocalDateTime.now();
        session.setExitTime(exitTime);

        // Calcolo costo: minimo 1 minuto, tariffazione al minuto su base €3.50/h
        long totalMinutes = Duration.between(session.getEntryTime(), exitTime).toMinutes();
        if (totalMinutes < 1)
            totalMinutes = 1;
        double hours = totalMinutes / 60.0;
        double basePrice = hours * PRICE_PER_HOUR;

        // Sconti MOLTIPLICATIVI (a cascata): ogni sconto si applica sul prezzo già
        // scontato,
        // NON si sommano le percentuali. Esempio: disabile con elettrico → base × 0.80
        // × 0.50
        double priceMultiplier = 1.0;

        // Sconto per tipo veicolo
        String vType = session.getVehicleType() != null ? session.getVehicleType().toUpperCase() : "CAR";
        switch (vType) {
            case "ELECTRIC":
                priceMultiplier *= 0.80;
                break; // -20%
            case "MOTORBIKE":
                priceMultiplier *= 0.70;
                break; // -30%
            default:
                break; // nessuno sconto
        }

        // Sconto disabilità applicato SUL prezzo già scontato dal tipo veicolo
        if (Boolean.TRUE.equals(session.getHasDisability())) {
            priceMultiplier *= 0.50; // -50% sul prezzo corrente
        }

        double calculatedPrice = Math.round(basePrice * priceMultiplier * 100.0) / 100.0;

        session.setCalculatedPrice(calculatedPrice);
        session.setIsCompleted(true);

        // Libera il posto SOLO SE non è assegnato a un abbonamento attivo
        Spot spot = session.getSpot();
        String spotCode = spot != null ? spot.getCode() : "N/A";
        int floorLevel = (spot != null && spot.getFloor() != null) ? spot.getFloor().getLevel() : 0;

        if (spot != null) {
            boolean isAssignedToActiveSub = subscriptionRepository.existsByAssignedSpotAndActiveTrue(spot);
            if (!isAssignedToActiveSub) {
                spot.setOccupied(false);
                spotRepository.save(spot);
            }
        }

        sessionRepository.save(session);

        // Costruisci descrizione sconto per il messaggio
        StringBuilder discountInfo = new StringBuilder();
        if (!vType.equals("CAR")) {
            if (vType.equals("ELECTRIC"))
                discountInfo.append(" [-20% elettrico]");
            if (vType.equals("MOTORBIKE"))
                discountInfo.append(" [-30% moto]");
        }
        if (Boolean.TRUE.equals(session.getHasDisability())) {
            discountInfo.append(" [-50% disabilità]");
        }

        GateResponse resp = new GateResponse();
        resp.setSuccess(true);
        resp.setMessage("Check-out completato. Importo da pagare: €" + String.format("%.2f", calculatedPrice)
                + (discountInfo.length() > 0 ? "  " + discountInfo.toString().trim() : ""));
        resp.setAmountDue(calculatedPrice);
        resp.setSpotCode(spotCode);
        resp.setFloorLevel(floorLevel);
        resp.setEntryTime(session.getEntryTime());
        resp.setExitTime(exitTime);
        return resp;
    }

    /**
     * SOLO PER TEST: libera tutti i posti occupati e chiude tutte le sessioni
     * aperte.
     * Non calcola prezzi — serve solo a resettare lo stato del parcheggio tra un
     * test e l'altro.
     */
    @Transactional
    public String resetForTesting() {
        // 1. Chiudi tutte le sessioni ancora aperte
        java.util.List<com.example.progetto_parking_system.model.ParkingSession> openSessions = sessionRepository
                .findAllByIsCompletedFalse();
        for (com.example.progetto_parking_system.model.ParkingSession s : openSessions) {
            s.setIsCompleted(true);
            s.setExitTime(java.time.LocalDateTime.now());
            s.setCalculatedPrice(0.0);
        }
        sessionRepository.saveAll(openSessions);

        // 2. Libera tutti i posti occupati (tranne quelli assegnati ad abbonamenti
        // attivi)
        java.util.List<com.example.progetto_parking_system.model.Spot> occupiedSpots = spotRepository
                .findAllByOccupied(true);
        for (com.example.progetto_parking_system.model.Spot sp : occupiedSpots) {
            boolean isReserved = subscriptionRepository.existsByAssignedSpotAndActiveTrue(sp);
            if (!isReserved) {
                sp.setOccupied(false);
            }
        }
        spotRepository.saveAll(occupiedSpots);

        return "Reset completato: " + openSessions.size() + " sessioni chiuse, "
                + occupiedSpots.size() + " posti liberati.";
    }

    /**
     * Verifica se un token di check-in è ancora attivo (sessione non completata).
     * Usato dal GateController per decidere se generare il QR code di sessione.
     *
     * @param token il qrCode della ParkingSession
     * @return true se la sessione esiste ed è ancora aperta (non completata)
     */
    public boolean isCheckInQrActive(String token) {
        return sessionRepository.findByQrCodeAndIsCompletedFalse(token).isPresent();
    }
}
