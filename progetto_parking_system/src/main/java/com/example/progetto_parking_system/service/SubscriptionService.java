package com.example.progetto_parking_system.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.progetto_parking_system.model.Subscription;
import com.example.progetto_parking_system.repository.SubscriptionRepository;

import java.util.List;
import java.util.Optional;

@Service
public class SubscriptionService {

    @Autowired
    private SubscriptionRepository repository;

    public List<Subscription> findAll() {
        return repository.findAll();
    }

    public Optional<Subscription> findById(Long id) {
        return repository.findById(id);
    }

    public Subscription save(Subscription entity) {
        return repository.save(entity);
    }

    public void deleteById(Long id) {
        repository.deleteById(id);
    }
}
