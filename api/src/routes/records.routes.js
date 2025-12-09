// src/routes/records.routes.js
const express = require("express");
const router = express.Router();

const controller = require("../controllers/records.controller");
const auth = require("../middleware/auth");

/*
|--------------------------------------------------------------------------
| Get ALL records for logged-in user
|--------------------------------------------------------------------------
| Must be before "/:id" to avoid route shadowing.
*/
router.get("/", auth, controller.getAll);

/*
|--------------------------------------------------------------------------
| Create a new record
|--------------------------------------------------------------------------
*/
router.post("/", auth, controller.create);

/*
|--------------------------------------------------------------------------
| Get a single record by ID
|--------------------------------------------------------------------------
*/
router.get("/:id", auth, controller.getOne);

/*
|--------------------------------------------------------------------------
| Update an existing record
|--------------------------------------------------------------------------
*/
router.put("/:id", auth, controller.update);

/*
|--------------------------------------------------------------------------
| Delete a record
|--------------------------------------------------------------------------
*/
router.delete("/:id", auth, controller.remove);

module.exports = router;
