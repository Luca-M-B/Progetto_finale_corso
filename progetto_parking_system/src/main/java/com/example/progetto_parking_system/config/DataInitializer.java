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
 * Componente per l'inizializzazione automatica dei dati all'avvio dell'applicazione.
 * Crea una struttura di parcheggio predefinita con 3 piani e 300 posti totali,
 * suddivisi per tipologia (Auto, Moto, Elettrici, Disabili).
 * L'inizializzazione avviene solo se il database risulta vuoto.
 */
@Component
public class DataInitializer implements CommandLineRunner {

    private final ParkingRepository parkingRepository;
    private final FloorRepository floorRepository;
    private final SpotRepository spotRepository;

    /**
     * Iniezione dei repository necessari per popolare il database.
     */
    public DataInitializer(ParkingRepository parkingRepository,
            FloorRepository floorRepository,
            SpotRepository spotRepository) {
        this.parkingRepository = parkingRepository;
        this.floorRepository = floorRepository;
        this.spotRepository = spotRepository;
    }

    /**
     * Metodo eseguito automaticamente all'avvio di Spring Boot.
     */
    @Override
    public void run(String... args) {
        // Controllo esistenza dati: se ci sono già posti auto, non facciamo nulla per evitare duplicati
        if (spotRepository.count() > 0) {
            System.out.println("[DataInitializer] Configurazione esistente trovata. Salto l'inizializzazione.");
            return;
        }

        System.out.println("[DataInitializer] Avvio creazione struttura parcheggio predefinita...");

        // 1. Creazione dell'entità Parcheggio principale
        Parking parking = new Parking();
        parking.setName("ParkSync Centro");
        parking.setLocation("Via Roma 1, Milano");
        parking = parkingRepository.save(parking);

        // 2. Definizione dei piani (es. 1, 2, 3)
        int[] floorLevels = { 1, 2, 3 };

        for (int level : floorLevels) {
            Floor floor = new Floor();
            floor.setLevel(level);
            floor.setParking(parking);
            floor = floorRepository.save(floor);

            int spotNumber = 1;

            // 3. Generazione dei 100 posti per ogni piano secondo una distribuzione specifica:
            
            // 5 posti per disabili (HANDICAPPED) - Prefisso "H"
            for (int i = 0; i < 5; i++) {
                saveSpot(floor, level, "H", spotNumber++, SpotType.HANDICAPPED);
            }

            // 10 posti per veicoli elettrici (ELECTRIC) - Prefisso "E"
            for (int i = 0; i < 10; i++) {
                saveSpot(floor, level, "E", spotNumber++, SpotType.ELECTRIC);
            }

            // 10 posti per motocicli (MOTORBIKE) - Prefisso "M"
            for (int i = 0; i < 10; i++) {
                saveSpot(floor, level, "M", spotNumber++, SpotType.MOTORBIKE);
            }

            // 75 posti per auto standard (CAR) - Prefisso "A"
            for (int i = 0; i < 75; i++) {
                saveSpot(floor, level, "A", spotNumber++, SpotType.CAR);
            }

            System.out.println("[DataInitializer] Piano " + level + " configurato con successo.");
        }

        System.out.println("[DataInitializer] Inizializzazione completata: 3 piani, 300 posti totali inseriti.");
    }

    /**
     * Helper per creare e salvare un singolo posto auto nel database.
     * 
     * @param floor Il piano a cui appartiene il posto
     * @param level Il numero del piano
     * @param prefix Prefisso per il codice identificativo (es. H, E, M, A)
     * @param number Numero progressivo del posto nel piano
     * @param type Tipologia di posto (Enum SpotType)
     */
    private void saveSpot(Floor floor, int level, String prefix, int number, SpotType type) {
        Spot spot = new Spot();
        spot.setFloor(floor);
        spot.setType(type);
        spot.setOccupied(false); // All'inizio tutti i posti sono liberi
        
        // Generazione codice univoco leggibile, es: P1-A001 (Piano 1, Auto, numero 001)
        spot.setCode(String.format("P%d-%s%03d", level, prefix, number));
        spotRepository.save(spot);
    }
}
