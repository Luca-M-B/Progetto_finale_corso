package com.example.progetto_parking_system.service;

import com.example.progetto_parking_system.dto.GateCheckInRequest;
import com.example.progetto_parking_system.dto.GateCheckOutRequest;
import com.example.progetto_parking_system.dto.GateResponse;
import com.example.progetto_parking_system.model.ParkingSession;
import com.example.progetto_parking_system.repository.ParkingSessionRepository;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class GateService {

    private final ParkingSessionRepository sessionRepository;

    public GateService(ParkingSessionRepository sessionRepository) {
        this.sessionRepository = sessionRepository;
    }

    public GateResponse handleCheckIn(GateCheckInRequest request) {
        ParkingSession session = new ParkingSession();
        session.setLicensePlate(request.getLicensePlate());
        session.setVehicleType(request.getVehicleType() != null ? request.getVehicleType().toUpperCase() : "CAR");
        session.setHasDisability(Boolean.TRUE.equals(request.getHasDisability()));
        session.setEntryTime(LocalDateTime.now());
        session.setIsCompleted(false);
        session.setQrCode(UUID.randomUUID().toString());

        sessionRepository.save(session);
        return new GateResponse(true, "Check-In effettuato con successo", session.getQrCode(), null);
    }

    public GateResponse handleCheckOut(GateCheckOutRequest request) {
        Optional<ParkingSession> optionalSession = sessionRepository.findByQrCodeAndIsCompletedFalse(request.getQrCode());
        if (optionalSession.isEmpty()) {
            return new GateResponse(false, "QR Code non valido o sessione già terminata", null, null);
        }

        ParkingSession session = optionalSession.get();

        // Advanced security: matching plate
        if (session.getLicensePlate() != null && !session.getLicensePlate().equalsIgnoreCase(request.getLicensePlate())) {
            return new GateResponse(false, "Targa non corrispondente al QR Code", null, null);
        }

        LocalDateTime exitTime = LocalDateTime.now();
        session.setExitTime(exitTime);
        
        long hours = Duration.between(session.getEntryTime(), exitTime).toHours();
        if (hours == 0) hours = 1;

        double baseRate = 2.0; // 2 euros per hour
        double calculatedPrice = baseRate * hours;

        if (Boolean.TRUE.equals(session.getHasDisability())) {
            calculatedPrice = 0.0;
        } else if ("ELECTRIC_CAR".equals(session.getVehicleType())) {
            calculatedPrice *= 0.5; // 50% discount
        } else if ("MOTORBIKE".equals(session.getVehicleType())) {
            calculatedPrice *= 0.7; // 30% discount
        }

        session.setCalculatedPrice(calculatedPrice);
        session.setIsCompleted(true);
        
        // Remove license plate for privacy
        session.setLicensePlate(null);

        sessionRepository.save(session);

        return new GateResponse(true, "Check-Out effettuato con successo", null, calculatedPrice);
    }
}
