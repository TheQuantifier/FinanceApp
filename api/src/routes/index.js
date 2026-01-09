// src/routes/index.js
import express from "express";

import authRoutes from "./auth.routes.js";
import recordsRoutes from "./records.routes.js";
import receiptsRoutes from "./receipts.routes.js";

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/records", recordsRoutes);
router.use("/receipts", receiptsRoutes);

export default router;
