package com.example.vegshop.controller;

import com.example.vegshop.config.JwtUtils;
import com.example.vegshop.model.Role;
import com.example.vegshop.model.User;
import com.example.vegshop.repository.RoleRepository;
import com.example.vegshop.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtUtils jwtUtils;
    private final UserRepository userRepo;
    private final RoleRepository roleRepo;
    private final PasswordEncoder encoder;

    public AuthController(AuthenticationManager authenticationManager,
                          JwtUtils jwtUtils,
                          UserRepository userRepo,
                          RoleRepository roleRepo,
                          PasswordEncoder encoder) {
        this.authenticationManager = authenticationManager;
        this.jwtUtils = jwtUtils;
        this.userRepo = userRepo;
        this.roleRepo = roleRepo;
        this.encoder = encoder;
    }

    public record LoginRequest(String username, String password) {}
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest req) {
        try {
            var auth = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(req.username(), req.password())
            );
            String username = auth.getName();
            String token = jwtUtils.generateToken(username);
            return ResponseEntity.ok(Map.of("token", token, "username", username));
        } catch (BadCredentialsException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "invalid credentials"));
        } catch (AuthenticationException ex) {
            // any other authentication error
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "authentication failed"));
        }
    }

    // inside AuthController.java
    @GetMapping("/me")
    public ResponseEntity<?> me(@RequestHeader("Authorization") String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        if (!jwtUtils.validateToken(token)) {
            return ResponseEntity.status(401).body(Map.of("error", "invalid token"));
        }
        String username = jwtUtils.getUsernameFromToken(token);
        var user = userRepo.findByUsername(username).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("error", "user not found"));
        }
        var roles = user.getRoles().stream().map(Role::getName).toList();
        return ResponseEntity.ok(Map.of("username", username, "roles", roles));
    }


    public record RegisterRequest(String username, String email, String password) {}
    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest req) {
        if (userRepo.existsByUsername(req.username())) {
            return ResponseEntity.status(409).body(Map.of("error", "username already taken"));
        }
        if (userRepo.existsByEmail(req.email())) {
            return ResponseEntity.status(409).body(Map.of("error", "email already registered"));
        }

        Role userRole = roleRepo.findByName("ROLE_USER").orElseGet(() -> roleRepo.save(new Role("ROLE_USER")));

        User u = new User();
        u.setUsername(req.username());
        u.setEmail(req.email());
        u.setPassword(encoder.encode(req.password()));
        u.setRoles(Set.of(userRole));

        userRepo.save(u);

        String token = jwtUtils.generateToken(u.getUsername());
        return ResponseEntity.ok(Map.of("token", token, "username", u.getUsername()));
    }
}