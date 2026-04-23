package com.example.progetto_parking_system;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import jakarta.annotation.PostConstruct;
import java.util.TimeZone;

@SpringBootApplication
public class ProgettoParkingSystemApplication {

	@PostConstruct
	public void init() {
		// Imposta la timezone predefinita per l'applicazione
		TimeZone.setDefault(TimeZone.getTimeZone("Europe/Rome"));
		System.out.println("Timezone impostata a: " + TimeZone.getDefault().getID());
	}

	public static void main(String[] args) {
		SpringApplication.run(ProgettoParkingSystemApplication.class, args);

		System.out.println("\n\n\n\t\t------ PROGRAMMA RUNNATO 11 ------\n\n\n");
	}

}
