package com.example.vegshop.config;

import com.example.vegshop.model.Role;
import com.example.vegshop.model.User;
import com.example.vegshop.repository.RoleRepository;
import com.example.vegshop.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Set;

@Component
public class DataInitializer implements CommandLineRunner {

    private final RoleRepository roleRepo;
    private final UserRepository userRepo;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(RoleRepository roleRepo,
                           UserRepository userRepo,
                           PasswordEncoder passwordEncoder) {
        this.roleRepo = roleRepo;
        this.userRepo = userRepo;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        // ensure roles exist
        Role roleUser = roleRepo.findByName("ROLE_USER").orElseGet(() -> roleRepo.save(new Role("ROLE_USER")));
        Role roleAdmin = roleRepo.findByName("ROLE_ADMIN").orElseGet(() -> roleRepo.save(new Role("ROLE_ADMIN")));

        // create a default admin user if not present
        String adminUsername = "admin";   // change to your desired admin username
        if (userRepo.findByUsername(adminUsername).isEmpty()) {
            User admin = new User();
            admin.setUsername(adminUsername);
            admin.setEmail("admin@example.com");
            // default password - change immediately in production
            admin.setPassword(passwordEncoder.encode("Admin123!"));
            admin.setRoles(Set.of(roleUser, roleAdmin));
            userRepo.save(admin);
            System.out.println("Created default admin user: " + adminUsername);
        } else {
            // if user exists but lacks admin role, add it
            User existing = userRepo.findByUsername(adminUsername).get();
            boolean hasAdmin = existing.getRoles().stream().anyMatch(r -> "ROLE_ADMIN".equals(r.getName()));
            if (!hasAdmin) {
                existing.getRoles().add(roleAdmin);
                userRepo.save(existing);
                System.out.println("Promoted existing user to admin: " + adminUsername);
            }
        }
    }
}