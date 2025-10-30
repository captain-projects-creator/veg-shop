INSERT INTO users (id, username, email, password, created_at) VALUES (1, 'admin', 'admin@example.com', '$2a$10$u1B0nVY0/1r30ZfQbq2vmuYk6cZ8xF7a/2S0jF1zqgQKcQvZsQx9u', CURRENT_TIMESTAMP);
-- password is "admin123" encoded with bcrypt (example)
-- user_roles
INSERT INTO user_roles (user_id, role) VALUES (1, 'ROLE_ADMIN');

INSERT INTO products (name, description, price, stock, category) VALUES
('Tomato', 'Fresh red tomatoes', 40.00, 100, 'Vegetables'),
('Potato', 'Organic potatoes', 30.00, 200, 'Vegetables'),
('Spinach', 'Leafy green spinach', 25.00, 50, 'Leafy Greens');
