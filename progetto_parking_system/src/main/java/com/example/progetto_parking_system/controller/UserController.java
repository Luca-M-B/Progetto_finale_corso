package com.example.progetto_parking_system.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.progetto_parking_system.model.User;
import com.example.progetto_parking_system.service.UserService;

import java.util.List;

/**
 * Controller per la gestione delle anagrafiche utenti.
 * Gestisce le operazioni di registrazione e amministrazione degli account.
 */
@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserService service; // Servizio per la logica di business relativa agli utenti

    /**
     * Ritorna l'elenco di tutti gli utenti registrati (riservato agli amministratori).
     */
    @GetMapping
    public List<User> getAll() {
        return service.findAll();
    }

    /**
     * Recupera i dettagli di un utente specifico tramite il suo ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<User> getById(@PathVariable Long id) {
        return service.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Registra un nuovo utente nel sistema.
     */
    @PostMapping
    public User create(@RequestBody User entity) {
        return service.save(entity);
    }

    /**
     * Aggiorna le informazioni di un utente esistente.
     */
    @PutMapping("/{id}")
    public ResponseEntity<User> update(@PathVariable Long id, @RequestBody User entity) {
        return service.findById(id)
                .map(existingEntity -> {
                    entity.setId(id);
                    return ResponseEntity.ok(service.save(entity));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Elimina un account utente dal sistema.
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
