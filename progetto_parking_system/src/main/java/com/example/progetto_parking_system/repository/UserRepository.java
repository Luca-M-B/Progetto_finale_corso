package com.example.progetto_parking_system.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import com.example.progetto_parking_system.model.User;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);
}
