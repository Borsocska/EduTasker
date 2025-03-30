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
  if (!token)
    return res.status(403).json({ message: "No token provided" });
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
    await db.query(
      "INSERT INTO users (username, password) VALUES (?, ?)",
      [username, hashedPassword]
    );
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const [rows] = await db.query("SELECT * FROM users WHERE username = ?", [
      username,
    ]);
    if (rows.length === 0)
      return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, rows[0].password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: rows[0].id, username: rows[0].username }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------
// Board Routes
// -------------------

// GET boards: returns boards that are either owned by the current user or shared with them.
// Also returns the board owner’s username as owner_username.
app.get("/api/boards", authenticate, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT b.*, u.username AS owner_username 
       FROM boards b 
       JOIN users u ON b.user_id = u.id 
       WHERE b.user_id = ? 
          OR b.id IN (SELECT board_id FROM board_shares WHERE shared_user_id = ?)`,
      [req.userId, req.userId]
    );
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
    const [board] = await db.query(
      "SELECT * FROM boards WHERE id = ? AND user_id = ?",
      [id, req.userId]
    );
    if (board.length === 0)
      return res.status(404).json({ error: "Board not found or unauthorized" });
    await db.query("DELETE FROM boards WHERE id = ?", [id]);
    res.status(200).json({ message: "Board deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// -------------------
// Board Sharing Endpoints
// -------------------

// GET /api/users: returns all users except the current user.
app.get("/api/users", authenticate, async (req, res) => {
  try {
    const [users] = await db.query(
      "SELECT id, username FROM users WHERE id != ?",
      [req.userId]
    );
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET shared user IDs for a board
app.get("/api/boards/:id/shares", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      "SELECT shared_user_id FROM board_shares WHERE board_id = ?",
      [id]
    );
    // Ensure we return an array of numbers regardless of row format.
    let sharedIds = [];
    if (rows.length > 0) {
      if (typeof rows[0] === "object" && rows[0].shared_user_id !== undefined) {
        sharedIds = rows.map((r) => Number(r.shared_user_id));
      } else {
        sharedIds = rows.map(Number);
      }
    }
    res.json(sharedIds);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/boards/:id/share: share the board with another user.
// Only the board owner (the current user) may share the board.
app.post("/api/boards/:id/share", authenticate, async (req, res) => {
  try {
    const { id } = req.params; // board id
    const { sharedUserId } = req.body; // id of the user to share with

    // Verify that the board exists and is owned by the current user
    const [boards] = await db.query(
      "SELECT * FROM boards WHERE id = ? AND user_id = ?",
      [id, req.userId]
    );
    if (boards.length === 0) {
      return res.status(404).json({ error: "Board not found or unauthorized" });
    }

    // Check if the board has already been shared with this user
    const [existing] = await db.query(
      "SELECT * FROM board_shares WHERE board_id = ? AND shared_user_id = ?",
      [id, sharedUserId]
    );
    if (existing.length > 0) {
      return res.status(200).json({ message: "Board already shared with this user" });
    }

    // Insert the sharing relationship into board_shares
    await db.query(
      "INSERT INTO board_shares (board_id, shared_user_id) VALUES (?, ?)",
      [id, sharedUserId]
    );

    res.status(200).json({ message: "Board shared successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/boards/:id/share/:sharedUserId: remove the share for a given user.
// Only the board owner (the current user) may remove the share.
app.delete("/api/boards/:id/share/:sharedUserId", authenticate, async (req, res) => {
  try {
    const boardIdNum = Number(req.params.id);
    const shareUserNum = Number(req.params.sharedUserId);
    
    // Verify that the board exists and is owned by the current user
    const [boards] = await db.query(
      "SELECT * FROM boards WHERE id = ? AND user_id = ?",
      [boardIdNum, req.userId]
    );
    if (boards.length === 0) {
      return res.status(404).json({ error: "Board not found or unauthorized" });
    }
    
    // Delete the share relationship
    const [result] = await db.query(
      "DELETE FROM board_shares WHERE board_id = ? AND shared_user_id = ?",
      [boardIdNum, shareUserNum]
    );
    if (result.affectedRows > 0) {
      res.status(200).json({ message: "Share removed successfully" });
    } else {
      res.status(404).json({ message: "Share not found" });
    }
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
    // Allow access if the board is owned OR shared with the user.
    const [board] = await db.query(
      `SELECT * FROM boards 
       WHERE id = ? AND (user_id = ? OR id IN (SELECT board_id FROM board_shares WHERE shared_user_id = ?))`,
      [boardId, req.userId, req.userId]
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
    
    // Allow access if the board is owned OR shared with the current user.
    const [board] = await db.query(
      `SELECT * FROM boards
       WHERE id = ? AND (user_id = ? OR id IN 
             (SELECT board_id FROM board_shares WHERE shared_user_id = ?))`,
      [boardId, req.userId, req.userId]
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
    const { title, status, sort_order } = req.body;
    const [tasks] = await db.query("SELECT * FROM tasks WHERE id = ?", [id]);
    if (tasks.length === 0)
      return res.status(404).json({ message: "Task not found" });
    const task = tasks[0];
    const [board] = await db.query(
      `SELECT * FROM boards
       WHERE id = ? AND (user_id = ? OR id IN (SELECT board_id FROM board_shares WHERE shared_user_id = ?))`,
      [task.board_id, req.userId, req.userId]
    );
    if (board.length === 0)
      return res.status(403).json({ message: "Unauthorized to update this task" });
    await db.query(
      "UPDATE tasks SET title = COALESCE(?, title), status = ?, sort_order = ? WHERE id = ?",
      [title, status, sort_order, id]
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
    if (tasks.length === 0)
      return res.status(404).json({ message: "Task not found" });
    const task = tasks[0];
    
    // Allow deletion if the board is owned OR shared with the current user.
    const [board] = await db.query(
      `SELECT * FROM boards
       WHERE id = ? AND (user_id = ? OR id IN
             (SELECT board_id FROM board_shares WHERE shared_user_id = ?))`,
      [task.board_id, req.userId, req.userId]
    );
    if (board.length === 0)
      return res.status(403).json({ message: "Unauthorized to delete this task" });
      
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
