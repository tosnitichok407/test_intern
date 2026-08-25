CREATE TABLE categories (
	category_id INT PRIMARY KEY,
	category_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE products (
	product_id INT PRIMARY KEY,
	sku VARCHAR(50) NOT NULL UNIQUE,
	product_name VARCHAR(255) NOT NULL,
	cost_price DECIMAL(12, 2) NOT NULL CHECK (cost_price >= 0),
	stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
	category_id INT NOT NULL REFERENCES categories(category_id)
);

CREATE TYPE stock_transaction_type AS ENUM ('IN', 'OUT');

CREATE TABLE stock_transactions (
	transaction_id INT PRIMARY KEY,
	product_id INT NOT NULL REFERENCES products(product_id),
	transaction_type stock_transaction_type NOT NULL,
	quantity INT NOT NULL CHECK (quantity > 0),
	transaction_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	reason VARCHAR(255)
);

CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_stock_transactions_product_id ON stock_transactions(product_id);
