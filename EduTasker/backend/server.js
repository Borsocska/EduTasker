require("dotenv").config(); // Load .env variables
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());

// Database connection using a pool
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Authentication Routes (Login and Register)
app.post("/api/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query("INSERT INTO users (username, password) VALUES (?, ?)", [username, hashedPassword]);
    res.status(200).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const [rows] = await db.query("SELECT * FROM users WHERE username = ?", [username]);
    if (rows.length === 0) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, rows[0].password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: rows[0].id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Protecting Routes: Middleware
const authenticate = (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) return res.status(403).json({ message: "No token provided" });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: "Invalid token" });
    req.userId = decoded.id;
    next();
  });
};

// Board Routes
app.get("/api/boards", authenticate, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM boards WHERE user_id = ?", [req.userId]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/boards", authenticate, async (req, res) => {
  const { name } = req.body;
  try {
    const [result] = await db.query(
      "INSERT INTO boards (name, user_id) VALUES (?, ?)",
      [name, req.userId]
    );

    if (result.insertId) {
      res.status(200).json({ id: result.insertId, name });
    } else {
      res.status(500).json({ error: "Failed to create board" });
    }
  } catch (err) {
    console.error("Error creating board:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// Rename board
app.put("/api/boards/:id", authenticate, async (req, res) => {
  const { name } = req.body;
  const { id } = req.params;

  try {
    const [result] = await db.query(
      "UPDATE boards SET name = ? WHERE id = ? AND user_id = ?",
      [name, id, req.userId]
    );

    if (result.affectedRows > 0) {
      res.status(200).json({ id, name }); // Return updated board
    } else {
      res.status(404).json({ error: "Board not found or unauthorized" });
    }
  } catch (err) {
    console.error("Error renaming board:", err);
    res.status(500).json({ error: "Database error" });
  }
});


// Delete board
app.delete("/api/boards/:id", async (req, res) => {
  try {
    const { id } = req.params;
    console.log("Delete request received for ID:", id);
    const [result] = await db.query("DELETE FROM boards WHERE id = ?", [id]);

    if (result.affectedRows > 0) {
      res.status(200).json({ message: "Board deleted successfully" });
    } else {
      console.log("Board not found in database:", id);
      res.status(404).json({ error: "Board not found" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Task Routes
app.get("/api/board/:boardId/tasks", authenticate, async (req, res) => {
  try {
    const { boardId } = req.params;
    const [rows] = await db.query(
      "SELECT * FROM tasks WHERE board_id = ? AND EXISTS (SELECT 1 FROM boards WHERE id = ? AND user_id = ?)",
      [boardId, boardId, req.userId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


app.post("/api/board/:boardId/tasks", authenticate, async (req, res) => {
  try {
    const { boardId } = req.params;
    const { title, description, status } = req.body;
    await db.query("INSERT INTO tasks (title, description, status, board_id) VALUES (?, ?, ?, ?)", [title, description, status, boardId]);
    res.status(200).json({ message: "Task created successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
