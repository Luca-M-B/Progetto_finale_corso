package com.example.progetto_parking_system.repository;

import com.example.progetto_parking_system.model.ParkingSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ParkingSessionRepository extends JpaRepository<ParkingSession, Long> {
    Optional<ParkingSession> findByQrCodeAndIsCompletedFalse(String qrCode);
    java.util.List<ParkingSession> findAllByIsCompletedFalse();
}
