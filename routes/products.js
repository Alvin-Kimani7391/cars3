import express from "express";
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct
} from "../controllers/productController.js";

import { upload } from "../config/upload.js";

const router = express.Router();


// ===============================
// CREATE PRODUCT (with images)
// ===============================
router.post(
  "/",
  upload.array("images", 5), // max 5 images
  createProduct
);


// ===============================
// GET ALL PRODUCTS
// ===============================
router.get("/", getProducts);


// ===============================
// GET SINGLE PRODUCT
// ===============================
router.get("/:id", getProductById);


// ===============================
// UPDATE PRODUCT (optional)
// ===============================
router.put(
  "/:id",
  upload.array("images", 5),
  updateProduct
);


// ===============================
// DELETE PRODUCT
// ===============================
router.delete("/:id", deleteProduct);


export default router;