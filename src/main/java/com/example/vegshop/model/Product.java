package com.example.vegshop.model;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "products")
public class Product {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Column(columnDefinition = "text")
    private String description;

    private BigDecimal price;
    private Integer stock;
    private String category;

    /**
     * Stores the relative URL to the uploaded image (e.g. /uploads/uuid.png).
     * Front-end should use product.getImage() directly as the src.
     */
    private String image;

    public Product() {}

    // getters / setters

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public Integer getStock() { return stock; }
    public void setStock(Integer stock) { this.stock = stock; }


    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }


    public String getImage() { return image; }
    public void setImage(String image) { this.image = image; }
}