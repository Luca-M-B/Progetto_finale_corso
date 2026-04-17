package com.example.progetto_parking_system.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.example.progetto_parking_system.model.Vehicle;

public interface VehicleRepository extends JpaRepository<Vehicle, Long> {
}
