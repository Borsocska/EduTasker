require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const { Server } = require("socket.io");
const http = require("http");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/edutasker", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Task Schema
const TaskSchema = new mongoose.Schema({
    text: { type: String, required: true },
    status: { type: String, enum: ["todo", "in-progress", "completed"], default: "todo" },
});
const Task = mongoose.model("Task", TaskSchema);

// Get all tasks
app.get("/tasks", async (req, res) => {
    try {
        const tasks = await Task.find();
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: "Error fetching tasks" });
    }
});

// Add new task
app.post("/tasks", async (req, res) => {
    try {
        const { text, status } = req.body;
        if (!text) return res.status(400).json({ error: "Task text is required" });

        const newTask = new Task({ text, status: status || "todo" });
        await newTask.save();

        io.emit("taskAdded", newTask); // Real-time update to all clients
        res.json(newTask);
    } catch (error) {
        res.status(500).json({ error: "Error adding task" });
    }
});

// Update task status (move between columns)
app.patch("/tasks/:id", async (req, res) => {
    try {
        const { status } = req.body;
        if (!["todo", "in-progress", "completed"].includes(status)) {
            return res.status(400).json({ error: "Invalid status" });
        }

        const updatedTask = await Task.findByIdAndUpdate(req.params.id, { status }, { new: true });
        if (!updatedTask) return res.status(404).json({ error: "Task not found" });

        io.emit("taskUpdated", updatedTask); // Real-time update
        res.json(updatedTask);
    } catch (error) {
        res.status(500).json({ error: "Error updating task" });
    }
});

// Delete a task
app.delete("/tasks/:id", async (req, res) => {
    try {
        const deletedTask = await Task.findByIdAndDelete(req.params.id);
        if (!deletedTask) return res.status(404).json({ error: "Task not found" });

        io.emit("taskDeleted", deletedTask._id); // Notify clients
        res.json({ message: "Task deleted", id: deletedTask._id });
    } catch (error) {
        res.status(500).json({ error: "Error deleting task" });
    }
});

// Socket.io connection
io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

// Start Server
server.listen(3000, () => console.log("Server running on port 3000"));
