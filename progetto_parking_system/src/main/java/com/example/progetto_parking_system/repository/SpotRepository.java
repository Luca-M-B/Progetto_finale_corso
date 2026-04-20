package com.example.progetto_parking_system.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.example.progetto_parking_system.model.Spot;

import java.util.Optional;
import com.example.progetto_parking_system.enums.SpotType;

public interface SpotRepository extends JpaRepository<Spot, Long> {
    Optional<Spot> findFirstByTypeAndOccupiedFalse(SpotType type);
}
