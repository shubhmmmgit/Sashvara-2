-- Example SQL Schema for Products and Product Images
-- This is for reference - your current MongoDB setup is already working

-- Products Table
CREATE TABLE products (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    product_id VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    size VARCHAR(20),
    colour VARCHAR(50),
    mrp DECIMAL(10,2) NOT NULL,
    sell_price DECIMAL(10,2) NOT NULL,
    gender ENUM('Men', 'Women', 'Unisex') NOT NULL,
    stock_quantity INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Constraints
    CHECK (sell_price <= mrp),
    CHECK (stock_quantity >= 0),
    CHECK (mrp > 0),
    CHECK (sell_price > 0)
);

-- Product Images Table
CREATE TABLE product_images (
    id VARCHAR(36) PRIMARY KEY DEFAULT (UUID()),
    product_id VARCHAR(36) NOT NULL,
    image_url VARCHAR(500) NOT NULL,
    image_order INT DEFAULT 0,
    is_primary BOOLEAN DEFAULT FALSE,
    alt_text VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Key
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    
    -- Constraints
    CHECK (image_order >= 0)
);

-- Indexes for better performance
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_gender ON products(gender);
CREATE INDEX idx_products_active ON products(is_active);
CREATE INDEX idx_product_images_product_id ON product_images(product_id);
CREATE INDEX idx_product_images_order ON product_images(product_id, image_order);

-- Example data insertion
INSERT INTO products (product_id, product_name, description, category, size, colour, mrp, sell_price, gender, stock_quantity) VALUES
('AMD0XS', 'AAROHI MAXI DRESS', 'Elegant maxi dress perfect for special occasions', 'Maxi dress', 'XS', 'Lavender', 1499.00, 999.00, 'Women', 10),
('AMD1S', 'AAROHI MAXI DRESS', 'Elegant maxi dress perfect for special occasions', 'Maxi dress', 'S', 'Lavender', 1499.00, 999.00, 'Women', 15),
('AMD2M', 'AAROHI MAXI DRESS', 'Elegant maxi dress perfect for special occasions', 'Maxi dress', 'M', 'Lavender', 1499.00, 999.00, 'Women', 20);

-- Example image data
INSERT INTO product_images (product_id, image_url, image_order, is_primary, alt_text) VALUES
('AMD0XS', '/images/AAROHI MAXI DRESS1.webp', 1, TRUE, 'AAROHI MAXI DRESS - Front View'),
('AMD0XS', '/images/AAROHI MAXI DRESS2.webp', 2, FALSE, 'AAROHI MAXI DRESS - Back View'),
('AMD0XS', '/images/AAROHI MAXI DRESS3.webp', 3, FALSE, 'AAROHI MAXI DRESS - Side View'),
('AMD0XS', '/images/AAROHI MAXI DRESS4.webp', 4, FALSE, 'AAROHI MAXI DRESS - Detail View');

-- Query to get products with images
SELECT 
    p.*,
    JSON_ARRAYAGG(
        JSON_OBJECT(
            'id', pi.id,
            'image_url', pi.image_url,
            'image_order', pi.image_order,
            'is_primary', pi.is_primary,
            'alt_text', pi.alt_text
        )
    ) as images
FROM products p
LEFT JOIN product_images pi ON p.id = pi.product_id
WHERE p.is_active = TRUE
GROUP BY p.id
ORDER BY p.created_at DESC;
