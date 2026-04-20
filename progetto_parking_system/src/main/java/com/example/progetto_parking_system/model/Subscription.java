package com.example.progetto_parking_system.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.util.List;

import com.example.progetto_parking_system.enums.SubscriptionType;

@Entity
@Data
public class Subscription {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    @Enumerated(EnumType.STRING)
    private SubscriptionType type; // MONTHLY, QUARTERLY, YEARLY

    private LocalDate startDate;
    private LocalDate endDate;

    /** QR code univoco valido per tutta la durata dell'abbonamento */
    private String qrCode;

    /** Flag: abbonamento attivo (non scaduto e non cancellato) */
    private Boolean active = true;

    /** Prezzo pagato all'acquisto */
    private Double pricePaid;

    /**
     * Veicoli associati all'abbonamento.
     * Un abbonamento può coprire più veicoli dello stesso utente.
     */
    @ManyToMany
    @JoinTable(
        name = "subscription_vehicles",
        joinColumns = @JoinColumn(name = "subscription_id"),
        inverseJoinColumns = @JoinColumn(name = "vehicle_id")
    )
    private List<Vehicle> vehicles;
}
