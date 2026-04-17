package com.example.progetto_parking_system.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.progetto_parking_system.model.ExtraService;
import com.example.progetto_parking_system.service.ExtraServiceService;

import java.util.List;

@RestController
@RequestMapping("/api/extra-services")
public class ExtraServiceController {

    @Autowired
    private ExtraServiceService service;

    @GetMapping
    public List<ExtraService> getAll() {
        return service.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<ExtraService> getById(@PathVariable Long id) {
        return service.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ExtraService create(@RequestBody ExtraService entity) {
        return service.save(entity);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ExtraService> update(@PathVariable Long id, @RequestBody ExtraService entity) {
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
