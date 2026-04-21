package com.example.progetto_parking_system.service;

import com.example.progetto_parking_system.dto.SubscriptionPurchaseRequest;
import com.example.progetto_parking_system.dto.SubscriptionResponse;
import com.example.progetto_parking_system.enums.SubscriptionType;
import com.example.progetto_parking_system.model.Subscription;
import com.example.progetto_parking_system.model.User;
import com.example.progetto_parking_system.model.Vehicle;
import com.example.progetto_parking_system.repository.SubscriptionRepository;
import com.example.progetto_parking_system.repository.UserRepository;
import com.example.progetto_parking_system.repository.VehicleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class SubscriptionService {

    // Prezzi abbonamenti
    private static final double PRICE_MONTHLY   = 49.90;
    private static final double PRICE_QUARTERLY = 129.90;
    private static final double PRICE_YEARLY    = 449.90;

    private final SubscriptionRepository subscriptionRepository;
    private final UserRepository userRepository;
    private final VehicleRepository vehicleRepository;

    public SubscriptionService(SubscriptionRepository subscriptionRepository,
                               UserRepository userRepository,
                               VehicleRepository vehicleRepository) {
        this.subscriptionRepository = subscriptionRepository;
        this.userRepository = userRepository;
        this.vehicleRepository = vehicleRepository;
    }

    /**
     * Acquista un nuovo abbonamento per l'utente autenticato.
     * Genera QR code univoco e associa i veicoli scelti.
     */
    @Transactional
    public SubscriptionResponse purchase(String username, SubscriptionPurchaseRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Utente non trovato"));

        SubscriptionType type;
        try {
            type = SubscriptionType.valueOf(request.getType().toUpperCase());
        } catch (Exception e) {
            throw new RuntimeException("Tipo abbonamento non valido. Valori: MONTHLY, QUARTERLY, YEARLY");
        }

        LocalDate start = LocalDate.now();
        
        // Cerca se esiste già un abbonamento attivo per estenderlo
        List<Subscription> activeSubs = subscriptionRepository.findByUserUsernameAndActiveTrue(username);
        if (!activeSubs.isEmpty()) {
            // Se ne ha più di uno (raro ma possibile), prendiamo quello che scade più tardi
            LocalDate furthestEnd = activeSubs.stream()
                .map(Subscription::getEndDate)
                .max(LocalDate::compareTo)
                .orElse(start);
            
            // Se l'abbonamento attivo scade nel futuro, partiamo da lì
            if (furthestEnd.isAfter(start)) {
                start = furthestEnd;
            }
        }

        LocalDate end;
        double price;
        switch (type) {
            case QUARTERLY: end = start.plusMonths(3);  price = PRICE_QUARTERLY; break;
            case YEARLY:    end = start.plusYears(1);   price = PRICE_YEARLY;    break;
            default:        end = start.plusMonths(1);  price = PRICE_MONTHLY;   break;
        }

        // Recupera i veicoli richiesti che appartengono all'utente
        List<Vehicle> vehicles = new ArrayList<>();
        if (request.getVehicleIds() != null && !request.getVehicleIds().isEmpty()) {
            for (Long vid : request.getVehicleIds()) {
                vehicleRepository.findById(vid).ifPresent(v -> {
                    if (v.getUser() != null && v.getUser().getUsername().equals(username)) {
                        vehicles.add(v);
                    }
                });
            }
        }

        Subscription sub = new Subscription();
        sub.setUser(user);
        sub.setType(type);
        sub.setStartDate(start);
        sub.setEndDate(end);
        sub.setActive(true);
        sub.setPricePaid(price);
        sub.setQrCode(UUID.randomUUID().toString());
        sub.setVehicles(vehicles);

        subscriptionRepository.save(sub);
        return toResponse(sub, "Abbonamento attivato con successo!");
    }

    /**
     * Elenco di tutti gli abbonamenti dell'utente (attivi e scaduti).
     */
    public List<SubscriptionResponse> getMySubscriptions(String username) {
        return subscriptionRepository.findByUserUsername(username)
                .stream()
                .map(s -> toResponse(s, null))
                .collect(Collectors.toList());
    }

    /**
     * Verifica QR code abbonamento: valido se attivo e data odierna compresa.
     * Restituisce i dettagli se valido, errore altrimenti.
     */
    public SubscriptionResponse verifyQrCode(String qrCode) {
        Optional<Subscription> opt = subscriptionRepository.findByQrCodeAndActiveTrue(qrCode);
        if (opt.isEmpty()) {
            SubscriptionResponse r = new SubscriptionResponse();
            r.setMessage("QR code non valido o abbonamento non attivo");
            return r;
        }
        Subscription sub = opt.get();
        if (LocalDate.now().isAfter(sub.getEndDate())) {
            sub.setActive(false);
            subscriptionRepository.save(sub);
            SubscriptionResponse r = new SubscriptionResponse();
            r.setMessage("Abbonamento scaduto il " + sub.getEndDate());
            return r;
        }
        return toResponse(sub, "Abbonamento valido");
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private SubscriptionResponse toResponse(Subscription s, String message) {
        List<String> plates = s.getVehicles() == null ? List.of() :
                s.getVehicles().stream()
                        .map(v -> v.getPlateNumber() != null ? v.getPlateNumber() : "—")
                        .collect(Collectors.toList());

        // Controlla e aggiorna automaticamente lo stato attivo
        boolean active = Boolean.TRUE.equals(s.getActive())
                && !LocalDate.now().isAfter(s.getEndDate());

        return new SubscriptionResponse(
                s.getId(),
                s.getType() != null ? s.getType().name() : null,
                s.getStartDate(),
                s.getEndDate(),
                s.getQrCode(),
                active,
                s.getPricePaid(),
                plates,
                message
        );
    }

    // metodi base usati da altri controller
    public Optional<Subscription> findById(Long id) { return subscriptionRepository.findById(id); }
    public void deleteById(Long id) { subscriptionRepository.deleteById(id); }
}
