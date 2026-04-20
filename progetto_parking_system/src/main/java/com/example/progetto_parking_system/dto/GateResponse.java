package com.example.progetto_parking_system.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class GateResponse {
    private boolean success;
    private String message;
    private String qrCode;
    private Double amountDue;
    private String spotCode;
    private Long durationHours;
}
