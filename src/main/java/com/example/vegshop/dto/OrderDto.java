package com.example.vegshop.dto;

import java.util.List;

public class OrderDto {
    public static class Item {
        private Long productId;
        private Integer quantity;
        // getters/setters
        public Long getProductId() { return productId; }
        public void setProductId(Long productId) { this.productId = productId; }
        public Integer getQuantity() { return quantity; }
        public void setQuantity(Integer quantity) { this.quantity = quantity; }
    }

    private List<Item> items;
    public List<Item> getItems() { return items; }
    public void setItems(List<Item> items) { this.items = items; }
}
