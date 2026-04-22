package com.example.progetto_parking_system.repository;

import com.example.progetto_parking_system.model.Subscription;
import org.springframework.data.jpa.repository.JpaRepository;

import com.example.progetto_parking_system.model.Spot;
import java.util.List;
import java.util.Optional;

public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {
    List<Subscription> findByUserUsernameAndDeletedFalse(String username);
    List<Subscription> findByUserUsernameAndDeletedTrue(String username);
    Optional<Subscription> findByQrCodeAndActiveTrueAndDeletedFalse(String qrCode);
    List<Subscription> findByUserUsernameAndActiveTrueAndDeletedFalse(String username);
    boolean existsByAssignedSpotAndActiveTrueAndDeletedFalse(Spot assignedSpot);
}
