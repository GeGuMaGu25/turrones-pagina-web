import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import contactRoute from "./routes/contact.js";

import productsRoute from "./routes/products.js";
import ordersRoute from "./routes/orders.js";

const app = express();

app.use(cors({
  origin: [
    "https://deliciasyesi.lat",
    "https://www.deliciasyesi.lat"
  ],
  methods: ["GET", "POST"],
  credentials: false
}));
app.use(helmet());
app.use(express.json());

// Rutas
app.use("/api/products", productsRoute);
app.use("/api/orders", ordersRoute);
app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/contact", contactRoute);

// Errores
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 400).json({ error: err.message || "Error" });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`API lista en http://localhost:${port}`));
