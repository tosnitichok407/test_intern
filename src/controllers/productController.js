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

exports.getProducts = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.product_id, p.sku, p.product_name, p.cost_price,
                   p.stock_quantity, p.category_id, c.category_name
            FROM products p
            JOIN categories c ON c.category_id = p.category_id
            ORDER BY p.product_name ASC
        `);
        res.status(200).json({ products: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในระบบ" });
    }
};

exports.deleteProduct = async (req, res) => {
    const productId = Number(req.params.productId);

    if (!Number.isInteger(productId) || productId <= 0) {
        return res.status(400).json({ error: "product_id ไม่ถูกต้อง" });
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // Lock สินค้าไว้ เพื่อไม่ให้มีการปรับสต็อกระหว่างลบ
        const productResult = await client.query(
            "SELECT product_id, product_name FROM products WHERE product_id = $1 FOR UPDATE",
            [productId]
        );

        if (productResult.rows.length === 0) {
            await client.query("ROLLBACK");
            return res.status(404).json({ error: "ไม่พบสินค้านี้ในระบบ" });
        }

        // foreign key ของ stock_transactions เป็น NO ACTION จึงลบประวัติที่เกี่ยวข้องก่อน
        await client.query("DELETE FROM stock_transactions WHERE product_id = $1", [productId]);
        await client.query("DELETE FROM products WHERE product_id = $1", [productId]);
        await client.query("COMMIT");

        res.status(200).json({
            message: "ลบสินค้าและประวัติสต็อกที่เกี่ยวข้องเรียบร้อยแล้ว",
            product: productResult.rows[0]
        });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error(err);
        res.status(500).json({ error: "เกิดข้อผิดพลาดในระบบ" });
    } finally {
        client.release();
    }
};

exports.getCategories = async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT category_id, category_name FROM categories ORDER BY category_name ASC"
        );
        res.status(200).json({ categories: result.rows });
    } catch (err) {
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
