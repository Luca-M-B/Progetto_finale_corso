package com.example.progetto_parking_system.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.progetto_parking_system.model.ExtraService;
import com.example.progetto_parking_system.service.ExtraServiceService;

import java.util.List;

/**
 * Controller per la gestione dei servizi extra (es. lavaggio auto, ricarica elettrica).
 */
@RestController
@RequestMapping("/api/extra-services")
public class ExtraServiceController {

    @Autowired
    private ExtraServiceService service; // Servizio per la gestione dei servizi extra

    /**
     * Elenco di tutti i servizi extra disponibili nel parcheggio.
     */
    @GetMapping
    public List<ExtraService> getAll() {
        return service.findAll();
    }

    /**
     * Recupera un servizio extra tramite ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ExtraService> getById(@PathVariable Long id) {
        return service.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Registra un nuovo servizio extra.
     */
    @PostMapping
    public ExtraService create(@RequestBody ExtraService entity) {
        return service.save(entity);
    }

    /**
     * Aggiorna i dati di un servizio extra.
     */
    @PutMapping("/{id}")
    public ResponseEntity<ExtraService> update(@PathVariable Long id, @RequestBody ExtraService entity) {
        return service.findById(id)
                .map(existingEntity -> {
                    entity.setId(id);
                    return ResponseEntity.ok(service.save(entity));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Elimina un servizio extra dal sistema.
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
