require("dotenv").config();
const express = require("express");
const app = express();

app.use(express.json());   // สำคัญ! ต้องมีเพื่ออ่าน req.body

const productRoutes = require("./routes/products");
app.use("/api", productRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));

const stockRoutes = require("./routes/stock");
app.use("/api", stockRoutes);