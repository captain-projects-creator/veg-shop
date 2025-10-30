package com.example.vegshop.repository;

import com.example.vegshop.model.Order;
import com.example.vegshop.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByUser(User user);
}
