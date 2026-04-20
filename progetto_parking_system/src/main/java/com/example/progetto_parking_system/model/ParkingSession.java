package com.example.progetto_parking_system.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Data
public class ParkingSession {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String licensePlate;
    private String qrCode;
    private LocalDateTime entryTime;
    private LocalDateTime exitTime;
    
    private String vehicleType; // CAR, MOTORBIKE, ELECTRIC_CAR
    private Boolean hasDisability;
    
    @jakarta.persistence.ManyToOne
    @jakarta.persistence.JoinColumn(name = "spot_id")
    private Spot spot;

    private Double calculatedPrice;
    private Boolean isCompleted;
}
