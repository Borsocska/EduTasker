const socket = io("http://localhost:3000");

// Fetch and display tasks on page load
document.addEventListener("DOMContentLoaded", fetchTasks);

async function fetchTasks() {
    try {
        const response = await fetch("http://localhost:3000/tasks");
        const tasks = await response.json();
        renderTasks(tasks);
    } catch (error) {
        console.error("Error fetching tasks:", error);
    }
}

// Render tasks inside the correct columns
function renderTasks(tasks) {
    document.querySelectorAll(".task-list").forEach(list => list.innerHTML = ""); // Clear existing tasks

    tasks.forEach(task => {
        const taskElement = document.createElement("div");
        taskElement.className = "task p-2 border rounded bg-light text-dark mb-2";
        taskElement.innerHTML = `
            <span>${task.text}</span>
            <button class="btn btn-sm btn-warning ms-2" onclick="editTask('${task._id}')">✏️</button>
            <button class="btn btn-sm btn-danger ms-2" onclick="deleteTask('${task._id}')">🗑️</button>
        `;
        document.querySelector(`[data-status="${task.status}"]`).appendChild(taskElement);
    });
}

// Add a new task
async function addTask() {
    const taskText = prompt("Enter task description:");
    if (!taskText) return;

    try {
        const response = await fetch("http://localhost:3000/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: taskText, status: "todo" })
        });

        if (response.ok) {
            const newTask = await response.json();
            renderTasks([...document.querySelectorAll(".task-list .task")].map(t => ({ text: t.innerText, _id: t.dataset.id })), newTask);
        }
    } catch (error) {
        console.error("Error adding task:", error);
    }
}

// Edit (move) a task
async function editTask(taskId) {
    const newStatus = prompt("Enter new status (todo, in-progress, completed):");
    if (!["todo", "in-progress", "completed"].includes(newStatus)) return alert("Invalid status!");

    try {
        const response = await fetch(`http://localhost:3000/tasks/${taskId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: newStatus })
        });

        if (response.ok) {
            fetchTasks(); // Refresh tasks
        }
    } catch (error) {
        console.error("Error updating task:", error);
    }
}

// Delete a task
async function deleteTask(taskId) {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
        const response = await fetch(`http://localhost:3000/tasks/${taskId}`, { method: "DELETE" });

        if (response.ok) {
            fetchTasks();
        }
    } catch (error) {
        console.error("Error deleting task:", error);
    }
}

// Real-time updates using Socket.io
socket.on("taskAdded", fetchTasks);
socket.on("taskUpdated", fetchTasks);
socket.on("taskDeleted", fetchTasks);
