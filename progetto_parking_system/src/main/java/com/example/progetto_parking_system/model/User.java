package com.example.progetto_parking_system.model;

import java.util.List;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.Data;

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
    private String refreshToken;

    // Subscription elements
    private Boolean active = false;
    private java.time.LocalDate subscriptionEndDate;
    private String subscriptionQrCode;

    @OneToMany(mappedBy = "user")
    private List<Reservation> reservations;

}