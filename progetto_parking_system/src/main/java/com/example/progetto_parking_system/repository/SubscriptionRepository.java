package com.example.progetto_parking_system.repository;

import com.example.progetto_parking_system.model.Subscription;
import org.springframework.data.jpa.repository.JpaRepository;

import com.example.progetto_parking_system.model.Spot;
import java.util.List;
import java.util.Optional;

public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {
    List<Subscription> findByUserUsername(String username);
    Optional<Subscription> findByQrCodeAndActiveTrue(String qrCode);
    List<Subscription> findByUserUsernameAndActiveTrue(String username);
    boolean existsByAssignedSpotAndActiveTrue(Spot assignedSpot);
}
