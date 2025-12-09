// src/routes/receipts.routes.js
const express = require("express");
const router = express.Router();

const controller = require("../controllers/receipts.controller");
const auth = require("../middleware/auth");
const upload = require("../lib/multer");

/*
|--------------------------------------------------------------------------
| Receipt Upload (GridFS → OCR → AI Parsing)
|--------------------------------------------------------------------------
| Upload a single file under form field name "file"
| This matches: formData.append("file", file)
*/
router.post("/upload", auth, upload.single("file"), controller.upload);

/*
|--------------------------------------------------------------------------
| GET All Receipts for Authenticated User
|--------------------------------------------------------------------------
*/
router.get("/", auth, controller.getAll);

/*
|--------------------------------------------------------------------------
| IMPORTANT: Download Route BEFORE :id Route
|--------------------------------------------------------------------------
| Otherwise "/:id" would catch "/:id/download" and treat "download" as the ID.
*/
router.get("/:id/download", auth, controller.download);

/*
|--------------------------------------------------------------------------
| GET Single Receipt by ID
|--------------------------------------------------------------------------
*/
router.get("/:id", auth, controller.getOne);

/*
|--------------------------------------------------------------------------
| DELETE Receipt + GridFS File
|--------------------------------------------------------------------------
*/
router.delete("/:id", auth, controller.remove);

module.exports = router;
