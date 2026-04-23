package com.example.progetto_parking_system.service;

import java.util.List;

import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.example.progetto_parking_system.repository.UserRepository;

/**
 * Servizio personalizzato per il caricamento dei dettagli dell'utente durante l'autenticazione.
 * Implementa l'interfaccia UserDetailsService di Spring Security.
 */
@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository repo; // Repository per l'accesso ai dati degli utenti registrati

    public CustomUserDetailsService(UserRepository repo) {
        this.repo = repo;
    }

    /**
     * Carica le informazioni dell'utente dal database partendo dallo username.
     * Metodo utilizzato internamente da Spring Security per validare le credenziali.
     * 
     * @param username Il nome utente inserito nel form di login
     * @return UserDetails Oggetto contenente username, password cifrata e permessi (ruoli)
     * @throws UsernameNotFoundException Se l'utente non è presente nel database
     */
    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        // Ricerca l'utente nel database tramite repository
        com.example.progetto_parking_system.model.User u = repo.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("Utente '" + username + "' non trovato nel sistema"));

        // Crea e ritorna l'oggetto User compatibile con Spring Security
        // Associa il ruolo dell'utente (es. USER -> ROLE_USER)
        return new org.springframework.security.core.userdetails.User(
                u.getUsername(),
                u.getPassword(),
                List.of(new SimpleGrantedAuthority("ROLE_" + u.getRole())));
    }
}