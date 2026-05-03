import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();
import express from "express";
import path from "path";
import cors from "cors";
import fs from "fs";
import nodemailer from "nodemailer";
import Agent from "./models/Agent.js";

import { fileURLToPath } from "url";

const app = express();

// ===============================
// FIX FOR ES MODULE PATH
// ===============================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

function formatEmailItems(items) {
  return items.map(item => {
    return `
      <tr>
        <td>${item.make} ${item.model}</td>
        <td>${item.qty}</td>
        <td>KES ${(item.price * item.qty).toLocaleString()}</td>
      </tr>
    `;
  }).join("");
}


function statusEmailTemplate(order, newStatus) {
  return `
  <div style="font-family:Arial; background:#f6f7fb; padding:20px;">
    <div style="max-width:600px; margin:auto; background:#fff; padding:20px; border-radius:10px;">

      <h2 style="color:#ff6600;">Order Update</h2>

      <p>Dear <strong>${order.name || "Customer"}</strong>,</p>

      <p>Your order <strong>${order.orderNumber}</strong> status has been updated.</p>

      <div style="padding:10px; background:#f1f1f1; border-radius:8px;">
        <h3 style="margin:0;">New Status: ${newStatus}</h3>
      </div>

      <p style="margin-top:15px;">
        You can track your order anytime using your order number.
      </p>

      <a href="https://cars4-ivory.vercel.app/trackorder.html"
         style="display:inline-block; margin-top:15px; padding:10px 15px; background:#ff6600; color:#fff; text-decoration:none; border-radius:6px;">
        Track Order
      </a>

      <hr style="margin:20px 0;">

      <p style="font-size:12px; color:#777;">
        Six Star Suppliers © ${new Date().getFullYear()}
      </p>

    </div>
  </div>
  `;
}

const ORDER_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED"
];

// ===============================
// MIDDLEWARE
// ===============================
app.use(cors({
  origin: [
    "https://car4-ivory.vercel.app",
    "http://localhost:3000",
    "http://127.0.0.1:5500"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true
}));
app.use(cors());

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
      name,
      phone,
      email,
      total,
      items,
      location,
      mpesaCode,
       agentCode  // ✅ ADD THIS
    } = req.body;

    // ✅ BASIC VALIDATION FIRST
    if (!name || !phone || !email || !total || !items || !mpesaCode) {
      return res.status(400).json({
        error: "Missing required fields"
      });
    }
let agentName = null;
let cleanAgentCode = null;

if (typeof agentCode === "string" && agentCode.trim() !== "") {
  cleanAgentCode = agentCode.toUpperCase().trim();

  const agent = await Agent.findOne({ code: cleanAgentCode });

  if (!agent) {
    return res.status(400).json({
      error: "Invalid agent code"
    });
  }

  agentName = agent.name;
}

    const orderNumber = generateOrderNumber();

    const newOrder = new Order({
      orderNumber,
      name,
      phone,
      email,
      total,
      items,
      location,
      mpesaCode,
       agentCode: cleanAgentCode || null,
      agentName,
      status: "PENDING",
      statusHistory: [{ status: "PENDING" }]
    });

    await newOrder.save();

    res.json({
      message: "Order placed successfully",
      orderNumber
    });

    try{
    await transporter.sendMail({
  from: `"Six Star Suppliers" <${process.env.EMAIL_USER}>`,
  to: email,
  subject: `Order Confirmation - ${orderNumber}`,

  html: `
<div style="font-family:Arial, sans-serif; background:#f6f7fb; padding:20px;">

  <div style="max-width:600px; margin:auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.1);">

    <!-- HEADER -->
    <div style="background:linear-gradient(135deg,#ff6600,#ffb703); padding:20px; color:white; text-align:center;">
      <h2 style="margin:0;">Six Star Suppliers</h2>
      <p style="margin:5px 0 0;">Order Confirmation</p>
    </div>

    <!-- BODY -->
    <div style="padding:20px; color:#333;">

      <p style="font-size:16px;">
        Dear <strong>${name || "Customer"}</strong>,
      </p>

      <p>Thank you for your order 🎉.</p>

      <p><strong>Order Number:</strong> ${orderNumber}</p>

      <hr style="border:none; border-top:1px solid #eee; margin:15px 0;">

      <!-- ITEMS -->
      <h3 style="margin-bottom:10px;">Your Items</h3>

      <table style="width:100%; border-collapse:collapse;">

        ${(items || []).map(item =>{
          const image = Array.isArray(item.image) ? item.image[0] : item.image;

          return `
          <tr style="border-bottom:1px solid #eee;">
            <td style="padding:10px; width:80px;">
              <img src="${image}" style="width:70px; height:70px; object-fit:cover; border-radius:8px;">
            </td>

            <td style="padding:10px;">
              <strong>${item.make} ${item.model}</strong><br>
              Qty: ${item.qty}
            </td>

            <td style="padding:10px; text-align:right;">
              <strong>KES ${(item.price * item.qty).toLocaleString()}</strong>
            </td>
          </tr>
          `;
        }).join("")}

      </table>

      <!-- TOTAL -->
      <div style="margin-top:15px; text-align:right;">
        <h3>Total: KES ${total.toLocaleString()}</h3>
        <p style="color:#777;">Delivery: ${location}</p>
      </div>

      <!-- TRACK BUTTON -->
      <div style="text-align:center; margin-top:20px;">
        <a href="https://cars4-ivory.vercel.app/trackorder.html"
           style="background:linear-gradient(135deg,#ff6600,#ffb703);
                  color:white;
                  padding:12px 20px;
                  text-decoration:none;
                  border-radius:8px;
                  display:inline-block;">
          Track Your Order
        </a>
      </div>

    </div>

    <!-- FOOTER -->
    <div style="background:#f1f1f1; padding:15px; text-align:center; font-size:12px; color:#666;">
      © ${new Date().getFullYear()} Six Star Suppliers • All rights reserved
    </div>

  </div>

</div>
`
});} catch (emailErr) {
  console.error("Email failed:", emailErr);
}

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
// ===============================
// UPDATE ORDER STATUS (ADMIN)
// ===============================
app.put("/api/orders/status/:id", async (req, res) => {
  try {
    const key = req.headers["admin-key"];

    if (key !== process.env.ADMIN_KEY) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { status } = req.body;

    if (!ORDER_STATUSES.includes(status)) {
      return res.status(400).json({
        error: "Invalid status value"
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        error: "Order not found"
      });
    }

    // ✅ enforce forward movement only
    const currentIndex = ORDER_STATUSES.indexOf(order.status);
    const newIndex = ORDER_STATUSES.indexOf(status);

    if (newIndex < currentIndex) {
      return res.status(400).json({
        error: "Cannot move order backwards"
      });
    }

    order.status = status;

// ✅ save history
order.statusHistory.push({
  status: status,
  date: new Date()
});

await order.save();

    res.json({
      message: "Order status updated successfully",
      status: order.status
    });

    // SEND EMAIL (IMPORTANT PART)
try {
  await transporter.sendMail({
    from: `"Six Star Suppliers" <${process.env.EMAIL_USER}>`,
    to: order.email,
    subject: `Order Update - ${order.orderNumber}`,
    html: statusEmailTemplate(order, status)
  });
} catch (emailErr) {
  console.error("Status email failed:", emailErr);
}

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to update status"
    });
  }
});


app.get("/my-orders", async (req, res) => {
  try {
    const { email, phone } = req.query;

    if (!email && !phone) {
      return res.status(400).json({
        error: "Email or phone required"
      });
    }

    const query = email ? { email } : { phone };

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .select(
        "orderNumber phone email total items location mpesaCode status statusHistory createdAt"
      );

    res.json(orders);

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to fetch orders"
    });
  }
});

// ===============================
// TRACK ORDER (PUBLIC)
// ===============================
app.get("/track-order/:orderNumber", async (req, res) => {
  try {
    const order = await Order.findOne({
      orderNumber: req.params.orderNumber
    });

    if (!order) {
      return res.status(404).json({
        error: "Order not found"
      });
    }

    res.json(order);

  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to fetch order"
    });
  }
});


function generateAgentCode(count) {
  return "PF" + (100 + count);
}


app.get("/api/public/agents", async (req, res) => {
  try {
    const agents = await Agent.find().select("name code");
    res.json(agents);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch agents" });
  }
});


app.post("/api/agents", async (req, res) => {
  try {
    const key = req.headers["admin-key"];
    if (key !== process.env.ADMIN_KEY) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { name } = req.body;

    const lastAgent = await Agent.findOne().sort({ createdAt: -1 });

let nextNumber = 101;

if (lastAgent) {
  const num = parseInt(lastAgent.code.replace("PF", ""));
  nextNumber = num + 1;
}

const code = "PF" + nextNumber;


    const agent = new Agent({ name, code });
    await agent.save();

    res.json(agent);

  } catch (err) {
    res.status(500).json({ error: "Failed to create agent" });
  }
});


app.get("/api/agents", async (req, res) => {
  try {
    const key = req.headers["admin-key"];
    if (key !== process.env.ADMIN_KEY) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const agents = await Agent.find().sort({ createdAt: -1 });

    res.json(agents);

  } catch (err) {
    res.status(500).json({ error: "Failed to fetch agents" });
  }
});

app.get("/api/agents/:code/orders", async (req, res) => {
  try {
    const key = req.headers["admin-key"];
    if (key !== process.env.ADMIN_KEY) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const code = req.params.code.toUpperCase();

const orders = await Order.find({
  agentCode: code
});

    // 🔥 premium stats
    const totalSales = orders.reduce((sum, o) => sum + o.total, 0);

const COMMISSION_RATE = 0.08;
const totalCommission = totalSales * COMMISSION_RATE;

    res.json({
  totalOrders: orders.length,
  totalSales,
  totalCommission,
  orders
});

  } catch (err) {
    res.status(500).json({ error: "Failed to fetch agent orders" });
  }
});


app.get("/api/agents/leaderboard", async (req, res) => {
  try {
    const COMMISSION_RATE = 0.08;

    const data = await Order.aggregate([
      {
        $match: { agentCode: { $ne: null } }
      },
      {
        $group: {
          _id: {
            code: "$agentCode",
            name: { $ifNull: ["$agentName", "Unknown"] }
          },
          totalSales: { $sum: "$total" },
          totalOrders: { $sum: 1 }
        }
      },
      {
        $addFields: {
          totalCommission: {
            $multiply: ["$totalSales", COMMISSION_RATE]
          }
        }
      },
      {
        $sort: { totalSales: -1 }
      }
    ]);

    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed leaderboard" });
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