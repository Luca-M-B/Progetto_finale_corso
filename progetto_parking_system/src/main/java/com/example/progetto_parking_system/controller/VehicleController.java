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

/**
 * Controller per la gestione dei veicoli degli utenti.
 * Permette agli utenti autenticati di registrare, visualizzare, modificare ed eliminare i propri veicoli.
 * Include validazioni rigorose per il formato della targa.
 */
@RestController
@RequestMapping("/api/vehicles")
@RequiredArgsConstructor
@Slf4j
public class VehicleController {

    private final VehicleService service; // Servizio per la gestione logica e persistenza dei veicoli
    private final UserRepository userRepository; // Repository per l'associazione tra veicoli e utenti

    /**
     * Recupera l'elenco dei veicoli.
     * Se l'utente è autenticato, restituisce solo i veicoli di sua proprietà.
     * Se non autenticato (o admin), restituisce tutti i veicoli del sistema.
     * 
     * @param authentication Informazioni sull'identità dell'utente che effettua la richiesta
     * @return Lista di oggetti Vehicle
     */
    @GetMapping
    public List<Vehicle> getAll(Authentication authentication) {
        if (authentication != null && authentication.getName() != null) {
            // Filtra i veicoli in base allo username dell'utente loggato
            return service.findAllByUserUsername(authentication.getName());
        }
        return service.findAll();
    }

    /**
     * Recupera i dettagli di un singolo veicolo tramite il suo identificativo univoco.
     * Effettua un controllo di sicurezza per garantire che l'utente sia il proprietario del veicolo.
     * 
     * @param id ID numerico del veicolo
     * @param auth Informazioni sull'utente autenticato
     * @return Il veicolo richiesto o un errore di autorizzazione/non trovato
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id, Authentication auth) {
        java.util.Optional<Vehicle> vOpt = service.findById(id);
        if (vOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Vehicle v = vOpt.get();
        // Verifica autorizzazione: solo il proprietario può vedere i dettagli del proprio veicolo
        if (v.getUser() != null && !v.getUser().getUsername().equals(auth.getName())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Accesso negato: non sei il proprietario di questo veicolo");
        }
        return ResponseEntity.ok(v);
    }

    /**
     * Registra un nuovo veicolo associandolo all'account dell'utente corrente.
     * Valida il formato della targa secondo la regex universale stabilita.
     * 
     * @param entity Oggetto veicolo inviato nel corpo della richiesta (JSON)
     * @param auth Utente autenticato che sta creando il veicolo
     * @return Il veicolo salvato con codice 201 (Created) o errore 400 (Bad Request)
     */
    @PostMapping
    public ResponseEntity<?> create(@RequestBody Vehicle entity, Authentication auth) {
        log.info("Richiesta creazione veicolo per l'utente: {}", auth.getName());
        
        // Pulizia dati e validazione formale della targa
        String rawTarga = entity.getTarga() != null ? entity.getTarga().toUpperCase().trim() : "";
        
        // Regex universale per le targhe: 1-3 caratteri, separatore opzionale, 1-6 caratteri
        if (!rawTarga.matches("^[A-Z0-9]{1,3}[-\\s]?[A-Z0-9]{1,6}$")) {
            return ResponseEntity.badRequest().body("Formato targa non valido. Esempio corretto: AA123BB o AA 123 BB");
        }

        // Memorizza la targa in formato pulito (senza spazi o trattini) per coerenza nel DB
        String plate = rawTarga.replace(" ", "").replace("-", "");
        
        // Controllo univocità della targa
        if (service.findByTarga(plate).isPresent()) {
            return ResponseEntity.badRequest().body("Errore: un veicolo con questa targa è già registrato nel sistema");
        }

        entity.setTarga(plate);

        // Recupera l'utente dal database per l'associazione
        java.util.Optional<com.example.progetto_parking_system.model.User> userOpt = userRepository.findByUsername(auth.getName());
        
        if (userOpt.isPresent()) {
            entity.setUser(userOpt.get());
            Vehicle saved = service.save(entity);
            log.info("Veicolo con targa {} salvato con successo", saved.getTarga());
            return ResponseEntity.status(HttpStatus.CREATED).body(saved);
        } else {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Errore: utente non autenticato o non trovato");
        }
    }

    /**
     * Aggiorna le informazioni di un veicolo esistente (es. cambio targa).
     * 
     * @param id ID del veicolo da aggiornare
     * @param entity Nuovi dati del veicolo
     * @param auth Utente autenticato (deve essere il proprietario)
     * @return Veicolo aggiornato o errore 403 se l'utente non è autorizzato
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Vehicle entity, Authentication auth) {
        String rawTarga = entity.getTarga() != null ? entity.getTarga().toUpperCase().trim() : "";

        // Validazione targa anche in fase di modifica
        if (!rawTarga.matches("^[A-Z0-9]{1,3}[-\\s]?[A-Z0-9]{1,6}$")) {
            return ResponseEntity.badRequest().body("Formato targa non valido per l'aggiornamento");
        }

        String plate = rawTarga.replace(" ", "").replace("-", "");

        // Verifica se la nuova targa è già in uso da un ALTRO veicolo
        java.util.Optional<Vehicle> existingWithSamePlate = service.findByTarga(plate);
        if (existingWithSamePlate.isPresent() && !existingWithSamePlate.get().getId().equals(id)) {
            return ResponseEntity.badRequest().body("Errore: la targa " + plate + " è già associata a un altro veicolo");
        }

        entity.setTarga(plate);

        return service.findById(id)
                .map(existing -> {
                    // Controllo proprietario: impedisce la modifica di veicoli appartenenti ad altri utenti
                    if (existing.getUser() != null && !existing.getUser().getUsername().equals(auth.getName())) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Non hai i permessi per modificare questo veicolo");
                    }
                    entity.setId(id);
                    entity.setUser(existing.getUser()); // Mantiene l'associazione originale con l'utente
                    Vehicle updated = service.save(entity);
                    return ResponseEntity.ok(updated);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Elimina definitivamente un veicolo dal profilo dell'utente.
     * 
     * @param id ID del veicolo da rimuovere
     * @param auth Utente autenticato
     * @return Risposta vuota (204) in caso di successo o errore
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication auth) {
        return service.findById(id)
                .map(existing -> {
                    // Solo il proprietario può eliminare il proprio veicolo
                    if (existing.getUser() != null && !existing.getUser().getUsername().equals(auth.getName())) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Operazione non consentita: il veicolo non ti appartiene");
                    }
                    service.deleteById(id);
                    log.info("Veicolo ID {} eliminato correttamente", id);
                    return ResponseEntity.noContent().build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
