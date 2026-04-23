package com.example.progetto_parking_system.controller;

import com.example.progetto_parking_system.dto.GateCheckInRequest;
import com.example.progetto_parking_system.dto.GateCheckOutRequest;
import com.example.progetto_parking_system.dto.GateResponse;
import com.example.progetto_parking_system.service.GateService;
import com.example.progetto_parking_system.service.QrCodeService;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Controller per la gestione dei Gate (Sbarre) del parcheggio.
 * Gestisce i processi di ingresso (check-in), uscita (check-out) e pagamento delle soste.
 */
@RestController
@RequestMapping("/api/gate")
public class GateController {

    private final GateService gateService; // Servizio per la logica di ingresso/uscita
    private final QrCodeService qrCodeService; // Servizio per la generazione tecnica dei QR code

    public GateController(GateService gateService, QrCodeService qrCodeService) {
        this.gateService = gateService;
        this.qrCodeService = qrCodeService;
    }

    /**
     * Gestisce l'ingresso di un veicolo nel parcheggio.
     * Registra la targa, assegna un posto libero, genera un QR code per il ticket
     * e salva l'orario di ingresso.
     * 
     * @param request Dati del check-in (targa, tipo veicolo, eventuale disabilità)
     * @return Risposta con esito, codice QR e posto assegnato
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
     * Gestisce l'ingresso di un utente abbonato tramite la scansione del suo QR code.
     * Verifica l'abbonamento e se la targa è associata ad esso, consentendo l'accesso gratuito.
     * 
     * @param body Mappa contenente subscriptionQr (codice QR abbonato) e licensePlate (targa)
     * @return Risposta con esito dell'operazione
     */
    @PostMapping("/sub-check-in")
    public ResponseEntity<GateResponse> subCheckIn(@RequestBody java.util.Map<String, String> body) {
        String qr    = body.get("subscriptionQr");
        String plate = body.get("licensePlate");
        if (qr == null || plate == null) {
            GateResponse r = new GateResponse();
            r.setSuccess(false);
            r.setMessage("Parametri mancanti: subscriptionQr e licensePlate sono obbligatori");
            return ResponseEntity.badRequest().body(r);
        }
        GateResponse response = gateService.handleSubscriptionCheckIn(qr, plate);
        return response.isSuccess() ? ResponseEntity.ok(response) : ResponseEntity.badRequest().body(response);
    }

    /**
     * Fase 1 del Check-out: calcolo del costo della sosta.
     * Verifica il QR code del ticket e la targa, calcolando l'importo dovuto in base al tempo trascorso.
     * Non libera ancora il posto auto.
     * 
     * @param request Dati del check-out (QR code del ticket e targa)
     * @return Risposta con l'importo da pagare e i dettagli della sosta
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
     * Fase 2 del Check-out: conferma del pagamento avvenuto.
     * Una volta confermato il pagamento, la sessione viene chiusa e il posto auto viene liberato.
     * 
     * @param request Dati identificativi della sosta da pagare
     * @return Risposta con conferma di apertura sbarra
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
     * Fornisce l'immagine PNG del QR code di una sessione di parcheggio attiva.
     * Utile per mostrare il ticket all'utente subito dopo il check-in.
     * 
     * @param token Il codice QR univoco della sessione (token della sessione)
     * @return Immagine PNG del QR code
     */
    @GetMapping(value = "/qr/{token}", produces = MediaType.IMAGE_PNG_VALUE)
    public ResponseEntity<byte[]> getCheckInQrImage(@PathVariable String token) {
        // Verifica se la sessione è ancora aperta prima di mostrare il QR
        if (!gateService.isCheckInQrActive(token)) {
            return ResponseEntity.notFound().build();
        }
        byte[] png = qrCodeService.generateQrPng(token);
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_PNG)
                .body(png);
    }

    /**
     * Endpoint di utilità per il testing.
     * Resetta lo stato del sistema: libera tutti i posti e chiude le sessioni attive.
     * @return Messaggio di conferma del reset
     */
    @PostMapping("/reset-test")
    public ResponseEntity<java.util.Map<String, String>> resetTest() {
        String msg = gateService.resetForTesting();
        return ResponseEntity.ok(java.util.Map.of("message", msg));
    }
}
