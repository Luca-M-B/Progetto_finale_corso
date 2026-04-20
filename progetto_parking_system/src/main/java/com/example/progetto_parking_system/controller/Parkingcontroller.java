package com.example.progetto_parking_system.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.progetto_parking_system.model.Parking;
import com.example.progetto_parking_system.service.ParkingService;

import java.util.List;

@RestController
@RequestMapping("/api/parkings")
public class ParkingController {
//C grande
    @Autowired
    private ParkingService service;

    @GetMapping
    public List<Parking> getAll() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Parking> getById(@PathVariable Long id) {
        return service.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Parking create(@RequestBody Parking entity) {
        return service.save(entity);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Parking> update(@PathVariable Long id, @RequestBody Parking entity) {
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
