package com.example.progetto_parking_system.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.progetto_parking_system.model.Vehicle;
import com.example.progetto_parking_system.repository.VehicleRepository;

import java.util.List;
import java.util.Optional;

/**
 * Servizio per la gestione dei veicoli.
 * Funge da intermediario tra il controller e il repository per le operazioni CRUD sui veicoli.
 */
@Service
public class VehicleService {

    @Autowired
    private VehicleRepository repository; // Repository per l'accesso ai dati dei veicoli nel database

    /**
     * Ritorna l'elenco completo di tutti i veicoli presenti nel sistema.
     */
    public List<Vehicle> findAll() {
        return repository.findAll();
    }

    /**
     * Recupera tutti i veicoli associati a un determinato utente tramite il suo username.
     */
    public List<Vehicle> findAllByUserUsername(String username) {
        return repository.findByUserUsername(username);
    }

    /**
     * Cerca un veicolo specifico tramite il suo ID.
     */
    public Optional<Vehicle> findById(Long id) {
        return repository.findById(id);
    }

    /**
     * Salva o aggiorna un veicolo nel database.
     */
    public Vehicle save(Vehicle entity) {
        return repository.save(entity);
    }

    /**
     * Elimina un veicolo dal database in base al suo ID.
     */
    public void deleteById(Long id) {
        repository.deleteById(id);
    }
}
