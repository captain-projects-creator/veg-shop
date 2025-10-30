package com.example.vegshop.service;

import com.example.vegshop.model.Product;
import com.example.vegshop.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.io.IOException;
import java.nio.file.*;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class ProductServiceImpl implements ProductService {

    private final ProductRepository repo;
    private final Path uploadDir;

    public ProductServiceImpl(ProductRepository repo,
                              @Value("${app.upload.dir:uploads}") String uploadDir) throws IOException {
        this.repo = repo;
        this.uploadDir = Paths.get(uploadDir).toAbsolutePath().normalize();
        Files.createDirectories(this.uploadDir); // ensure folder exists
    }

    @Override
    public Product save(Product p) {
        return repo.save(p);
    }

    @Override
    public Product saveWithImage(Product p, MultipartFile image) throws IOException {
        if (image != null && !image.isEmpty()) {
            String original = image.getOriginalFilename();
            String ext = "";
            if (original != null && original.contains(".")) {
                ext = original.substring(original.lastIndexOf('.'));
            }
            String filename = UUID.randomUUID().toString() + ext;
            Path target = uploadDir.resolve(filename);
            try (InputStream in = image.getInputStream()) {
                Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
            }
            // store the URL used by front-end
            p.setImage("/uploads/" + filename);
        }
        return repo.save(p);
    }

    @Override
    public Optional<Product> updateWithImage(Long id, Product p, MultipartFile image) throws IOException {
        return repo.findById(id).map(existing -> {
            existing.setName(p.getName());
            existing.setDescription(p.getDescription());
            existing.setPrice(p.getPrice());
            existing.setStock(p.getStock());
            existing.setCategory(p.getCategory());
            try {
                if (image != null && !image.isEmpty()) {
                    String original = image.getOriginalFilename();
                    String ext = "";
                    if (original != null && original.contains(".")) {
                        ext = original.substring(original.lastIndexOf('.'));
                    }
                    String filename = UUID.randomUUID().toString() + ext;
                    Path target = uploadDir.resolve(filename);
                    try (InputStream in = image.getInputStream()) {
                        Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
                    }
                    existing.setImage("/uploads/" + filename);
                }
            } catch (IOException ex) {
                // wrap so caller can handle
                throw new RuntimeException(ex);
            }
            return repo.save(existing);
        });
    }

    @Override
    public Optional<Product> findById(Long id) { return repo.findById(id); }

    @Override
    public void delete(Long id) { repo.deleteById(id); }

    @Override
    public List<Product> listAll() { return repo.findAll(); }

    @Override
    public List<Product> search(String q) { return repo.findByNameContainingIgnoreCase(q); }
}