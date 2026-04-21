import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();
import express from "express";
import path from "path";
import cors from "cors";
import fs from "fs";

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
app.use(cors({
  origin: [
    "https://car4-ivory.vercel.app",
    "http://localhost:3000"
  ]
}));
app.use(express.json());
app.use("/images", express.static(path.join(__dirname, "images2")));


import Order from "./models/Order.js";

// ===============================
// GENERATE ORDER NUMBER
// ===============================
function generateOrderNumber() {
  return "ORD-" + Math.floor(100000 + Math.random() * 900000);
}

// ===============================
// CREATE ORDER
// ===============================
app.post("/confirm-order", async (req, res) => {
  try {
    const {
      phone,
      email,
      total,
      items,
      location,
      mpesaCode
    } = req.body;

    // ✅ validation
    if (!phone || !email || !total || !items || !mpesaCode) {
      return res.status(400).json({
        error: "Missing required fields"
      });
    }

    const orderNumber = generateOrderNumber();

    const newOrder = new Order({
      orderNumber,
      phone,
      email,
      total,
      items,
      location,
      mpesaCode,
      status: "PENDING"
    });

    await newOrder.save();

    res.json({
      message: "Order placed successfully",
      orderNumber
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to save order"
    });
  }
});

// ===============================
// GET ALL ORDERS (ADMIN)
// ===============================
app.get("/api/orders", async (req, res) => {
  try {
    const key = req.headers["admin-key"];

    if (key !== process.env.ADMIN_KEY) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const orders = await Order.find().sort({ createdAt: -1 });

    res.json(orders);

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to fetch orders"
    });
  }
});

// ===============================
// CONFIRM ORDER (ADMIN)
// ===============================
app.post("/api/orders/confirm/:id", async (req, res) => {
  try {
    const key = req.headers["admin-key"];

    if (key !== process.env.ADMIN_KEY) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        message: "Order not found"
      });
    }

    order.status = "CONFIRMED";
    await order.save();

    res.json({
      message: "Order confirmed"
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to confirm order"
    });
  }
});

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

    // ✅ Ensure image is valid & absolute
    let image = Array.isArray(product.image)
      ? product.image[0]
      : product.image;

    if (!image.startsWith("http")) {
      image = `https://cars3-158h.onrender.com/${image}`;
    }

    const title = `${product.make} ${product.model}`;
    const description = product.description || "View product details";

    const frontendURL = `https://car4-ivory.vercel.app/carstv.html?id=${product.id}`;
    const backendURL = `https://cars3-158h.onrender.com/product/${product.id}`;

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">

        <!-- ✅ Open Graph -->
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="${title}" />
        <meta property="og:description" content="${description}" />
        <meta property="og:image" content="${image}" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:url" content="${backendURL}" />

        <!-- ✅ Twitter -->
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="${title}" />
        <meta name="twitter:description" content="${description}" />
        <meta name="twitter:image" content="${image}" />

        <title>${title}</title>
      </head>

      <body>
        <p>Opening product...</p>

        <!-- ✅ SAFE redirect (works with WhatsApp) -->
        <script>
          setTimeout(() => {
            window.location.href = "${frontendURL}";
          }, 3000);
        </script>
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

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  })
  .catch(err => {
    console.error("❌ MongoDB error:", err);
  });