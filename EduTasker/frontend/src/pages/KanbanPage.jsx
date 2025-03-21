import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import "./KanbanPage.css";

const KanbanPage = () => {
  const { boardId } = useParams();
  const [tasks, setTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const token = localStorage.getItem("token");
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  // Fetch tasks for the selected board
  useEffect(() => {
    axios
      .get(`http://localhost:5000/api/board/${boardId}/tasks`, authHeaders)
      .then((response) => setTasks(response.data))
      .catch((error) => console.error("Error fetching tasks:", error));
  }, [boardId]);

  // Update task position with new status and sort_order in the backend
  const updateTaskPosition = async (taskId, newStatus, newSortOrder) => {
    try {
      await axios.put(
        `http://localhost:5000/api/tasks/${taskId}`,
        { status: newStatus, sort_order: newSortOrder },
        authHeaders
      );
      console.log("Task updated in DB");
    } catch (err) {
      console.error("Error updating task:", err);
    }
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
  
    const { source, destination, draggableId } = result;
    const draggedId = parseInt(draggableId);
    
    // Make a shallow copy of tasks for local manipulation
    let updatedTasks = [...tasks];
    
    // Find and remove the dragged task from the array
    const draggedIndex = updatedTasks.findIndex((task) => task.id === draggedId);
    if (draggedIndex === -1) return;
    const [draggedTask] = updatedTasks.splice(draggedIndex, 1);
  
    // If moving within the same column...
    if (source.droppableId === destination.droppableId) {
      // Filter tasks from the same column (after removal)
      const sameColumnTasks = updatedTasks.filter(
        (task) => task.status === source.droppableId
      );
  
      // Insert the dragged task at its new index in the column
      sameColumnTasks.splice(destination.index, 0, draggedTask);
  
      // Reassign sort_order for tasks in this column
      const newSameColumnTasks = sameColumnTasks.map((task, index) => ({
        ...task,
        sort_order: index,
      }));
  
      // Replace tasks in updatedTasks belonging to that column
      updatedTasks = updatedTasks
        .filter((task) => task.status !== source.droppableId)
        .concat(newSameColumnTasks);
    } else {
      // Moving to a different column: update the dragged task’s status.
      draggedTask.status = destination.droppableId;
  
      // Get tasks for the source and destination columns
      const sourceColumnTasks = updatedTasks
        .filter((task) => task.status === source.droppableId)
        .sort((a, b) => a.sort_order - b.sort_order);
      const destColumnTasks = updatedTasks
        .filter((task) => task.status === destination.droppableId)
        .sort((a, b) => a.sort_order - b.sort_order);
  
      // Insert the dragged task into the destination column array
      destColumnTasks.splice(destination.index, 0, draggedTask);
  
      // Update sort_order for both columns
      const newSourceTasks = sourceColumnTasks.map((task, index) => ({
        ...task,
        sort_order: index,
      }));
      const newDestTasks = destColumnTasks.map((task, index) => ({
        ...task,
        sort_order: index,
      }));
  
      // Remove all tasks from these two columns from updatedTasks, then add the updated ones back
      updatedTasks = updatedTasks.filter(
        (task) =>
          task.status !== source.droppableId &&
          task.status !== destination.droppableId
      );
      updatedTasks = updatedTasks.concat(newSourceTasks, newDestTasks);
    }
    
    // Immediately update the local state so the UI reflects the change.
    setTasks(updatedTasks);
  
    // Optionally update the backend for all tasks in the affected columns
    updatedTasks
      .filter(
        (task) =>
          task.status === source.droppableId || task.status === destination.droppableId
      )
      .forEach((task) => {
        updateTaskPosition(task.id, task.status, task.sort_order);
      });
  };
  

  const addTask = async () => {
    if (!newTaskTitle) return;
    
    // Calculate new sort_order in "To-Do" column
    const tasksInTodo = tasks.filter((task) => task.status === "To-Do");
    const newSortOrder = tasksInTodo.length 
      ? Math.max(...tasksInTodo.map((task) => task.sort_order)) + 1 
      : 0;

    try {
      const response = await axios.post(
        `http://localhost:5000/api/board/${boardId}/tasks`,
        { title: newTaskTitle, sort_order: newSortOrder, status: "To-Do" },
        authHeaders
      );
      setTasks([...tasks, response.data]);
      setNewTaskTitle("");
    } catch (err) {
      console.error("Error adding task:", err);
    }
  };

  const deleteTask = async (taskId) => {
    try {
      await axios.delete(`http://localhost:5000/api/tasks/${taskId}`, authHeaders);
      setTasks(tasks.filter((task) => task.id !== taskId));
    } catch (err) {
      console.error("Error deleting task:", err);
    }
  };

  const columns = ["To-Do", "In Progress", "Complete"];

  return (
    <div className="kanban-container">
      <h1 className="kanban-title">Kanban Board</h1>
      <div className="add-task-container">
        <input
          type="text"
          placeholder="New task title"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
        />
        <button onClick={addTask}>Add Task</button>
      </div>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="kanban-columns">
          {columns.map((col) => (
            <Droppable droppableId={col} key={col}>
              {(provided) => (
                <div
                  className="kanban-column"
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                >
                  <h2>{col}</h2>
                  {tasks
                    .filter((task) => task.status === col)
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                        {(provided) => (
                          <div
                            className="kanban-task"
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            {task.title}
                            <button onClick={() => deleteTask(task.id)}>Delete</button>
                          </div>
                        )}
                      </Draggable>
                    ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
};

export default KanbanPage;
