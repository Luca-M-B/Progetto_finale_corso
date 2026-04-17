package com.example.progetto_parking_system.security;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/auth")
public class AuthController {

    @PostMapping("/register")
    public String register(@RequestBody String body) {
        return "ok";
    }
}