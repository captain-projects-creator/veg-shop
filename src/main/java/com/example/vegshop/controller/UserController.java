package com.example.vegshop.controller;

import com.example.vegshop.dto.OrderDto;
import com.example.vegshop.model.Order;
import com.example.vegshop.repository.UserRepository;
import com.example.vegshop.service.OrderService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user")
public class UserController {
    private final OrderService orderService;
    private final UserRepository userRepository;
    public UserController(OrderService orderService, UserRepository userRepository){
        this.orderService = orderService;
        this.userRepository = userRepository;
    }

    @PostMapping("/orders")
    public ResponseEntity<?> placeOrder(@AuthenticationPrincipal String username, @RequestBody OrderDto dto){
        // @AuthenticationPrincipal will be the principal name (username) because we returned UsernamePasswordAuthenticationToken earlier
        Order order = orderService.placeOrder(username, dto.getItems());
        return ResponseEntity.ok(order);
    }
}