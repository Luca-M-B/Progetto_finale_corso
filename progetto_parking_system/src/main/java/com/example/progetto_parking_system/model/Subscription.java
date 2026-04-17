package com.example.progetto_parking_system.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;

import com.example.progetto_parking_system.enums.SubscriptionType;

@Entity
@Data
public class Subscription {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    private User user;

    @Enumerated(EnumType.STRING)
    private SubscriptionType type;

    private LocalDate startDate;
    private LocalDate endDate;
}
