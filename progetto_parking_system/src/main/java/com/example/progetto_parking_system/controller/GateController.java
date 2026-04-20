package com.example.progetto_parking_system.controller;

import com.example.progetto_parking_system.dto.GateCheckInRequest;
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

    @PostMapping("/check-in")
    public ResponseEntity<GateResponse> checkIn(@RequestBody GateCheckInRequest request) {
        GateResponse response = gateService.handleCheckIn(request);
        if (response.isSuccess()) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.badRequest().body(response);
        }
    }

    @GetMapping("/ticket/{qrCode}")
    public ResponseEntity<GateResponse> getTicket(@PathVariable String qrCode) {
        GateResponse response = gateService.getTicketInfo(qrCode);
        if (response.isSuccess()) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.badRequest().body(response);
        }
    }
    
    @PostMapping("/pay-and-leave/{qrCode}")
    public ResponseEntity<GateResponse> payAndLeave(@PathVariable String qrCode) {
        GateResponse response = gateService.payAndLeave(qrCode);
        if (response.isSuccess()) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.badRequest().body(response);
        }
    }
}
