package com.example.progetto_parking_system.security;

import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.progetto_parking_system.model.User;
import com.example.progetto_parking_system.repository.UserRepository;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authManager;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody AuthRequest request, HttpServletRequest httpRequest) {

        Authentication auth = authManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(auth);

        // Crea la sessione HTTP e vi salva il contesto di sicurezza
        HttpSession session = httpRequest.getSession(true);
        session.setAttribute("SPRING_SECURITY_CONTEXT", SecurityContextHolder.getContext());

        User u = userRepository.findByUsername(request.getUsername()).get();
        return ResponseEntity.ok(new AuthResponse(u.getUsername(), u.getRole()));
    }

    @PostMapping("/logout")
    public ResponseEntity<String> logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok("Logout effettuato.");
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest request) {

        if (userRepository.findByUsername(request.getUsername()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("Username già registrato");
        }

        User newUser = new User();
        newUser.setUsername(request.getUsername());
        newUser.setPassword(passwordEncoder.encode(request.getPassword()));
        newUser.setRole("USER");

        if (request.getSubscriptionType() != null && !request.getSubscriptionType().isEmpty()) {
            newUser.setActive(true);
            newUser.setSubscriptionQrCode(UUID.randomUUID().toString());

            java.time.LocalDate now = java.time.LocalDate.now();
            switch (request.getSubscriptionType().toUpperCase()) {
                case "MONTHLY":
                    newUser.setSubscriptionEndDate(now.plusMonths(1));
                    break;
                case "QUARTERLY":
                    newUser.setSubscriptionEndDate(now.plusMonths(3));
                    break;
                case "YEARLY":
                    newUser.setSubscriptionEndDate(now.plusYears(1));
                    break;
                default:
                    newUser.setSubscriptionEndDate(now.plusMonths(1));
                    break;
            }
        }

        userRepository.save(newUser);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body("Registrazione completata con successo");
    }
}