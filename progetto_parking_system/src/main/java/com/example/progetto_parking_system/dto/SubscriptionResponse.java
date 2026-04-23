package com.example.progetto_parking_system.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDate;
import java.util.List;

/**
 * Risposta contenente i dettagli di un abbonamento per il frontend.
 * Include informazioni su validità, QR code, posto assegnato e lingua di registrazione.
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
    private String language;
    private String message;
}
