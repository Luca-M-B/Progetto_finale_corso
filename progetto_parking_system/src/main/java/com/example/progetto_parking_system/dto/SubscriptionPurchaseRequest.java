package com.example.progetto_parking_system.dto;

import lombok.Data;
import java.util.List;

/**
 * Richiesta di acquisto abbonamento da parte dell'utente autenticato.
 * vehicleIds: lista degli ID dei veicoli da associare all'abbonamento.
 */
/**
 * Richiesta di acquisto abbonamento da parte dell'utente autenticato.
 * Include il tipo di abbonamento, il tipo di veicolo, la lingua e i veicoli associati.
 */
@Data
public class SubscriptionPurchaseRequest {
    private String type;           // MONTHLY, QUARTERLY, YEARLY
    private String vehicleType;    // CAR, MOTORBIKE, ELECTRIC, HANDICAPPED
    private List<Long> vehicleIds; // veicoli da includere nell'abbonamento
    private String language;       // it, en
}
