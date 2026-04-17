package com.example.progetto_parking_system.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.progetto_parking_system.model.Spot;
import com.example.progetto_parking_system.repository.SpotRepository;

import java.util.List;
import java.util.Optional;

@Service
public class SpotService {

    @Autowired
    private SpotRepository repository;

    public List<Spot> findAll() {
        return repository.findAll();
    }

    public Optional<Spot> findById(Long id) {
        return repository.findById(id);
    }

    public Spot save(Spot entity) {
        return repository.save(entity);
    }

    public void deleteById(Long id) {
        repository.deleteById(id);
    }
}
