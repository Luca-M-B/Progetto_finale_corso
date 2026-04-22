package com.example.progetto_parking_system.controller;

import com.example.progetto_parking_system.dto.GateCheckInRequest;
import com.example.progetto_parking_system.dto.GateCheckOutRequest;
import com.example.progetto_parking_system.dto.GateResponse;
import com.example.progetto_parking_system.service.GateService;
import com.example.progetto_parking_system.service.QrCodeService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/gate")
public class GateController {

    private final GateService gateService;
    private final QrCodeService qrCodeService;

    public GateController(GateService gateService, QrCodeService qrCodeService) {
        this.gateService = gateService;
        this.qrCodeService = qrCodeService;
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
     * Check-in con QR abbonamento (ingresso gratuito per abbonati).
     * Richiede subscriptionQr e licensePlate nel body.
     */
    @PostMapping("/sub-check-in")
    public ResponseEntity<GateResponse> subCheckIn(@RequestBody java.util.Map<String, String> body) {
        String qr    = body.get("subscriptionQr");
        String plate = body.get("licensePlate");
        if (qr == null || plate == null) {
            GateResponse r = new GateResponse();
            r.setSuccess(false);
            r.setMessage("Parametri mancanti: subscriptionQr e licensePlate obbligatori");
            return ResponseEntity.badRequest().body(r);
        }
        GateResponse response = gateService.handleSubscriptionCheckIn(qr, plate);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    /**
     * Step 1: Check-out (Verifica): inserisce targa e QR code.
     * Restituisce il calcolo del costo senza chiudere la sessione.
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

    /**
     * Step 2: Conferma Pagamento: effettua il pagamento e libera il posto.
     */
    @PostMapping("/confirm-payment")
    public ResponseEntity<GateResponse> confirmPayment(@RequestBody GateCheckOutRequest request) {
        GateResponse response = gateService.handlePaymentConfirmation(request);
        if (response.isSuccess()) {
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.badRequest().body(response);
        }
    }


    /**
     * Restituisce l'immagine PNG del QR code di una sessione di check-in attiva.
     * Il QR è valido finché la sessione non è completata (check-out non eseguito).
     * Ritorna 404 se la sessione è già chiusa o il token non esiste.
     *
     * @param token il qrCode della ParkingSession
     */
    @GetMapping(value = "/qr/{token}", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> getCheckInQrImage(@PathVariable String token) {
        if (!gateService.isCheckInQrActive(token)) {
            return ResponseEntity.notFound().build();
        }
        byte[] png = qrCodeService.generateQrPng(token);
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_PNG)
                .body(png);
    }

    /**
     * SOLO PER TEST: resetta tutti i posti a libero e chiude le sessioni aperte.
     * Chiamare POST /api/gate/reset-test per ripulire lo stato tra un test e l'altro.
     */
    @PostMapping("/reset-test")
    public ResponseEntity<java.util.Map<String, String>> resetTest() {
        String msg = gateService.resetForTesting();
        return ResponseEntity.ok(java.util.Map.of("message", msg));
    }
}
