package com.example.progetto_parking_system.controller;

import com.example.progetto_parking_system.model.Vehicle;
import com.example.progetto_parking_system.repository.UserRepository;
import com.example.progetto_parking_system.service.VehicleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/vehicles")
@RequiredArgsConstructor
@Slf4j
public class VehicleController {

    private final VehicleService service;
    private final UserRepository userRepository;

    @GetMapping
    public List<Vehicle> getAll(Authentication authentication) {
        if (authentication != null && authentication.getName() != null) {
            return service.findAllByUserUsername(authentication.getName());
        }
        return service.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id, Authentication auth) {
        java.util.Optional<Vehicle> vOpt = service.findById(id);
        if (vOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Vehicle v = vOpt.get();
        if (v.getUser() != null && !v.getUser().getUsername().equals(auth.getName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Non sei il proprietario di questo veicolo");
        }
        return ResponseEntity.ok(v);
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Vehicle entity, Authentication auth) {
        log.info("Creazione veicolo per utente: {}", auth.getName());
        
        String plate = entity.getTarga() != null ? entity.getTarga().toUpperCase().replace(" ", "").replace("-", "") : "";
        if (!plate.matches("^[A-Z0-9]{4,10}$")) {
            return ResponseEntity.badRequest().body("Formato targa non valido (4-10 caratteri alfanumerici)");
        }
        entity.setTarga(plate);

        java.util.Optional<com.example.progetto_parking_system.model.User> userOpt = userRepository.findByUsername(auth.getName());
        
        if (userOpt.isPresent()) {
            entity.setUser(userOpt.get());
            Vehicle saved = service.save(entity);
            log.info("Veicolo {} creato con successo", saved.getTarga());
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } else {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Utente non trovato");
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Vehicle entity, Authentication auth) {
        String plate = entity.getTarga() != null ? entity.getTarga().toUpperCase().replace(" ", "").replace("-", "") : "";
        if (!plate.matches("^[A-Z0-9]{4,10}$")) {
            return ResponseEntity.badRequest().body("Formato targa non valido");
        }
        entity.setTarga(plate);

        return service.findById(id)
                .map(existing -> {
                    if (existing.getUser() != null && !existing.getUser().getUsername().equals(auth.getName())) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Non puoi modificare veicoli altrui");
                    }
                    entity.setId(id);
                    entity.setUser(existing.getUser());
                    Vehicle updated = service.save(entity);
                    return ResponseEntity.ok(updated);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication auth) {
        return service.findById(id)
                .map(existing -> {
                    if (existing.getUser() != null && !existing.getUser().getUsername().equals(auth.getName())) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Non puoi eliminare veicoli altrui");
                    }
                    service.deleteById(id);
                    return ResponseEntity.noContent().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
