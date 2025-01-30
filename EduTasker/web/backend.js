const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect('mongodb://localhost:27017/kanban', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const TaskSchema = new mongoose.Schema({
    text: String,
    status: String
});
const Task = mongoose.model('Task', TaskSchema);

app.get('/api/tasks', async (req, res) => {
    const tasks = await Task.find();
    res.json(tasks);
});

app.post('/api/tasks', async (req, res) => {
    const { text, status } = req.body;
    const newTask = new Task({ text, status });
    await newTask.save();
    res.json(newTask);
});

app.put('/api/tasks/:id', async (req, res) => {
    const { text, status } = req.body;
    const updatedTask = await Task.findByIdAndUpdate(req.params.id, { text, status }, { new: true });
    res.json(updatedTask);
});

app.delete('/api/tasks/:id', async (req, res) => {
    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'Task deleted' });
});

app.listen(5000, () => console.log('Server running on port 5000'));
