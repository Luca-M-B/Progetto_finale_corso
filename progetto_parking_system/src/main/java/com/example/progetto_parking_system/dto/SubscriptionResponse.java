package com.example.progetto_parking_system.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.util.List;

/**
 * Risposta dopo acquisto o consultazione abbonamento.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
public class SubscriptionResponse {
    private Long id;
    private String type;
    private String vehicleType;
    private String spotCode;
    private LocalDate startDate;
    private LocalDate endDate;
    private String qrCode;
    private Boolean active;
    private Double pricePaid;
    private List<String> vehiclePlates; // targhe dei veicoli associati
    private String message;
}
