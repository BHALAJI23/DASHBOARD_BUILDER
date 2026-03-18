-- Create customer_orders table
CREATE TABLE IF NOT EXISTS customer_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
    total_amount DECIMAL(12, 2) NOT NULL,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON customer_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON customer_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_customer_name ON customer_orders(customer_name);

-- Enable RLS
ALTER TABLE customer_orders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can read their own orders"
ON customer_orders
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own orders"
ON customer_orders
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orders"
ON customer_orders
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own orders"
ON customer_orders
FOR DELETE
USING (auth.uid() = user_id);

-- Create sample data (optional)
INSERT INTO customer_orders (user_id, customer_name, product_name, quantity, unit_price, total_amount, order_date)
SELECT 
    auth.uid(),
    'Customer ' || (row_number() OVER ()),
    'Product ' || (MOD(row_number() OVER (), 5) + 1),
    FLOOR(RANDOM() * 100 + 1)::INTEGER,
    (RANDOM() * 200 + 10)::NUMERIC(10, 2),
    (FLOOR(RANDOM() * 100 + 1) * (RANDOM() * 200 + 10))::NUMERIC(12, 2),
    CURRENT_TIMESTAMP - (FLOOR(RANDOM() * 90) || ' days')::INTERVAL
FROM generate_series(1, 20);
