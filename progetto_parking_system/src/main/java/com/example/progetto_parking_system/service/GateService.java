package com.example.progetto_parking_system.service;

import com.example.progetto_parking_system.dto.GateCheckInRequest;
import com.example.progetto_parking_system.dto.GateResponse;
import com.example.progetto_parking_system.enums.SpotType;
import com.example.progetto_parking_system.model.ParkingSession;
import com.example.progetto_parking_system.model.Spot;
import com.example.progetto_parking_system.repository.ParkingSessionRepository;
import com.example.progetto_parking_system.repository.SpotRepository;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class GateService {

    private final ParkingSessionRepository sessionRepository;
    private final SpotRepository spotRepository;

    public GateService(ParkingSessionRepository sessionRepository, SpotRepository spotRepository) {
        this.sessionRepository = sessionRepository;
        this.spotRepository = spotRepository;
    }

    public GateResponse handleCheckIn(GateCheckInRequest request) {
        String vehType = request.getVehicleType() != null ? request.getVehicleType().toUpperCase() : "CAR";
        boolean hasDisability = Boolean.TRUE.equals(request.getHasDisability());

        SpotType targetType = SpotType.CAR;
        if (hasDisability) targetType = SpotType.HANDICAPPED;
        else if ("ELECTRIC_CAR".equals(vehType)) targetType = SpotType.ELECTRIC;
        else if ("MOTORBIKE".equals(vehType)) targetType = SpotType.MOTORBIKE;

        Spot assignedSpot = spotRepository.findFirstByTypeAndOccupiedFalse(targetType).orElse(null);

        // Fallback to CAR spot if preferred type full
        if (assignedSpot == null && targetType != SpotType.CAR) {
            assignedSpot = spotRepository.findFirstByTypeAndOccupiedFalse(SpotType.CAR).orElse(null);
        }

        // Auto-create a spot if none available in DB (no physical spot pre-configured)
        if (assignedSpot == null) {
            Spot newSpot = new Spot();
            newSpot.setType(targetType);
            newSpot.setCode(targetType.name() + "-" + UUID.randomUUID().toString().substring(0, 4).toUpperCase());
            newSpot.setOccupied(true);
            assignedSpot = spotRepository.save(newSpot);
        } else {
            assignedSpot.setOccupied(true);
            spotRepository.save(assignedSpot);
        }

        ParkingSession session = new ParkingSession();
        session.setLicensePlate(request.getLicensePlate());
        session.setVehicleType(vehType);
        session.setHasDisability(hasDisability);
        session.setEntryTime(LocalDateTime.now());
        session.setIsCompleted(false);
        session.setQrCode(UUID.randomUUID().toString());
        session.setSpot(assignedSpot);

        sessionRepository.save(session);
        return new GateResponse(true, "Check-In effettuato con successo", session.getQrCode(), null, assignedSpot.getCode(), null);
    }

    public GateResponse getTicketInfo(String qrCode) {
        Optional<ParkingSession> optionalSession = sessionRepository.findByQrCodeAndIsCompletedFalse(qrCode);
        if (optionalSession.isEmpty()) {
            return new GateResponse(false, "QR Code non valido o sessione già terminata", null, null, null, null);
        }

        ParkingSession session = optionalSession.get();
        LocalDateTime exitTime = LocalDateTime.now();
        
        long hours = Duration.between(session.getEntryTime(), exitTime).toHours();
        if (hours == 0) hours = 1; // Minimum 1 hour charge

        double baseRate = 3.50; // New base rate
        double calculatedPrice = baseRate * hours;

        if (Boolean.TRUE.equals(session.getHasDisability())) {
            calculatedPrice = 0.0;
        } else if ("ELECTRIC_CAR".equals(session.getVehicleType())) {
            calculatedPrice *= 0.5; // 50% discount
        } else if ("MOTORBIKE".equals(session.getVehicleType())) {
            calculatedPrice *= 0.7; // 30% discount
        }

        return new GateResponse(true, "Dettagli ticket caricati", qrCode, calculatedPrice, session.getSpot() != null ? session.getSpot().getCode() : null, hours);
    }

    public GateResponse payAndLeave(String qrCode) {
         Optional<ParkingSession> optionalSession = sessionRepository.findByQrCodeAndIsCompletedFalse(qrCode);
         if (optionalSession.isEmpty()) {
             return new GateResponse(false, "QR Code non valido o sessione già terminata", null, null, null, null);
         }
 
         ParkingSession session = optionalSession.get();
         
         // We will trigger a fresh calculation for the payment
         GateResponse ticket = getTicketInfo(qrCode);
         
         session.setExitTime(LocalDateTime.now());
         session.setCalculatedPrice(ticket.getAmountDue());
         session.setIsCompleted(true);
         session.setLicensePlate(null); // Privacy scrub
         
         Spot spot = session.getSpot();
         if (spot != null) {
             spot.setOccupied(false);
             spotRepository.save(spot);
         }
         
         sessionRepository.save(session);
         
         return new GateResponse(true, "Pagamento completato, puoi uscire.", null, ticket.getAmountDue(), null, null);
    }
}
