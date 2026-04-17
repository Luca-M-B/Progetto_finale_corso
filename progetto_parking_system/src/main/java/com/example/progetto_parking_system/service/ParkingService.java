package com.example.progetto_parking_system.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.progetto_parking_system.model.Parking;
import com.example.progetto_parking_system.repository.ParkingRepository;

import java.util.List;
import java.util.Optional;

@Service
public class ParkingService {

    @Autowired
    private ParkingRepository repository;

    public List<Parking> findAll() {
        return repository.findAll();
    }

    public Optional<Parking> findById(Long id) {
        return repository.findById(id);
    }

    public Parking save(Parking entity) {
        return repository.save(entity);
    }

    public void deleteById(Long id) {
        repository.deleteById(id);
    }
}
