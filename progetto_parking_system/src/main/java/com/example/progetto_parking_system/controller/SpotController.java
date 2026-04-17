package com.example.progetto_parking_system.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.progetto_parking_system.model.Spot;
import com.example.progetto_parking_system.service.SpotService;

import java.util.List;

@RestController
@RequestMapping("/api/spots")
public class SpotController {

    @Autowired
    private SpotService service;

    @GetMapping
    public List<Spot> getAll() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Spot> getById(@PathVariable Long id) {
        return service.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Spot create(@RequestBody Spot entity) {
        return service.save(entity);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Spot> update(@PathVariable Long id, @RequestBody Spot entity) {
        return service.findById(id)
                .map(existingEntity -> {
                    entity.setId(id);
                    return ResponseEntity.ok(service.save(entity));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (service.findById(id).isPresent()) {
            service.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}
