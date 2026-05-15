import Product from "../models/Product.js";

// ===============================
// CREATE PRODUCT
// ===============================
export const createProduct = async (req, res) => {
  try {
    console.log("📦 BODY:", req.body);
    console.log("🖼️ FILES:", req.files);

    const {
      make,
      model,
      category,
      general,
      description,
      year,
      color,
      price,
      oldPrice
    } = req.body;

    if (!make || !category || !description || !price) {
      return res.status(400).json({
        error: "make, category, description, and price are required"
      });
    }

    const images = req.files?.map(file => file.path) || [];

    if (images.length === 0) {
      return res.status(400).json({
        error: "At least one image is required"
      });
    }

    const product = new Product({
      make,
      model,
      category,
      general,
      description,
      year,
      color,
      price: Number(price),
      oldPrice: oldPrice ? Number(oldPrice) : null,
      image: images
    });

    await product.save();

    res.status(201).json({
      message: "Product created successfully",
      product
    });

  } catch (err) {
    // 🔥 THIS will show the exact crash reason
    console.error("CREATE_PRODUCT_ERROR name:", err.name);
    console.error("CREATE_PRODUCT_ERROR message:", err.message);
    console.error("CREATE_PRODUCT_ERROR stack:", err.stack);
    res.status(500).json({ error: err.message }); // ← send real error to frontend
  }
};

// ===============================
// GET ALL PRODUCTS
// ===============================
export const getProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });

    res.json(products);

  } catch (err) {
    console.error("GET_PRODUCTS_ERROR:", err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
};


// ===============================
// GET SINGLE PRODUCT
// ===============================
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(product);

  } catch (err) {
    console.error("GET_PRODUCT_BY_ID_ERROR:", err);
    res.status(500).json({ error: "Failed to fetch product" });
  }
};


// ===============================
// UPDATE PRODUCT
// ===============================
export const updateProduct = async (req, res) => {
  try {
    const allowedFields = [
      "make",
      "model",
      "category",
      "general",
      "description",
      "year",
      "color",
      "price",
      "oldPrice"
    ];

    const updates = {};

    // whitelist fields (security fix)
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // update images if uploaded
    if (req.files?.length) {
      updates.image = req.files.map(file => file.path);
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({
      message: "Product updated successfully",
      product
    });

  } catch (err) {
    console.error("UPDATE_PRODUCT_ERROR:", err);
    res.status(500).json({ error: "Failed to update product" });
  }
};


// ===============================
// DELETE PRODUCT
// ===============================
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // ⚠️ later: delete images from storage (Cloudinary/local cleanup)

    await product.deleteOne();

    res.json({ message: "Product deleted successfully" });

  } catch (err) {
    console.error("DELETE_PRODUCT_ERROR:", err);
    res.status(500).json({ error: "Failed to delete product" });
  }
};