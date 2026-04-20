package com.example.progetto_parking_system.controller;

import com.example.progetto_parking_system.dto.GateCheckInRequest;
import com.example.progetto_parking_system.dto.GateCheckOutRequest;
import com.example.progetto_parking_system.dto.GateResponse;
import com.example.progetto_parking_system.service.GateService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/gate")
public class GateController {

    private final GateService gateService;

    public GateController(GateService gateService) {
        this.gateService = gateService;
    }

    /**
     * Check-in: inserisce targa e tipo veicolo,
     * assegna il posto disponibile, genera QR code e salva l'orario di ingresso.
     */
    @PostMapping("/check-in")
    public ResponseEntity<GateResponse> checkIn(@RequestBody GateCheckInRequest request) {
        GateResponse response = gateService.handleCheckIn(request);
        if (response.isSuccess()) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.badRequest().body(response);
        }
    }

    /**
     * Check-out: inserisce targa e QR code.
     * Se validi, segna l'orario di uscita, calcola il costo (€3.50/h),
     * libera il posto e restituisce il riepilogo per il pagamento.
     */
    @PostMapping("/check-out")
    public ResponseEntity<GateResponse> checkOut(@RequestBody GateCheckOutRequest request) {
        GateResponse response = gateService.handleCheckOut(request);
        if (response.isSuccess()) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.badRequest().body(response);
        }
    }
}
