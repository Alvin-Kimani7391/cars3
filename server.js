import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();
import express from "express";
import path from "path";
import cors from "cors";
import fs from "fs";
import sgMail from "@sendgrid/mail";


import Agent from "./models/Agent.js";
import productRoutes from "./routes/products.js";

import { fileURLToPath } from "url";




sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const app = express();


// ===============================
// FIX FOR ES MODULE PATH
// ===============================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function sendEmail({ to, subject, html }) {
  try {
    const msg = {
      to,
      from: {
    email: process.env.EMAIL_FROM,
    name: "Six Star Suppliers"
  },
      subject,
      html
    };

    const response = await sgMail.send(msg);

    console.log("SENDGRID STATUS:", response[0].statusCode); // should be 202

  } catch (err) {
    console.error("FULL SENDGRID ERROR:");
    console.error(JSON.stringify(err.response?.body, null, 2));
  }
}




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
  <div style="background:#f6f7fb;padding:30px 10px;font-family:Arial,Helvetica,sans-serif;">

  <div style="max-width:600px;margin:auto;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 10px 30px rgba(0,0,0,0.08);">

    <!-- HEADER -->
    <div style="background:linear-gradient(135deg,#ff6600,#ffb703);padding:22px;text-align:center;color:#fff;">
      <h2 style="margin:0;font-size:20px;">Order Update</h2>
      <p style="margin:6px 0 0;font-size:13px;opacity:0.9;">
        Your order status has changed
      </p>
    </div>

    <!-- BODY -->
    <div style="padding:25px;color:#333;">

      <p style="font-size:15px;margin:0 0 10px;">
        Hi <strong>${order.name || "Customer"}</strong>,
      </p>

      <p style="margin:0 0 15px;color:#555;line-height:1.5;">
        We’ve updated the status of your order <strong>${order.orderNumber}</strong>.
      </p>

      <!-- STATUS CARD -->
      <div style="background:#f9f9f9;border:1px solid #eee;padding:15px;border-radius:12px;text-align:center;margin:18px 0;">

        <p style="margin:0;font-size:12px;color:#777;">
          CURRENT STATUS
        </p>

        <h2 style="margin:6px 0 0;color:#ff6600;font-size:20px;letter-spacing:0.5px;">
          ${newStatus}
        </h2>

      </div>

      <!-- INFO -->
      <p style="font-size:14px;color:#555;line-height:1.5;margin:0;">
        You can track your order anytime to see real-time updates and delivery progress.
      </p>

      <!-- CTA -->
      <div style="text-align:center;margin-top:22px;">
        <a href="car4-ivory.vercel.app/trackorder.html"
          style="display:inline-block;padding:13px 22px;
          background:linear-gradient(135deg,#ff6600,#ffb703);
          color:#fff;text-decoration:none;border-radius:10px;
          font-weight:600;">
          Track Order
        </a>
      </div>

      <!-- NOTE -->
      <p style="text-align:center;font-size:12px;color:#888;margin-top:18px;">
        You’ll receive another update when your order progresses.
      </p>

    </div>

    <!-- FOOTER -->
    <div style="background:#f4f4f4;padding:14px;text-align:center;font-size:12px;color:#777;">
      © ${new Date().getFullYear()} Six Star Suppliers • All rights reserved
    </div>

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


app.use(express.json());
app.use("/images", express.static(path.join(__dirname, "images2")));


import Order from "./models/Order.js";
app.use("/api/products", productRoutes);
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
    await sendEmail({
  from: {
    email: process.env.EMAIL_FROM,
    name: "Six Star Suppliers"
  },
  to: email,
  subject: `Order Confirmation - ${orderNumber}`,
  html: `
<div style="background:#f6f7fb;padding:30px 10px;font-family:Arial,Helvetica,sans-serif;">

  <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 12px 35px rgba(0,0,0,0.08);">

    <!-- HEADER -->
    <div style="background:linear-gradient(135deg,#ff6600,#ffb703);padding:25px;text-align:center;color:#fff;">
      <h1 style="margin:0;font-size:22px;letter-spacing:0.5px;">Six Star Suppliers</h1>
      <p style="margin:6px 0 0;font-size:14px;opacity:0.9;">Order Confirmation</p>
    </div>

    <!-- BODY -->
    <div style="padding:25px;color:#333;">

      <p style="font-size:16px;margin:0 0 10px;">
        Hi <strong>${name || "Customer"}</strong>,
      </p>

      <p style="margin:0 0 15px;color:#555;line-height:1.5;">
        Thank you for your order. We’ve received it and are now processing it. You’ll be updated at every stage.
      </p>

      <!-- ORDER INFO -->
      <div style="background:#f9f9f9;padding:12px 15px;border-radius:10px;margin:15px 0;">
        <p style="margin:0;font-size:14px;">
          <strong>Order Number:</strong> ${orderNumber}
        </p>
      </div>

      <!-- ITEMS -->
      <h3 style="margin:20px 0 10px;font-size:16px;">Your Items</h3>

      <table style="width:100%;border-collapse:collapse;">

        ${(items || []).map(item => {
          let image = Array.isArray(item.image) ? item.image[0] : item.image;

if (image) {
  image = image.replace(/^\/+/, "");

  if (!image.startsWith("http")) {
  image = `cars3-158h.onrender.com/images/${image}`;
}

  image += `?v=${Date.now()}`;
}

          return `
          <tr style="border-bottom:1px solid #eee;">
            <td style="padding:12px;width:80px;">
              <img src="${image}"
                style="width:70px;height:70px;object-fit:cover;border-radius:10px;border:1px solid #eee;">
            </td>

            <td style="padding:12px;vertical-align:top;">
              <div style="font-size:14px;font-weight:600;color:#222;">
                ${item.make} ${item.model}
              </div>
              <div style="font-size:13px;color:#777;margin-top:4px;">
                Quantity: ${item.qty}
              </div>
            </td>

            <td style="padding:12px;text-align:right;vertical-align:top;">
              <div style="font-size:14px;font-weight:600;color:#000;">
                KES ${(item.price * item.qty).toLocaleString()}
              </div>
            </td>
          </tr>
          `;
        }).join("")}

      </table>

      <!-- TOTAL -->
      <div style="margin-top:20px;text-align:right;">
        <p style="margin:0;font-size:13px;color:#777;">Delivery Location: ${location}</p>
        <h2 style="margin:8px 0 0;font-size:18px;color:#111;">
          Total: KES ${total.toLocaleString()}
        </h2>
      </div>

      <!-- CTA BUTTON -->
      <div style="text-align:center;margin-top:25px;">
        <a href="car4-ivory.vercel.app/trackorder.html"
          style="display:inline-block;padding:13px 22px;border-radius:10px;
          background:linear-gradient(135deg,#ff6600,#ffb703);
          color:#fff;text-decoration:none;font-weight:600;">
          Track Your Order
        </a>
      </div>

      <!-- NOTE -->
      <p style="text-align:center;font-size:12px;color:#888;margin-top:18px;">
        You will receive updates as your order status changes.
      </p>

    </div>

    <!-- FOOTER -->
    <div style="background:#f4f4f4;padding:14px;text-align:center;font-size:12px;color:#777;">
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

    const orders = await Order.find({ isArchived: { $ne: true } })
  .sort({ createdAt: -1 });

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
  await sendEmail({
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
    $match: {
      agentCode: { $ne: null },
      isArchived: { $ne: true }
    }
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

app.put("/api/orders/archive/:id", async (req, res) => {
  try {
    const key = req.headers["admin-key"];
    if (key !== process.env.ADMIN_KEY) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    order.isArchived = true;
    order.deletedAt = new Date();

    await order.save();

    res.json({ message: "Order archived" });

  } catch (err) {
    res.status(500).json({ error: "Archive failed" });
  }
});



app.get("/api/orders/archived", async (req, res) => {
  try {
    const key = req.headers["admin-key"];
    if (key !== process.env.ADMIN_KEY) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const orders = await Order.find({ isArchived: true }).sort({ deletedAt: -1 });

    res.json(orders);

  } catch (err) {
    res.status(500).json({ error: "Failed to fetch archived orders" });
  }
});



app.put("/api/orders/restore/:id", async (req, res) => {
  try {
    const key = req.headers["admin-key"];
    if (key !== process.env.ADMIN_KEY) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    order.isArchived = false;
    order.deletedAt = null;

    await order.save();

    res.json({ message: "Order restored" });

  } catch (err) {
    res.status(500).json({ error: "Restore failed" });
  }
});



app.put("/api/orders/bulk-archive", async (req, res) => {
  try {
    const key = req.headers["admin-key"];
    if (key !== process.env.ADMIN_KEY) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { ids } = req.body;

    await Order.updateMany(
      { _id: { $in: ids } },
      { $set: { isArchived: true, deletedAt: new Date() } }
    );

    res.json({ message: "Bulk archive successful" });

  } catch (err) {
    res.status(500).json({ error: "Bulk archive failed" });
  }
});



app.get("/test-email", async (req, res) => {
  try {
    await sendEmail({
      to: "your-email@gmail.com",
      subject: "Test Email",
      html: "<h1>Hello from server</h1>"
    });

    res.send("Email sent");
  } catch (err) {
    console.log(err);
    res.send("Failed");
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

// fallback image (VERY important)
if (!image) {
  image = "https://via.placeholder.com/300";
} else {
  image = String(image).trim();

  // remove leading slashes safely
  image = image.replace(/^\/+/, "");

  // only prefix if not already absolute
  if (!image.startsWith("http")) {
    image = `https://cars3-158h.onrender.com/images/${image}`;
  }

  // optional cache bust (VERY useful for WhatsApp)
  image += `?v=${Date.now()}`;
}

    const title = `${product.make} ${product.model}`;
    
    const price = product.price ? `KES ${product.price.toLocaleString()}` : "Price on request";

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
//

app.get("/health", (req, res) => {
  res.status(200).send("OK");
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