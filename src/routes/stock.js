const express = require("express");
const router = express.Router();
const stockController = require("../controllers/stockController");

router.patch("/stock/adjust", stockController.adjustStock);

module.exports = router;