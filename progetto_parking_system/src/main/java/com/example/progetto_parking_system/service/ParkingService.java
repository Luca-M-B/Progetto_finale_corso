package com.example.progetto_parking_system.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.progetto_parking_system.model.Parking;
import com.example.progetto_parking_system.repository.ParkingRepository;

import java.util.List;
import java.util.Optional;

/**
 * Servizio per la gestione dell'entità Parcheggio (l'infrastruttura principale).
 * Fornisce i metodi per gestire le informazioni generali della struttura.
 */
@Service
public class ParkingService {

    @Autowired
    private ParkingRepository repository; // Repository per l'accesso ai dati della struttura parcheggio

    /**
     * Ritorna l'elenco di tutte le strutture parcheggio registrate.
     */
    public List<Parking> findAll() {
        return repository.findAll();
    }

    /**
     * Cerca una struttura parcheggio specifica tramite il suo ID.
     */
    public Optional<Parking> findById(Long id) {
        return repository.findById(id);
    }

    /**
     * Salva o aggiorna le informazioni di una struttura parcheggio.
     */
    public Parking save(Parking entity) {
        return repository.save(entity);
    }

    /**
     * Elimina una struttura parcheggio dal database.
     */
    public void deleteById(Long id) {
        repository.deleteById(id);
    }
}
