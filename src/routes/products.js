const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");

router.post("/products", productController.createProduct);

router.get("/products", productController.getProducts);

router.delete("/products/:productId", productController.deleteProduct);

router.get("/categories", productController.getCategories);

router.get("/products/low-stock", productController.getLowStockProducts);

module.exports = router;
