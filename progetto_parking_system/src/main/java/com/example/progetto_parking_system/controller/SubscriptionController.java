package com.example.progetto_parking_system.controller;

import com.example.progetto_parking_system.dto.SubscriptionPurchaseRequest;
import com.example.progetto_parking_system.dto.SubscriptionResponse;
import com.example.progetto_parking_system.service.QrCodeService;
import com.example.progetto_parking_system.service.SubscriptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller per la gestione degli abbonamenti.
 * Fornisce endpoint per l'acquisto, la visualizzazione, il ripristino e l'eliminazione (soft-delete) degli abbonamenti.
 * Gestisce inoltre la generazione dei QR code associati agli abbonamenti attivi.
 */
@RestController
@RequestMapping("/api/subscriptions")
@RequiredArgsConstructor
public class SubscriptionController {

    private final SubscriptionService subscriptionService; // Servizio per la logica di business degli abbonamenti
    private final QrCodeService qrCodeService;             // Servizio per la generazione tecnica dei QR code

    /**
     * Endpoint per l'acquisto di un nuovo abbonamento.
     * @param auth Dati dell'utente autenticato (estratto dal contesto di sicurezza)
     * @param request Oggetto DTO contenente i dettagli dell'abbonamento da acquistare
     * @return Dettagli dell'abbonamento creato
     */
    @PostMapping
    public ResponseEntity<SubscriptionResponse> purchase(
            Authentication auth,
            @RequestBody SubscriptionPurchaseRequest request) {
        SubscriptionResponse resp = subscriptionService.purchase(auth.getName(), request);
        return ResponseEntity.ok(resp);
    }

    /**
     * Recupera l'elenco di tutti gli abbonamenti (attivi e scaduti) dell'utente autenticato.
     * @param auth Dati dell'utente autenticato
     * @return Lista di abbonamenti
     */
    @GetMapping
    public ResponseEntity<List<SubscriptionResponse>> mySubscriptions(Authentication auth) {
        return ResponseEntity.ok(subscriptionService.getMySubscriptions(auth.getName()));
    }

    /**
     * Verifica la validità di un QR code. Utilizzato principalmente dal sistema del Gate per consentire l'accesso.
     * @param qrCode Il codice alfanumerico del QR da verificare
     * @return Dettagli dell'abbonamento se valido
     */
    @GetMapping("/verify/{qrCode}")
    public ResponseEntity<SubscriptionResponse> verifyQr(@PathVariable String qrCode) {
        SubscriptionResponse resp = subscriptionService.verifyQrCode(qrCode);
        return ResponseEntity.ok(resp);
    }

    /**
     * Genera e restituisce l'immagine PNG del QR code associato a un abbonamento.
     * L'immagine viene prodotta solo se l'abbonamento è attualmente attivo e non scaduto.
     * @param qrCode Il codice identificativo dell'abbonamento
     * @return Immagine PNG in formato byte array
     */
    @GetMapping(value = "/qr/{qrCode}", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> getSubscriptionQrImage(@PathVariable String qrCode) {
        // Verifica se l'abbonamento è attivo prima di generare l'immagine
        if (!subscriptionService.isSubscriptionQrActive(qrCode)) {
            return ResponseEntity.notFound().build();
        }
        byte[] png = qrCodeService.generateQrPng(qrCode);
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_PNG)
                .body(png);
    }

    /**
     * Recupera gli abbonamenti che l'utente ha spostato nel cestino (soft-deleted).
     * @param auth Dati dell'utente autenticato
     * @return Lista di abbonamenti cancellati
     */
    @GetMapping("/deleted")
    public ResponseEntity<List<SubscriptionResponse>> myDeletedSubscriptions(Authentication auth) {
        return ResponseEntity.ok(subscriptionService.getDeletedSubscriptions(auth.getName()));
    }

    /**
     * Sposta un abbonamento nel cestino (soft delete). L'abbonamento non sarà più visibile nella lista principale.
     * @param auth Dati dell'utente autenticato
     * @param id ID dell'abbonamento da eliminare
     * @return Risposta vuota (204) o errore (400)
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> softDelete(Authentication auth, @PathVariable Long id) {
        try {
            subscriptionService.softDelete(id, auth.getName());
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", e.getMessage()));
        }
    }

    /**
     * Ripristina un abbonamento dal cestino, rendendolo nuovamente visibile nella lista principale.
     * @param auth Dati dell'utente autenticato
     * @param id ID dell'abbonamento da ripristinare
     * @return Risposta vuota (204) o errore (400)
     */
    @PostMapping("/{id}/restore")
    public ResponseEntity<?> restore(Authentication auth, @PathVariable Long id) {
        try {
            subscriptionService.restore(id, auth.getName());
            return ResponseEntity.noContent().build();
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", e.getMessage()));
        }
    }
}
