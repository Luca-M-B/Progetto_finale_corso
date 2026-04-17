package com.example.progetto_parking_system.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.progetto_parking_system.model.Floor;
import com.example.progetto_parking_system.repository.FloorRepository;

import java.util.List;
import java.util.Optional;

@Service
public class FloorService {

    @Autowired
    private FloorRepository repository;

    public List<Floor> findAll() {
        return repository.findAll();
    }

    public Optional<Floor> findById(Long id) {
        return repository.findById(id);
    }

    public Floor save(Floor entity) {
        return repository.save(entity);
    }

    public void deleteById(Long id) {
        repository.deleteById(id);
    }
}
