package com.example.progetto_parking_system.service;

import com.example.progetto_parking_system.dto.SubscriptionPurchaseRequest;
import com.example.progetto_parking_system.dto.SubscriptionResponse;
import com.example.progetto_parking_system.enums.SpotType;
import com.example.progetto_parking_system.enums.SubscriptionType;
import com.example.progetto_parking_system.model.Spot;
import com.example.progetto_parking_system.model.Subscription;
import com.example.progetto_parking_system.model.User;
import com.example.progetto_parking_system.model.Vehicle;
import com.example.progetto_parking_system.repository.SpotRepository;
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

/**
 * Servizio per la gestione degli abbonamenti.
 * Si occupa della logica di acquisto, calcolo dei prezzi, assegnazione del posto auto
 * e verifica della validità dei QR code per l'accesso al parcheggio.
 */
@Service
public class SubscriptionService {

    // Listino prezzi statico per gli abbonamenti
    private static final double PRICE_MONTHLY   = 49.90;   // Prezzo mensile
    private static final double PRICE_QUARTERLY = 129.90;  // Prezzo trimestrale
    private static final double PRICE_YEARLY    = 449.90;  // Prezzo annuale

    private final SubscriptionRepository subscriptionRepository;
    private final UserRepository userRepository;
    private final VehicleRepository vehicleRepository;
    private final SpotRepository spotRepository;

    public SubscriptionService(SubscriptionRepository subscriptionRepository,
                               UserRepository userRepository,
                               VehicleRepository vehicleRepository,
                               SpotRepository spotRepository) {
        this.subscriptionRepository = subscriptionRepository;
        this.userRepository = userRepository;
        this.vehicleRepository = vehicleRepository;
        this.spotRepository = spotRepository;
    }

    /**
     * Gestisce l'acquisto di un nuovo abbonamento per un utente.
     * Se l'utente ha già un abbonamento attivo, il nuovo abbonamento inizierà alla scadenza del precedente.
     * Assegna inoltre un posto auto fisso riservato per tutta la durata dell'abbonamento.
     * 
     * @param username Nome utente di chi effettua l'acquisto
     * @param request Dettagli della richiesta (tipo abbonamento, tipo veicolo, veicoli associati)
     * @return Risposta con i dettagli dell'abbonamento creato
     */
    @Transactional
    public SubscriptionResponse purchase(String username, SubscriptionPurchaseRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Utente non trovato"));

        // Validazione tipo abbonamento
        SubscriptionType type;
        try {
            type = SubscriptionType.valueOf(request.getType().toUpperCase());
        } catch (Exception e) {
            throw new RuntimeException("Tipo abbonamento non valido. Valori ammessi: MONTHLY, QUARTERLY, YEARLY");
        }

        LocalDate start = LocalDate.now();
        
        // Verifica se esiste già un abbonamento attivo per accodare il nuovo acquisto (estensione della validità)
        List<Subscription> activeSubs = subscriptionRepository.findByUserUsernameAndActiveTrueAndDeletedFalse(username);
        if (!activeSubs.isEmpty()) {
            LocalDate furthestEnd = activeSubs.stream()
                .map(Subscription::getEndDate)
                .max(LocalDate::compareTo)
                .orElse(start);
            
            if (furthestEnd.isAfter(start)) {
                start = furthestEnd; // La data di inizio sarà il giorno dopo la fine del precedente
            }
        }

        // Calcolo data di fine e prezzo
        LocalDate end;
        double price;
        switch (type) {
            case QUARTERLY: end = start.plusMonths(3);  price = PRICE_QUARTERLY; break;
            case YEARLY:    end = start.plusYears(1);   price = PRICE_YEARLY;    break;
            default:        end = start.plusMonths(1);  price = PRICE_MONTHLY;   break;
        }

        // Gestione del tipo di posto richiesto (es. auto, moto, disabili)
        SpotType vType;
        try {
            vType = request.getVehicleType() != null 
                ? SpotType.valueOf(request.getVehicleType().toUpperCase()) 
                : SpotType.CAR;
        } catch (Exception e) {
            throw new RuntimeException("Tipo veicolo non valido. Valori ammessi: CAR, MOTORBIKE, ELECTRIC, HANDICAPPED");
        }

        // Ricerca e assegnazione di un posto libero del tipo corrispondente
        Spot spot = spotRepository.findFirstByTypeAndOccupiedFalse(vType)
            .orElseThrow(() -> new RuntimeException("Spiacenti, nessun posto disponibile per il tipo " + vType));
        
        // Segna il posto come occupato (riservato per l'abbonato)
        spot.setOccupied(true);
        spotRepository.save(spot);

        // Associa i veicoli dell'utente all'abbonamento (possono essere più di uno, es. famiglia)
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

        // Creazione dell'oggetto abbonamento
        Subscription sub = new Subscription();
        sub.setUser(user);
        sub.setType(type);
        sub.setVehicleType(vType);
        sub.setAssignedSpot(spot);
        sub.setStartDate(start);
        sub.setEndDate(end);
        sub.setActive(true);
        sub.setPricePaid(price);
        sub.setQrCode(UUID.randomUUID().toString()); // Generazione token univoco per il QR
        sub.setVehicles(vehicles);
        sub.setLanguage(request.getLanguage() != null ? request.getLanguage().toLowerCase() : "it");

        subscriptionRepository.save(sub);
        return toResponse(sub, "Abbonamento attivato con successo!");
    }

    /**
     * Ritorna la lista di tutti gli abbonamenti non cancellati dell'utente.
     */
    public List<SubscriptionResponse> getMySubscriptions(String username) {
        return subscriptionRepository.findByUserUsernameAndDeletedFalse(username)
                .stream()
                .map(s -> toResponse(s, null))
                .collect(Collectors.toList());
    }

    /**
     * Ritorna la lista degli abbonamenti presenti nel cestino (soft-deleted).
     */
    public List<SubscriptionResponse> getDeletedSubscriptions(String username) {
        return subscriptionRepository.findByUserUsernameAndDeletedTrue(username)
                .stream()
                .map(s -> toResponse(s, null))
                .collect(Collectors.toList());
    }

    /**
     * Verifica se un QR code corrisponde a un abbonamento valido e attivo oggi.
     * Se l'abbonamento risulta scaduto temporalmente, viene disattivato e il posto auto liberato.
     * 
     * @param qrCode Il codice univoco dell'abbonamento
     * @return Dettagli dell'abbonamento validato o messaggio di errore
     */
    public SubscriptionResponse verifyQrCode(String qrCode) {
        Optional<Subscription> opt = subscriptionRepository.findByQrCodeAndActiveTrueAndDeletedFalse(qrCode);
        if (opt.isEmpty()) {
            SubscriptionResponse r = new SubscriptionResponse();
            r.setMessage("QR code non valido o abbonamento non attivo");
            return r;
        }
        Subscription sub = opt.get();
        
        // Verifica se la data odierna ha superato la data di scadenza
        if (LocalDate.now().isAfter(sub.getEndDate())) {
            sub.setActive(false); // Disattiva l'abbonamento
            if (sub.getAssignedSpot() != null) {
                Spot spot = sub.getAssignedSpot();
                spot.setOccupied(false); // Libera il posto auto riservato
                spotRepository.save(spot);
                sub.setAssignedSpot(null); 
            }
            subscriptionRepository.save(sub);
            SubscriptionResponse r = new SubscriptionResponse();
            r.setMessage("Abbonamento scaduto il " + sub.getEndDate());
            return r;
        }
        return toResponse(sub, "Abbonamento valido");
    }

    /**
     * Helper per convertire l'entità Subscription nel DTO SubscriptionResponse per il frontend.
     */
    private SubscriptionResponse toResponse(Subscription s, String message) {
        List<String> plates = s.getVehicles() == null ? List.of() :
                s.getVehicles().stream()
                        .map(v -> v.getTarga() != null ? v.getTarga() : "—")
                        .collect(Collectors.toList());

        // Verifica aggiornata dello stato attivo basata sia sulla flag che sulla data
        boolean active = Boolean.TRUE.equals(s.getActive())
                && !LocalDate.now().isAfter(s.getEndDate());

        return new SubscriptionResponse(
                s.getId(),
                s.getType() != null ? s.getType().name() : null,
                s.getVehicleType() != null ? s.getVehicleType().name() : null,
                s.getAssignedSpot() != null ? s.getAssignedSpot().getCode() : null,
                s.getStartDate(),
                s.getEndDate(),
                s.getQrCode(),
                active,
                s.getPricePaid(),
                plates,
                s.getLanguage(),
                message
        );
    }

    public Optional<Subscription> findById(Long id) { return subscriptionRepository.findById(id); }
    public void deleteById(Long id) { subscriptionRepository.deleteById(id); }

    /**
     * Controlla se l'abbonamento associato al QR code è attualmente attivo e non scaduto.
     */
    public boolean isSubscriptionQrActive(String qrCode) {
        return subscriptionRepository.findByQrCodeAndActiveTrueAndDeletedFalse(qrCode)
                .map(sub -> !LocalDate.now().isAfter(sub.getEndDate()))
                .orElse(false);
    }

    /**
     * Sposta un abbonamento nel cestino.
     * Per motivi di sicurezza, è possibile eliminare solo abbonamenti già scaduti o disattivati.
     * 
     * @param id ID dell'abbonamento
     * @param username Nome utente del proprietario (per controllo permessi)
     */
    @Transactional
    public void softDelete(Long id, String username) {
        Subscription sub = subscriptionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Abbonamento non trovato"));
        
        if (sub.getUser() == null || !sub.getUser().getUsername().equalsIgnoreCase(username)) {
            throw new RuntimeException("Non hai i permessi per eliminare questo abbonamento");
        }

        // Verifica se è effettivamente scaduto
        boolean isExpired = !LocalDate.now().isBefore(sub.getEndDate()) || Boolean.FALSE.equals(sub.getActive());
        if (!isExpired) {
            throw new RuntimeException("Non puoi eliminare un abbonamento ancora in corso. Scadenza prevista: " + sub.getEndDate());
        }

        sub.setDeleted(true);
        subscriptionRepository.save(sub);
    }

    /**
     * Ripristina un abbonamento dal cestino riportandolo nella lista principale.
     */
    @Transactional
    public void restore(Long id, String username) {
        Subscription sub = subscriptionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Abbonamento non trovato"));
        
        if (!sub.getUser().getUsername().equals(username)) {
            throw new RuntimeException("Operazione non consentita: l'abbonamento non ti appartiene");
        }

        sub.setDeleted(false);
        subscriptionRepository.save(sub);
    }
}
