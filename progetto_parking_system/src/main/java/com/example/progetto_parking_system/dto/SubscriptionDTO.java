package com.example.progetto_parking_system.dto;

import lombok.Data;
import java.time.LocalDate;

/**
 * DTO per la risposta relativa a un abbonamento.
 */
@Data
public class SubscriptionDTO {
    private Long id;
    private String type; // MONTHLY, QUARTERLY, YEARLY
    private String vehicleType; // CAR, MOTORBIKE, ELECTRIC, HANDICAPPED
    private LocalDate startDate;
    private LocalDate endDate;
    private boolean active;
    private double price;
    private String userId;
    private String userEmail;
}
