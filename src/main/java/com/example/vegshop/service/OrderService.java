package com.example.vegshop.service;

import com.example.vegshop.model.*;
import com.example.vegshop.repository.OrderRepository;
import com.example.vegshop.repository.ProductRepository;
import com.example.vegshop.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;

@Service
public class OrderService {
    private final OrderRepository orderRepo;
    private final ProductRepository productRepo;
    private final UserRepository userRepo;

    public OrderService(OrderRepository orderRepo, ProductRepository productRepo, UserRepository userRepo){
        this.orderRepo = orderRepo;
        this.productRepo = productRepo;
        this.userRepo = userRepo;
    }

    @Transactional
    public Order placeOrder(String username, java.util.List<com.example.vegshop.dto.OrderDto.Item> items){
        User user = userRepo.findByUsername(username).orElseThrow(() -> new RuntimeException("User not found"));
        Order order = new Order();
        order.setUser(user);

        BigDecimal total = BigDecimal.ZERO;
        var orderItems = new ArrayList<OrderItem>();
        for (var it : items){
            Product p = productRepo.findById(it.getProductId())
                    .orElseThrow(() -> new RuntimeException("Product not found: " + it.getProductId()));
            if (p.getStock() < it.getQuantity()) throw new RuntimeException("Insufficient stock for " + p.getName());
            // reduce stock
            p.setStock(p.getStock() - it.getQuantity());
            productRepo.save(p);

            OrderItem oi = new OrderItem();
            oi.setProductId(p.getId());
            oi.setProductName(p.getName());
            oi.setQuantity(it.getQuantity());
            oi.setPrice(p.getPrice());
            orderItems.add(oi);

            total = total.add(p.getPrice().multiply(BigDecimal.valueOf(it.getQuantity())));
        }
        order.setItems(orderItems);
        order.setTotal(total);
        return orderRepo.save(order);
    }
}