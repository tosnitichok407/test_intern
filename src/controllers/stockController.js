const pool = require("../config/db");

exports.adjustStock = async (req, res) => {
  const { product_id, quantity, reason } = req.body;

  // validate เบื้องต้น
  if (!product_id || quantity == null || quantity === 0) {
    return res.status(400).json({
      error: "product_id และ quantity (ไม่เท่ากับ 0) จำเป็นต้องระบุ",
    });
  }

  const client = await pool.connect(); // ขอ connection แยกสำหรับ transaction

  try {
    await client.query("BEGIN");

    // 1. ดึง stock ปัจจุบัน พร้อม lock แถวนี้ไว้ (FOR UPDATE) กัน race condition
    const productResult = await client.query(
      "SELECT stock_quantity FROM products WHERE product_id = $1 FOR UPDATE",
      [product_id],
    );

    if (productResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "ไม่พบสินค้านี้ในระบบ" });
    }

    const currentStock = productResult.rows[0].stock_quantity;
    const newStock = currentStock + quantity;

    // 2. เช็คไม่ให้ติดลบ
    if (newStock < 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: `สต็อกไม่เพียงพอ (คงเหลือ ${currentStock}, ต้องการหัก ${Math.abs(quantity)})`,
      });
    }

    // 3. update stock ใน products
    await client.query(
      "UPDATE products SET stock_quantity = $1 WHERE product_id = $2",
      [newStock, product_id],
    );

    // 4. insert log ใน stock_transactions
    const transactionType = quantity > 0 ? "IN" : "OUT";
    const transactionResult = await client.query(
      `INSERT INTO stock_transactions (product_id, transaction_type, quantity, reason)
     VALUES ($1, $2, $3, $4)
     RETURNING 
        transaction_id,
        product_id,
        transaction_type,
        quantity,
        TO_CHAR(transaction_date AT TIME ZONE 'Asia/Bangkok', 'YYYY-MM-DD HH24:MI:SS') AS transaction_date,
        reason`,
      [product_id, transactionType, Math.abs(quantity), reason || null],
    );

    await client.query("COMMIT");

    res.status(200).json({
      message: "ปรับสต็อกสำเร็จ",
      product_id,
      previous_stock: currentStock,
      new_stock: newStock,
      transaction: transactionResult.rows[0],
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "เกิดข้อผิดพลาดในระบบ" });
  } finally {
    client.release(); // คืน connection กลับ pool เสมอ
  }
};
