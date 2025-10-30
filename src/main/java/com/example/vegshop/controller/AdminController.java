package com.example.vegshop.controller;

import com.example.vegshop.model.Product;
import com.example.vegshop.service.ProductService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final ProductService svc;
    private final ObjectMapper mapper;

    public AdminController(ProductService svc, ObjectMapper mapper){
        this.svc = svc;
        this.mapper = mapper;
    }

    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @PostMapping(value = "/products", consumes = {"multipart/form-data"})
    public ResponseEntity<?> create(
            @RequestPart("product") String productJson,
            @RequestPart(name = "image", required = false) MultipartFile image
    ) {
        try {
            Product p = mapper.readValue(productJson, Product.class);
            Product saved = svc.saveWithImage(p, image);
            return ResponseEntity.ok(saved);
        } catch (IOException e) {
            return ResponseEntity.status(400).body("Invalid product JSON");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Save failed: " + e.getMessage());
        }
    }

    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @PutMapping(value = "/products/{id}", consumes = {"multipart/form-data"})
    public ResponseEntity<?> update(
            @PathVariable Long id,
            @RequestPart("product") String productJson,
            @RequestPart(name = "image", required = false) MultipartFile image
    ) {
        try {
            Product p = mapper.readValue(productJson, Product.class);
            Optional<Product> updated = svc.updateWithImage(id, p, image);
            return updated.map(prod -> ResponseEntity.ok(prod))
                    .orElse(ResponseEntity.notFound().build());
        } catch (IOException e) {
            return ResponseEntity.status(400).body("Invalid product JSON");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Update failed: " + e.getMessage());
        }
    }

    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @DeleteMapping("/products/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id){
        svc.delete(id);
        return ResponseEntity.ok().build();
    }


    @PreAuthorize("hasAuthority('ROLE_ADMIN')")
    @GetMapping("/products")
    public List<Product> listAll(){ return svc.listAll(); }
}