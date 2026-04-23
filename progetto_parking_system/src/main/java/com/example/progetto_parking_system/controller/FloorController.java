package com.example.progetto_parking_system.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.progetto_parking_system.model.Floor;
import com.example.progetto_parking_system.service.FloorService;

import java.util.List;

/**
 * Controller per la gestione dei piani del parcheggio.
 */
@RestController
@RequestMapping("/api/floors")
public class FloorController {

    @Autowired
    private FloorService service; // Servizio per la gestione dei piani

    /**
     * Elenco di tutti i piani della struttura.
     */
    @GetMapping
    public List<Floor> getAll() {
        return service.findAll();
    }

    /**
     * Recupera un piano specifico tramite ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<Floor> getById(@PathVariable Long id) {
        return service.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Crea un nuovo piano.
     */
    @PostMapping
    public Floor create(@RequestBody Floor entity) {
        return service.save(entity);
    }

    /**
     * Aggiorna i dati di un piano.
     */
    @PutMapping("/{id}")
    public ResponseEntity<Floor> update(@PathVariable Long id, @RequestBody Floor entity) {
        return service.findById(id)
                .map(existingEntity -> {
                    entity.setId(id);
                    return ResponseEntity.ok(service.save(entity));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Elimina un piano dal sistema.
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
