package com.example.progetto_parking_system.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.util.List;

import com.example.progetto_parking_system.enums.SubscriptionType;

/**
 * Entità che rappresenta un abbonamento acquistato da un utente.
 * L'abbonamento garantisce un posto auto riservato per un determinato periodo
 * e genera un QR code univoco per l'accesso facilitato al parcheggio.
 */
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

    @Enumerated(EnumType.STRING)
    private com.example.progetto_parking_system.enums.SpotType vehicleType; // CAR, MOTORBIKE, ELECTRIC, HANDICAPPED

    @OneToOne
    @JoinColumn(name = "spot_id")
    private Spot assignedSpot;

    private LocalDate startDate;
    private LocalDate endDate;

    /** QR code univoco valido per tutta la durata dell'abbonamento */
    private String qrCode;

    /** Flag: abbonamento attivo (non scaduto e non cancellato) */
    private Boolean active = true;

    /** Flag: abbonamento rimosso dall'utente (va nel cestino) */
    private Boolean deleted = false;

    /** Prezzo pagato all'acquisto */
    private Double pricePaid;

    /** Lingua utilizzata al momento della registrazione/acquisto (per localizzazione persistente) */
    private String language;

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
