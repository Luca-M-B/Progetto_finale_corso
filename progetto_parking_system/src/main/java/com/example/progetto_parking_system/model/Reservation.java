package com.example.progetto_parking_system.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

import com.example.progetto_parking_system.enums.ReservationStatus;

@Entity
@Data
public class Reservation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    private User user;

    @ManyToOne
    private Spot spot;

    private LocalDateTime startTime;
    private LocalDateTime endTime;

    @Enumerated(EnumType.STRING)
    private ReservationStatus status;
}
