// src/routes/records.routes.js
const express = require("express");
const router = express.Router();

const controller = require("../controllers/records.controller");
const auth = require("../middleware/auth");

/*
|--------------------------------------------------------------------------
| Validate :id parameter (prevents CastError crashes)
|--------------------------------------------------------------------------
*/
router.param("id", (req, res, next, id) => {
  const isValid = /^[0-9a-fA-F]{24}$/.test(id);
  if (!isValid) {
    return res.status(400).json({ message: "Invalid record ID format." });
  }
  next();
});

/*
|--------------------------------------------------------------------------
| GET All records
|--------------------------------------------------------------------------
| Must come before "/:id" route to avoid shadowing.
*/
router.get("/", auth, controller.getAll);

/*
|--------------------------------------------------------------------------
| CREATE new record
|--------------------------------------------------------------------------
*/
router.post("/", auth, controller.create);

/*
|--------------------------------------------------------------------------
| GET a single record
|--------------------------------------------------------------------------
*/
router.get("/:id", auth, controller.getOne);

/*
|--------------------------------------------------------------------------
| UPDATE a record
|--------------------------------------------------------------------------
*/
router.put("/:id", auth, controller.update);

/*
|--------------------------------------------------------------------------
| DELETE a record
|--------------------------------------------------------------------------
*/
router.delete("/:id", auth, controller.remove);

module.exports = router;
