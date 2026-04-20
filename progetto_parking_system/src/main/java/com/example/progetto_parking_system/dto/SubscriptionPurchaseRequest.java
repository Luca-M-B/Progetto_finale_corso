package com.example.progetto_parking_system.dto;

import lombok.Data;
import java.util.List;

/**
 * Richiesta di acquisto abbonamento da parte dell'utente autenticato.
 * vehicleIds: lista degli ID dei veicoli da associare all'abbonamento.
 */
@Data
public class SubscriptionPurchaseRequest {
    private String type;           // MONTHLY, QUARTERLY, YEARLY
    private List<Long> vehicleIds; // veicoli da includere nell'abbonamento
}
