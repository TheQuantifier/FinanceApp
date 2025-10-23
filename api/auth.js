// api/auth.js
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { getModels } = require("./mongo");
const cookieParser = require("cookie-parser");

const router = express.Router();
router.use(cookieParser());

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

// =================== REGISTER ===================
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "Missing fields" });

    const { user } = getModels(); 
    const existing = await user.findOne({ email });
    if (existing) return res.status(400).json({ error: "Email already registered" });

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await user.create({ name, email, passwordHash });

    res.status(201).json({
      message: "User registered",
      user: { id: newUser._id, name, email },
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// =================== LOGIN ===================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const { user } = getModels();

    const existing = await user.findOne({ email });
    if (!existing) return res.status(400).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(password, existing.passwordHash);
    if (!valid) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: existing._id, email }, JWT_SECRET, { expiresIn: "2h" });

    res.cookie("token", token, { httpOnly: true, secure: false });
    res.json({
      message: "Login successful",
      user: { id: existing._id, name: existing.name, email },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// =================== VERIFY SESSION ===================
router.get("/me", async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "Not logged in" });

    const decoded = jwt.verify(token, JWT_SECRET);
    const { user } = getModels();
    const currentUser = await user.findById(decoded.id).select("-passwordHash");
    if (!currentUser) return res.status(404).json({ error: "User not found" });

    res.json(currentUser);
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
});

// =================== LOGOUT ===================
router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out" });
});

module.exports = router;
