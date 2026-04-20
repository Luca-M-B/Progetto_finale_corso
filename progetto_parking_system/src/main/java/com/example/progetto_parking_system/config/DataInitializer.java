package com.example.progetto_parking_system.config;

import com.example.progetto_parking_system.enums.SpotType;
import com.example.progetto_parking_system.model.Floor;
import com.example.progetto_parking_system.model.Parking;
import com.example.progetto_parking_system.model.Spot;
import com.example.progetto_parking_system.repository.FloorRepository;
import com.example.progetto_parking_system.repository.ParkingRepository;
import com.example.progetto_parking_system.repository.SpotRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * Inizializza il database con 1 parcheggio, 3 piani da 100 posti ciascuno.
 * Distribuzione per piano:
 *   - 5  posti HANDICAPPED (5%)
 *   - 10 posti ELECTRIC    (10%)
 *   - 10 posti MOTORBIKE   (10%)
 *   - 75 posti CAR         (75%)
 * Eseguito solo se il DB è vuoto (nessun posto presente).
 */
@Component
public class DataInitializer implements CommandLineRunner {

    private final ParkingRepository parkingRepository;
    private final FloorRepository floorRepository;
    private final SpotRepository spotRepository;

    public DataInitializer(ParkingRepository parkingRepository,
                           FloorRepository floorRepository,
                           SpotRepository spotRepository) {
        this.parkingRepository = parkingRepository;
        this.floorRepository = floorRepository;
        this.spotRepository = spotRepository;
    }

    @Override
    public void run(String... args) {
        // Esegui solo se non ci sono ancora posti nel DB
        if (spotRepository.count() > 0) {
            System.out.println("[DataInitializer] Posti già presenti nel DB – skip inizializzazione.");
            return;
        }

        System.out.println("[DataInitializer] Inizializzazione parcheggio...");

        // Crea il parcheggio principale
        Parking parking = new Parking();
        parking.setName("ParkSync Centro");
        parking.setLocation("Via Roma 1, Milano");
        parking = parkingRepository.save(parking);

        int[] floorLevels = {1, 2, 3};

        for (int level : floorLevels) {
            Floor floor = new Floor();
            floor.setLevel(level);
            floor.setParking(parking);
            floor = floorRepository.save(floor);

            int spotNumber = 1;

            // 5% disabili = 5 posti
            for (int i = 0; i < 5; i++) {
                saveSpot(floor, level, "H", spotNumber++, SpotType.HANDICAPPED);
            }

            // 10% elettrici = 10 posti
            for (int i = 0; i < 10; i++) {
                saveSpot(floor, level, "E", spotNumber++, SpotType.ELECTRIC);
            }

            // 10% moto = 10 posti
            for (int i = 0; i < 10; i++) {
                saveSpot(floor, level, "M", spotNumber++, SpotType.MOTORBIKE);
            }

            // 75% auto standard = 75 posti
            for (int i = 0; i < 75; i++) {
                saveSpot(floor, level, "A", spotNumber++, SpotType.CAR);
            }

            System.out.println("[DataInitializer] Piano " + level + " creato con 100 posti.");
        }

        System.out.println("[DataInitializer] Parcheggio inizializzato: 3 piani, 300 posti totali.");
    }

    private void saveSpot(Floor floor, int level, String prefix, int number, SpotType type) {
        Spot spot = new Spot();
        spot.setFloor(floor);
        spot.setType(type);
        spot.setOccupied(false);
        // Codice es: P1-A001, P2-H003, P3-E010
        spot.setCode(String.format("P%d-%s%03d", level, prefix, number));
        spotRepository.save(spot);
    }
}
