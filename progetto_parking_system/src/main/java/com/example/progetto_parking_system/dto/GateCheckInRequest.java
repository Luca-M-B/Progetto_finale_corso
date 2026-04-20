package com.example.progetto_parking_system.dto;

import lombok.Data;

@Data
public class GateCheckInRequest {
    private String licensePlate;
    private String vehicleType; // CAR, MOTORBIKE, ELECTRIC_CAR
    private Boolean hasDisability;
}
