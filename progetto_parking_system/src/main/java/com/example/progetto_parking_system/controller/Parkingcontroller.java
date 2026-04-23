package com.example.progetto_parking_system.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.progetto_parking_system.model.Parking;
import com.example.progetto_parking_system.service.ParkingService;

import java.util.List;

/**
 * Controller per la gestione delle informazioni sui parcheggi.
 * Espone gli endpoint API per recuperare e modificare i dati dei parcheggi.
 */
@RestController
@RequestMapping("/api/parkings")
public class ParkingController {
     
    @Autowired
    private ParkingService service; // Servizio per la logica di business relativa ai parcheggi

    /**
     * Recupera l'elenco di tutti i parcheggi registrati nel sistema.
     * @return una lista di oggetti Parking
     */
    @GetMapping
    public List<Parking> getAll() {
        return service.findAll();
    }

    /**
     * Recupera i dettagli di un singolo parcheggio tramite il suo ID.
     * @param id l'identificatore univoco del parcheggio
     * @return ResponseEntity contenente il parcheggio o un errore 404 se non trovato
     */
    @GetMapping("/{id}")
    public ResponseEntity<Parking> getById(@PathVariable Long id) {
        return service.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Crea un nuovo parcheggio nel sistema.
     * @param entity l'oggetto parcheggio da salvare
     * @return il parcheggio appena creato
     */
    @PostMapping
    public Parking create(@RequestBody Parking entity) {
        return service.save(entity);
    }

    /**
     * Aggiorna le informazioni di un parcheggio esistente.
     * @param id l'ID del parcheggio da aggiornare
     * @param entity i nuovi dati del parcheggio
     * @return ResponseEntity con il parcheggio aggiornato o 404 se non trovato
     */
    @PutMapping("/{id}")
    public ResponseEntity<Parking> update(@PathVariable Long id, @RequestBody Parking entity) {
        return service.findById(id)
                .map(existingEntity -> {
                    entity.setId(id);
                    return ResponseEntity.ok(service.save(entity));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Elimina un parcheggio dal sistema.
     * @param id l'ID del parcheggio da rimuovere
     * @return ResponseEntity vuota con stato 204 (Success) o 404 (Not Found)
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
