package com.example.vegshop.service;

import com.example.vegshop.model.Product;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

public interface ProductService {
    Product save(Product p);
    Product saveWithImage(Product p, MultipartFile image) throws IOException;
    Optional<Product> updateWithImage(Long id, Product p, MultipartFile image) throws IOException;
    Optional<Product> findById(Long id);
    void delete(Long id);
    List<Product> listAll();
    List<Product> search(String q);
}