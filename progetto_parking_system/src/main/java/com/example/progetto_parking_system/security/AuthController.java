package com.example.progetto_parking_system.security;

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
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import java.util.Map;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.example.progetto_parking_system.model.User;
import com.example.progetto_parking_system.repository.UserRepository;
import com.example.progetto_parking_system.service.CustomUserDetailsService;
import com.example.progetto_parking_system.service.SubscriptionService;
import com.example.progetto_parking_system.dto.SubscriptionPurchaseRequest;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authManager;
    private final CustomUserDetailsService userDetailsService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final SubscriptionService subscriptionService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest request, HttpServletRequest httpRequest) {

        Authentication auth = authManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword()));

        SecurityContextHolder.getContext().setAuthentication(auth);

        HttpSession session = httpRequest.getSession(true);
        session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,
                SecurityContextHolder.getContext());

        UserDetails userDetails = userDetailsService.loadUserByUsername(request.getUsername());

        boolean hasActive = false;
        String activeVehicleType = "CAR";
        for (var s : subscriptionService.getMySubscriptions(userDetails.getUsername())) {
            if (Boolean.TRUE.equals(s.getActive())) {
                hasActive = true;
                activeVehicleType = s.getVehicleType() != null ? s.getVehicleType() : "CAR";
                break;
            }
        }

        // Non usiamo più JWT, restituiamo solo successo, username e stato abbonamento
        return ResponseEntity.ok(Map.of(
                "message", "Login effettuato",
                "username", userDetails.getUsername(),
                "hasActiveSubscription", hasActive,
                "activeSubscriptionVehicleType", activeVehicleType));
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestBody Map<String, String> request) {
        return ResponseEntity.status(HttpStatus.GONE).body("JWT disabilitato. Refresh non necessario.");
    }

    @PostMapping("/logout")
    public ResponseEntity<String> logout(@RequestBody Map<String, String> request) {

        return ResponseEntity.ok("Logout effettuato.");
    }

    @Transactional
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

        userRepository.save(newUser);

        if (request.getSubscriptionType() != null && !request.getSubscriptionType().isEmpty()) {
            SubscriptionPurchaseRequest subRequest = new SubscriptionPurchaseRequest();
            subRequest.setType(request.getSubscriptionType());
            subRequest.setVehicleType(request.getVehicleType()); // Passa il tipo veicolo scelto
            // Il purchase assegnerà automaticamente QR code, date, stato attivo e POSTO
            // RISERVATO
            subscriptionService.purchase(newUser.getUsername(), subRequest);
        }

        return ResponseEntity.status(HttpStatus.CREATED)
                .body("Registrazione completata con successo");
    }
}