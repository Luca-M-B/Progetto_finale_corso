package com.example.progetto_parking_system.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.example.progetto_parking_system.model.Vehicle;
import java.util.List;

public interface VehicleRepository extends JpaRepository<Vehicle, Long> {
    List<Vehicle> findByUserUsername(String username);
    java.util.Optional<Vehicle> findByTarga(String targa);
}
