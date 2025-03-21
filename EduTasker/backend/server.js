require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

// Create a database pool
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// -------------------
// Authentication Middleware
// -------------------
const authenticate = (req, res, next) => {
  let token = req.headers["authorization"];
  if (!token) return res.status(403).json({ message: "No token provided" });
  if (token.startsWith("Bearer ")) {
    token = token.slice(7);
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: "Invalid token" });
    req.userId = decoded.id;
    next();
  });
};

// -------------------
// Authentication Routes
// -------------------
app.post("/api/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query("INSERT INTO users (username, password) VALUES (?, ?)", [username, hashedPassword]);
    res.status(201).json({ message: "User registered successfully" });
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

// -------------------
// Board Routes
// -------------------
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
    const [result] = await db.query("INSERT INTO boards (name, user_id) VALUES (?, ?)", [name, req.userId]);
    res.status(201).json({ id: result.insertId, name });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

app.put("/api/boards/:id", authenticate, async (req, res) => {
  const { name } = req.body;
  const { id } = req.params;
  try {
    const [result] = await db.query(
      "UPDATE boards SET name = ? WHERE id = ? AND user_id = ?",
      [name, id, req.userId]
    );
    if (result.affectedRows > 0) {
      res.status(200).json({ id, name });
    } else {
      res.status(404).json({ error: "Board not found or unauthorized" });
    }
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

app.delete("/api/boards/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const [board] = await db.query("SELECT * FROM boards WHERE id = ? AND user_id = ?", [id, req.userId]);
    if (board.length === 0) return res.status(404).json({ error: "Board not found or unauthorized" });
    await db.query("DELETE FROM boards WHERE id = ?", [id]);
    res.status(200).json({ message: "Board deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------
// Task Routes
// -------------------

// GET tasks ordered by sort_order
app.get("/api/board/:boardId/tasks", authenticate, async (req, res) => {
  try {
    const { boardId } = req.params;

    const [board] = await db.query(
      "SELECT * FROM boards WHERE id = ? AND user_id = ?",
      [boardId, req.userId]
    );
    if (board.length === 0)
      return res.status(404).json({ error: "Board not found or unauthorized" });

    const [rows] = await db.query(
      "SELECT * FROM tasks WHERE board_id = ? ORDER BY sort_order ASC",
      [boardId]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST a new task with sort_order and status (default "To-Do")
app.post("/api/board/:boardId/tasks", authenticate, async (req, res) => {
  try {
    const { boardId } = req.params;
    const { title, sort_order, status } = req.body;
    
    const [board] = await db.query(
      "SELECT * FROM boards WHERE id = ? AND user_id = ?",
      [boardId, req.userId]
    );
    if (board.length === 0)
      return res.status(404).json({ error: "Board not found or unauthorized" });
    
    const [result] = await db.query(
      "INSERT INTO tasks (title, sort_order, status, board_id) VALUES (?, ?, ?, ?)",
      [title, sort_order, status, boardId]
    );
    res.status(201).json({
      id: result.insertId,
      title,
      sort_order,
      status,
      board_id: boardId,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT endpoint to update task status and sort_order
app.put("/api/tasks/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, sort_order } = req.body;
    
    const [tasks] = await db.query("SELECT * FROM tasks WHERE id = ?", [id]);
    if (tasks.length === 0) return res.status(404).json({ message: "Task not found" });
    const task = tasks[0];
    
    const [board] = await db.query(
      "SELECT * FROM boards WHERE id = ? AND user_id = ?",
      [task.board_id, req.userId]
    );
    if (board.length === 0)
      return res.status(403).json({ message: "Unauthorized to update this task" });
    
    await db.query(
      "UPDATE tasks SET status = ?, sort_order = ? WHERE id = ?",
      [status, sort_order, id]
    );
    res.status(200).json({ message: "Task updated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// DELETE Task Route
app.delete("/api/tasks/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [tasks] = await db.query("SELECT * FROM tasks WHERE id = ?", [id]);
    if (tasks.length === 0) {
      return res.status(404).json({ message: "Task not found" });
    }
    const task = tasks[0];
    const [board] = await db.query(
      "SELECT * FROM boards WHERE id = ? AND user_id = ?",
      [task.board_id, req.userId]
    );
    if (board.length === 0) {
      return res.status(403).json({ message: "Unauthorized to delete this task" });
    }
    await db.query("DELETE FROM tasks WHERE id = ?", [id]);
    res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// -------------------
// Start the Server
// -------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
