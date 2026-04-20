package com.example.progetto_parking_system.dto;

import lombok.Data;

@Data
public class GateCheckOutRequest {
    private String qrCode;
    private String licensePlate;
}
