require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const app = express();

app.use(express.json());   // สำคัญ! ต้องมีเพื่ออ่าน req.body
app.use(cors());
app.use(express.static(path.join(__dirname, "..", "public")));

const productRoutes = require("./routes/products");
app.use("/api", productRoutes);

const PORT = process.env.PORT || 3000;
const stockRoutes = require("./routes/stock");
app.use("/api", stockRoutes);

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
