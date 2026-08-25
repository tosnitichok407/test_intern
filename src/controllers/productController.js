const pool = require("../config/db");

exports.createProduct = async (req, res) => {
    const { sku, product_name, cost_price, stock_quantity, category_id } = req.body;

    // validate เบื้องต้น
    if (!sku || !product_name || cost_price == null || !category_id) {
        return res.status(400).json({
            error: "sku, product_name, cost_price และ category_id เป็นฟิลด์ที่จำเป็น"
        });
    }

    try {
        const query = `
            INSERT INTO products (sku, product_name, cost_price, stock_quantity, category_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;
        const values = [
            sku,
            product_name,
            cost_price,
            stock_quantity || 0,
            category_id
        ];

        const result = await pool.query(query, values);
        res.status(201).json(result.rows[0]);

    } catch (err) {
        // sku ซ้ำ (unique constraint)
        if (err.code === "23505") {
            return res.status(409).json({ error: "SKU นี้มีอยู่ในระบบแล้ว" });
        }
        // category_id ไม่มีอยู่จริง (foreign key)
        if (err.code === "23503") {
            return res.status(400).json({ error: "category_id ไม่ถูกต้อง" });
        }

        console.error(err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในระบบ" });
    }
};

exports.getLowStockProducts = async (req, res) => {
    try {
        const query = `
            SELECT 
                p.product_id,
                p.sku,
                p.product_name,
                p.stock_quantity,
                p.cost_price,
                c.category_name
            FROM products p
            JOIN categories c ON p.category_id = c.category_id
            WHERE p.stock_quantity < 5
            ORDER BY p.stock_quantity ASC
        `;

        const result = await pool.query(query);

        res.status(200).json({
            count: result.rows.length,
            products: result.rows
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในระบบ" });
    }
};