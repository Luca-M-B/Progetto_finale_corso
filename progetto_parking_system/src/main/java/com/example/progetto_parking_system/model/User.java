package com.example.progetto_parking_system.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

/**
 * Entità che rappresenta un utente registrato nel sistema.
 * Gestisce le credenziali di accesso, il ruolo e i dettagli dell'abbonamento attivo.
 */
@Entity
@Data
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String username;
    private String password;
    private String role; // USER, ADMIN

    // Subscription elements
    private Boolean active = false;
    private java.time.LocalDate subscriptionEndDate;
    private String subscriptionQrCode;
}