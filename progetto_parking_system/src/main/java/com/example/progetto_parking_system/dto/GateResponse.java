package com.example.progetto_parking_system.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class GateResponse {
    private boolean success;
    private String message;
    private String qrCode;
    private String licensePlate;

    private Double amountDue;
    private String spotCode;
    private Integer floorLevel;
    private LocalDateTime entryTime;
    private LocalDateTime exitTime;
}
