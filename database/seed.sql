INSERT INTO categories (category_id, category_name) VALUES
    (1, 'IT'),
    (2, 'Office Supply');

INSERT INTO products (product_id, sku, product_name, cost_price, stock_quantity, category_id) VALUES
    (1, 'IT-001', 'Wireless Mouse', 250.00, 20, 1),
    (2, 'IT-002', 'Mechanical Keyboard', 890.00, 3, 1),
    (3, 'IT-003', 'USB-C Hub', 450.00, 2, 1),
    (4, 'OS-002', 'Stapler', 65.00, 4, 2);

INSERT INTO stock_transactions (transaction_id, product_id, transaction_type, quantity, reason) VALUES
    (1, 1, 'IN', 20, 'Initial sample stock'),
    (2, 2, 'IN', 3, 'Initial sample stock'),
    (3, 3, 'IN', 2, 'Initial sample stock'),
    (4, 4, 'IN', 4, 'Initial sample stock');

SELECT setval('categories_category_id_seq', (SELECT MAX(category_id) FROM categories));
SELECT setval('products_product_id_seq', (SELECT MAX(product_id) FROM products));
SELECT setval('stock_transactions_transaction_id_seq', (SELECT MAX(transaction_id) FROM stock_transactions));
