package com.example.progetto_parking_system.service;

import com.example.progetto_parking_system.dto.GateCheckInRequest;
import com.example.progetto_parking_system.dto.GateCheckOutRequest;
import com.example.progetto_parking_system.dto.GateResponse;
import com.example.progetto_parking_system.enums.SpotType;
import com.example.progetto_parking_system.model.ParkingSession;
import com.example.progetto_parking_system.model.Spot;
import com.example.progetto_parking_system.repository.ParkingSessionRepository;
import com.example.progetto_parking_system.repository.SpotRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class GateService {

    private static final double PRICE_PER_HOUR = 3.50;

    private final ParkingSessionRepository sessionRepository;
    private final SpotRepository spotRepository;

    public GateService(ParkingSessionRepository sessionRepository, SpotRepository spotRepository) {
        this.sessionRepository = sessionRepository;
        this.spotRepository = spotRepository;
    }

    @Transactional
    public GateResponse handleCheckIn(GateCheckInRequest request) {
        String vehicleType = request.getVehicleType() != null
                ? request.getVehicleType().toUpperCase() : "CAR";

        // Determina tipo di posto in base al veicolo
        SpotType desiredType;
        switch (vehicleType) {
            case "MOTORBIKE": desiredType = SpotType.MOTORBIKE; break;
            case "ELECTRIC":  desiredType = SpotType.ELECTRIC;  break;
            default:          desiredType = SpotType.CAR;       break;
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
        session.setVehicleType(vehicleType);
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
        Optional<ParkingSession> optionalSession =
                sessionRepository.findByQrCodeAndIsCompletedFalse(request.getQrCode());

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
        if (totalMinutes < 1) totalMinutes = 1;
        double hours = totalMinutes / 60.0;
        double calculatedPrice = Math.round(hours * PRICE_PER_HOUR * 100.0) / 100.0;

        session.setCalculatedPrice(calculatedPrice);
        session.setIsCompleted(true);

        // Libera il posto
        Spot spot = session.getSpot();
        String spotCode = spot != null ? spot.getCode() : "N/A";
        int floorLevel = (spot != null && spot.getFloor() != null) ? spot.getFloor().getLevel() : 0;
        if (spot != null) {
            spot.setOccupied(false);
            spotRepository.save(spot);
        }

        sessionRepository.save(session);

        GateResponse resp = new GateResponse();
        resp.setSuccess(true);
        resp.setMessage("Check-out completato. Importo da pagare: €" + String.format("%.2f", calculatedPrice));
        resp.setAmountDue(calculatedPrice);
        resp.setSpotCode(spotCode);
        resp.setFloorLevel(floorLevel);
        resp.setEntryTime(session.getEntryTime());
        resp.setExitTime(exitTime);
        return resp;
    }
}
