# API Documentation — Test Intern

Base URL: `http://localhost:3000/api`

ทุก Request/Response เป็น JSON — ต้องส่ง Header:
```
Content-Type: application/json
```

## หน้าจอจัดการคลัง

เมื่อเปิดเซิร์ฟเวอร์ ให้เข้า `http://localhost:3000` เพื่อใช้งานแดชบอร์ดจัดการสินค้าและสต็อก
โดยหน้าจอจะแสดงรายการสินค้า สินค้าใกล้หมด และฟอร์มเพิ่มสินค้า/ปรับสต็อก

### API ที่ใช้โดยหน้าจอ

| Method | URL | รายละเอียด |
|---|---|---|
| `GET` | `/products` | ดึงรายการสินค้าทั้งหมดพร้อมหมวดหมู่ |
| `GET` | `/categories` | ดึงหมวดหมู่สำหรับเลือกตอนเพิ่มสินค้า |
| `DELETE` | `/products/:productId` | ลบสินค้าและประวัติการปรับสต็อกที่เกี่ยวข้อง |

---

## 1. Create Product

สร้างสินค้าใหม่ในระบบ

| | |
|---|---|
| **Method** | `POST` |
| **URL** | `/products` |
| **Header** | `Content-Type: application/json` |

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| `sku` | string | ✅ | รหัสสินค้า (ต้องไม่ซ้ำ) |
| `product_name` | string | ✅ | ชื่อสินค้า |
| `cost_price` | decimal | ✅ | ราคาทุน |
| `stock_quantity` | integer | ❌ (default: 0) | จำนวนสต็อกเริ่มต้น |
| `category_id` | integer | ✅ | รหัสหมวดหมู่ (ต้องมีอยู่จริงในตาราง categories) |

**ตัวอย่าง:**
```json
{
  "sku": "IT-001",
  "product_name": "Wireless Mouse",
  "cost_price": 250.00,
  "stock_quantity": 20,
  "category_id": 1
}
```

### Response

**✅ 201 Created**
```json
{
  "product_id": 1,
  "sku": "IT-001",
  "product_name": "Wireless Mouse",
  "cost_price": "250.00",
  "stock_quantity": 20,
  "category_id": 1
}
```

**❌ 400 Bad Request** — ขาดฟิลด์ที่จำเป็น
```json
{
  "error": "sku, product_name, cost_price และ category_id เป็นฟิลด์ที่จำเป็น"
}
```

**❌ 400 Bad Request** — category_id ไม่มีอยู่จริง
```json
{
  "error": "category_id ไม่ถูกต้อง"
}
```

**❌ 409 Conflict** — sku ซ้ำ
```json
{
  "error": "SKU นี้มีอยู่ในระบบแล้ว"
}
```

**❌ 500 Internal Server Error**
```json
{
  "error": "เกิดข้อผิดพลาดในระบบ"
}
```

---

## 2. Adjust Stock

ปรับจำนวนสต็อกสินค้า (เพิ่ม/ลด) พร้อมบันทึกประวัติการทำรายการอัตโนมัติ

| | |
|---|---|
| **Method** | `PATCH` |
| **URL** | `/stock/adjust` |
| **Header** | `Content-Type: application/json` |

### Request Body

| Field | Type | Required | Description |
|---|---|---|---|
| `product_id` | integer | ✅ | รหัสสินค้าที่ต้องการปรับสต็อก |
| `quantity` | integer | ✅ | จำนวนที่ต้องการปรับ ค่าบวก = เพิ่มสต็อก (IN), ค่าลบ = ลดสต็อก (OUT) ห้ามเป็น 0 |
| `reason` | string | ❌ | เหตุผลในการปรับสต็อก |

**ตัวอย่าง — ลดสต็อก (ขายสินค้า):**
```json
{
  "product_id": 1,
  "quantity": -5,
  "reason": "ขายสินค้า"
}
```

**ตัวอย่าง — เพิ่มสต็อก (รับสินค้าเข้า):**
```json
{
  "product_id": 1,
  "quantity": 10,
  "reason": "รับสินค้าเข้าคลัง"
}
```

### Logic สำคัญ
- ระบบตรวจสอบก่อนว่าถ้าปรับแล้วจำนวนสต็อกจะติดลบหรือไม่ ถ้าติดลบจะ **reject ทันที** ไม่ทำการเปลี่ยนแปลงใดๆ
- ทุกครั้งที่ปรับสต็อกสำเร็จ ระบบจะบันทึกแถวใหม่ในตาราง `stock_transactions` โดยอัตโนมัติ (การ update stock และการบันทึกประวัติทำเป็น transaction เดียวกัน รับประกันว่าข้อมูลตรงกันเสมอ)
- เวลาที่บันทึกในประวัติ (`transaction_date`) แปลงเป็นเขตเวลาไทย (Asia/Bangkok) ก่อนส่งกลับ

### Response

**✅ 200 OK**
```json
{
  "message": "ปรับสต็อกสำเร็จ",
  "product_id": 1,
  "previous_stock": 20,
  "new_stock": 15,
  "transaction": {
    "transaction_id": 1,
    "product_id": 1,
    "transaction_type": "OUT",
    "quantity": 5,
    "transaction_date": "2026-08-25 18:40:32",
    "reason": "ขายสินค้า"
  }
}
```

**❌ 400 Bad Request** — ขาดฟิลด์ที่จำเป็น หรือ quantity เป็น 0
```json
{
  "error": "product_id และ quantity (ไม่เท่ากับ 0) จำเป็นต้องระบุ"
}
```

**❌ 400 Bad Request** — สต็อกไม่พอ (ปรับแล้วจะติดลบ)
```json
{
  "error": "สต็อกไม่เพียงพอ (คงเหลือ 15, ต้องการหัก 1000)"
}
```

**❌ 404 Not Found** — ไม่พบสินค้า
```json
{
  "error": "ไม่พบสินค้านี้ในระบบ"
}
```

**❌ 500 Internal Server Error**
```json
{
  "error": "เกิดข้อผิดพลาดในระบบ"
}
```

---

## 3. Get Low Stock Products

ดึงรายการสินค้าที่มีจำนวนคงเหลือน้อยกว่า 5 ชิ้น (Low stock alert)

| | |
|---|---|
| **Method** | `GET` |
| **URL** | `/products/low-stock` |
| **Header** | ไม่จำเป็น (ไม่มี Request Body) |

### Response

**✅ 200 OK**
```json
{
  "count": 3,
  "products": [
    {
      "product_id": 3,
      "sku": "IT-003",
      "product_name": "USB-C Hub",
      "stock_quantity": 2,
      "cost_price": "450.00",
      "category_name": "IT"
    },
    {
      "product_id": 2,
      "sku": "IT-002",
      "product_name": "Mechanical Keyboard",
      "stock_quantity": 3,
      "cost_price": "890.00",
      "category_name": "IT"
    },
    {
      "product_id": 4,
      "sku": "OS-002",
      "product_name": "Stapler",
      "stock_quantity": 4,
      "cost_price": "65.00",
      "category_name": "Office Supply"
    }
  ]
}
```
ผลลัพธ์เรียงจากสต็อกน้อยที่สุดไปมากที่สุด (ascending)

**❌ 500 Internal Server Error**
```json
{
  "error": "เกิดข้อผิดพลาดในระบบ"
}
```

---

## สรุป Error Codes ที่ใช้ทั้งระบบ

| Status Code | ความหมาย |
|---|---|
| `200 OK` | ทำรายการสำเร็จ (GET, PATCH) |
| `201 Created` | สร้างข้อมูลใหม่สำเร็จ (POST) |
| `400 Bad Request` | ข้อมูลที่ส่งมาไม่ถูกต้อง / ไม่ครบ / ผิดเงื่อนไข business logic |
| `404 Not Found` | ไม่พบข้อมูลที่ระบุ |
| `409 Conflict` | ข้อมูลซ้ำกับที่มีอยู่แล้ว (unique constraint) |
| `500 Internal Server Error` | เกิดข้อผิดพลาดฝั่ง server / database |
