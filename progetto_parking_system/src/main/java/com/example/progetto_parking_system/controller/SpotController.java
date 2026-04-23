package com.example.progetto_parking_system.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.progetto_parking_system.model.Spot;
import com.example.progetto_parking_system.service.SpotService;

import java.util.List;

/**
 * Controller per la gestione dei singoli posti auto.
 */
@RestController
@RequestMapping("/api/spots")
public class SpotController {

    @Autowired
    private SpotService service; // Servizio per la gestione dei posti auto

    /**
     * Elenco di tutti i posti auto configurati nel parcheggio.
     */
    @GetMapping
    public List<Spot> getAll() {
        return service.findAll();
    }

    /**
     * Recupera i dettagli di un posto auto specifico tramite ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<Spot> getById(@PathVariable Long id) {
        return service.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Crea un nuovo posto auto.
     */
    @PostMapping
    public Spot create(@RequestBody Spot entity) {
        return service.save(entity);
    }

    /**
     * Aggiorna lo stato o le informazioni di un posto auto.
     */
    @PutMapping("/{id}")
    public ResponseEntity<Spot> update(@PathVariable Long id, @RequestBody Spot entity) {
        return service.findById(id)
                .map(existingEntity -> {
                    entity.setId(id);
                    return ResponseEntity.ok(service.save(entity));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Rimuove un posto auto dal sistema.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (service.findById(id).isPresent()) {
            service.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}
