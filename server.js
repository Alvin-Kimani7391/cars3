import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const app = express();

// ===============================
// FIX FOR ES MODULE PATH
// ===============================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===============================
// MIDDLEWARE
// ===============================
app.use(cors());
app.use(express.json());

// ===============================
// DATA FILE
// ===============================
const carsFilePath = path.join(__dirname, "cars.json");

// ===============================
// LOAD DATA FUNCTION
// ===============================
function loadCars() {
  const data = fs.readFileSync(carsFilePath, "utf-8");
  return JSON.parse(data);
}

// ===============================
// API ROUTES
// ===============================

// GET ALL CARS
app.get("/api/cars", (req, res) => {
  try {
    const cars = loadCars();
    res.json(cars);
  } catch (err) {
    console.error("Error loading cars:", err);
    res.status(500).json({ error: "Failed to load cars data" });
  }
});

// GET SINGLE CAR (API)
app.get("/api/cars/:id", (req, res) => {
  try {
    const cars = loadCars();

    const car = cars.find(c => String(c.id) === String(req.params.id));

    if (!car) {
      return res.status(404).json({ error: "Car not found" });
    }

    res.json(car);
  } catch (err) {
    console.error("Error fetching car:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ===============================
// 🔥 WHATSAPP + SEO SHARE ROUTE
// ===============================
// This is the MOST IMPORTANT PART
// It creates OpenGraph preview for WhatsApp/Facebook

app.get("/product/:id", (req, res) => {
  try {
    const cars = loadCars();

    const product = cars.find(c => String(c.id) === String(req.params.id));

    if (!product) {
      return res.status(404).send("Product not found");
    }

    const image = Array.isArray(product.image)
      ? product.image[0]
      : product.image;

    const title = `${product.make} ${product.model}`;
    const description = product.description || "View product details";

    const frontendURL = `https://your-frontend.vercel.app/carstv.html?id=${product.id}`;
    const backendURL = `https://your-backend.onrender.com/product/${product.id}`;

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">

        <!-- Open Graph (WhatsApp / Facebook Preview) -->
        <meta property="og:type" content="website" />
        <meta property="og:title" content="${title}" />
        <meta property="og:description" content="${description}" />
        <meta property="og:image" content="${image}" />
        <meta property="og:url" content="${backendURL}" />

        <!-- Twitter -->
        <meta name="twitter:card" content="summary_large_image" />

        <!-- Redirect user to frontend after preview -->
        <meta http-equiv="refresh" content="0; url=${frontendURL}" />

        <title>${title}</title>
      </head>
      <body>
        <p>Redirecting to product page...</p>
      </body>
      </html>
    `);

  } catch (err) {
    console.error("Error in /product/:id:", err);
    res.status(500).send("Server error");
  }
});

// ===============================
// HEALTH CHECK (RENDER REQUIRED)
// ===============================
app.get("/", (req, res) => {
  res.send("🚀 Car API is running successfully");
});

// ===============================
// START SERVER
// ===============================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});