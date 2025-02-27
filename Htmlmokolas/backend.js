require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("MongoDB Connected"))
    .catch(err => console.log(err));

// Event Schema
const EventSchema = new mongoose.Schema({ title: String, start: String });
const Event = mongoose.model("Event", EventSchema);

// Get Events
app.get('/events', async (req, res) => {
    const events = await Event.find();
    res.json(events);
});

// Add Event
app.post('/events', async (req, res) => {
    const newEvent = new Event(req.body);
    await newEvent.save();
    io.emit('event-added', newEvent); // Send update to all clients
    res.json(newEvent);
});

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Handle new messages for the inbox
    socket.on("new-message", (message) => {
        io.emit("message-broadcast", message);
    });

    // Handle new calendar events
    socket.on("new-event", (event) => {
        io.emit("event-added", event);
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

// Start Server
server.listen(3000, () => console.log("Server running on port 3000"));
