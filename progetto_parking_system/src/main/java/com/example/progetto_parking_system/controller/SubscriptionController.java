package com.example.progetto_parking_system.controller;

import com.example.progetto_parking_system.dto.SubscriptionPurchaseRequest;
import com.example.progetto_parking_system.dto.SubscriptionResponse;
import com.example.progetto_parking_system.service.SubscriptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/subscriptions")
@RequiredArgsConstructor
public class SubscriptionController {

    private final SubscriptionService subscriptionService;

    /** Acquisto nuovo abbonamento (utente autenticato) */
    @PostMapping
    public ResponseEntity<SubscriptionResponse> purchase(
            Authentication auth,
            @RequestBody SubscriptionPurchaseRequest request) {
        SubscriptionResponse resp = subscriptionService.purchase(auth.getName(), request);
        return ResponseEntity.ok(resp);
    }

    /** I miei abbonamenti */
    @GetMapping
    public ResponseEntity<List<SubscriptionResponse>> mySubscriptions(Authentication auth) {
        return ResponseEntity.ok(subscriptionService.getMySubscriptions(auth.getName()));
    }

    /** Verifica QR code abbonamento (usato dal gate — endpoint pubblico) */
    @GetMapping("/verify/{qrCode}")
    public ResponseEntity<SubscriptionResponse> verifyQr(@PathVariable String qrCode) {
        SubscriptionResponse resp = subscriptionService.verifyQrCode(qrCode);
        return ResponseEntity.ok(resp);
    }

    /** Cancella abbonamento per id (admin) */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (subscriptionService.findById(id).isPresent()) {
            subscriptionService.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}
