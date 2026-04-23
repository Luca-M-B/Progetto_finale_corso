package com.example.progetto_parking_system.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.ManyToOne;
import lombok.Data;

/**
 * Entità che rappresenta un veicolo nel sistema.
 * Ogni veicolo è identificato univocamente dalla targa ed è associato a un proprietario (User).
 */
@Entity
@Data
public class Vehicle {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true)
    private String targa; // Targa univoca del veicolo

    private String tipo; // Tipologia di veicolo (es. CAR, MOTORBIKE)

    @ManyToOne
    private User user; // Proprietario del veicolo
}
