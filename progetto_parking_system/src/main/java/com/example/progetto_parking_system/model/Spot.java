package com.example.progetto_parking_system.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Data
public class Spot {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String code;

    @Enumerated(EnumType.STRING)
    private SpotType type;

    private boolean occupied;
}

