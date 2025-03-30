import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import "./KanbanPage.css";

const KanbanPage = () => {
  const { boardId } = useParams();
  const [tasks, setTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  // For sharing: a list of all users (except the current user)
  const [users, setUsers] = useState([]);
  // For sharing: an array of user IDs that already have a share for this board
  const [sharedUsers, setSharedUsers] = useState([]);
  // Board details (if needed for share controls)
  const [boardInfo, setBoardInfo] = useState(null);
  // States for task renaming
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState("");
  const navigate = useNavigate();

  // Retrieve token and always use the Bearer prefix
  const token = localStorage.getItem("token");
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  // Decode current user id from the token
  let currentUserId = null;
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      currentUserId = payload.id;
    } catch (error) {
      console.error("Error decoding token", error);
    }
  }

  // Fetch board details
  useEffect(() => {
    axios
      .get("http://localhost:5000/api/boards", authHeaders)
      .then((response) => {
        const currentBoard = response.data.find(
          (b) => Number(b.id) === Number(boardId)
        );
        setBoardInfo(currentBoard);
      })
      .catch((error) => console.error("Error fetching board info:", error));
  }, [boardId]);

  // Fetch tasks for the board
  useEffect(() => {
    axios
      .get(`http://localhost:5000/api/board/${boardId}/tasks`, authHeaders)
      .then((response) => setTasks(response.data))
      .catch((error) => console.error("Error fetching tasks:", error));
  }, [boardId]);

  // Fetch users (to share with)
  useEffect(() => {
    axios
      .get("http://localhost:5000/api/users", authHeaders)
      .then((response) => setUsers(response.data))
      .catch((error) => console.error("Error fetching users:", error));
  }, []);

  // Fetch shared user IDs for the current board
  useEffect(() => {
    axios
      .get(`http://localhost:5000/api/boards/${boardId}/shares`, authHeaders)
      .then((response) => {
        // Convert each shared_user_id to a number
        const sharedIds = Array.isArray(response.data)
          ? response.data.map((item) => Number(item))
          : [];
        setSharedUsers(sharedIds);
      })
      .catch((error) =>
        console.error("Error fetching board shares:", error)
      );
  }, [boardId]);

  // Function to share the board with a selected user
  const shareBoard = async (sharedUserId) => {
    if (sharedUsers.includes(Number(sharedUserId))) return;
    try {
      await axios.post(
        `http://localhost:5000/api/boards/${boardId}/share`,
        { sharedUserId },
        authHeaders
      );
      setSharedUsers((prev) => [...prev, Number(sharedUserId)]);
      console.log("Board shared with user id:", sharedUserId);
    } catch (error) {
      console.error("Error sharing board:", error);
    }
  };

  // Function to remove share access for a user
  const removeShare = async (sharedUserId) => {
    try {
      await axios.delete(
        `http://localhost:5000/api/boards/${boardId}/share/${sharedUserId}`,
        authHeaders
      );
      setSharedUsers((prev) =>
        prev.filter((id) => Number(id) !== Number(sharedUserId))
      );
      console.log("Share removed for user id:", sharedUserId);
    } catch (error) {
      console.error("Error removing share:", error);
    }
  };

  // Task editing functions
  const handleEditTask = (task) => {
    setEditingTaskId(task.id);
    setEditingTaskTitle(task.title);
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setEditingTaskTitle("");
  };

  const handleSaveTask = async (task) => {
    try {
      await axios.put(
        `http://localhost:5000/api/tasks/${task.id}`,
        {
          title: editingTaskTitle,
          status: task.status,
          sort_order: task.sort_order,
        },
        authHeaders
      );
      setTasks((prevTasks) =>
        prevTasks.map((t) => (t.id === task.id ? { ...t, title: editingTaskTitle } : t))
      );
      setEditingTaskId(null);
      setEditingTaskTitle("");
      console.log("Task title updated successfully");
    } catch (error) {
      console.error("Error updating task title:", error);
    }
  };

  // ------------------------ Task drag and drop logic ------------------------

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
    let updatedTasks = [...tasks];
    const draggedIndex = updatedTasks.findIndex((task) => task.id === draggedId);
    if (draggedIndex === -1) return;
    const [draggedTask] = updatedTasks.splice(draggedIndex, 1);
    if (source.droppableId === destination.droppableId) {
      const sameColumnTasks = updatedTasks.filter(
        (task) => task.status === source.droppableId
      );
      sameColumnTasks.splice(destination.index, 0, draggedTask);
      const newSameColumnTasks = sameColumnTasks.map((task, index) => ({
        ...task,
        sort_order: index,
      }));
      updatedTasks = updatedTasks.filter(
        (task) => task.status !== source.droppableId
      );
      updatedTasks = updatedTasks.concat(newSameColumnTasks);
    } else {
      draggedTask.status = destination.droppableId;
      const sourceColumnTasks = updatedTasks
        .filter((task) => task.status === source.droppableId)
        .sort((a, b) => a.sort_order - b.sort_order);
      const destColumnTasks = updatedTasks
        .filter((task) => task.status === destination.droppableId)
        .sort((a, b) => a.sort_order - b.sort_order);
      destColumnTasks.splice(destination.index, 0, draggedTask);
      const newSourceTasks = sourceColumnTasks.map((task, index) => ({
        ...task,
        sort_order: index,
      }));
      const newDestTasks = destColumnTasks.map((task, index) => ({
        ...task,
        sort_order: index,
      }));
      updatedTasks = updatedTasks.filter(
        (task) =>
          task.status !== source.droppableId &&
          task.status !== destination.droppableId
      );
      updatedTasks = updatedTasks.concat(newSourceTasks, newDestTasks);
    }
    setTasks(updatedTasks);
    updatedTasks
      .filter(
        (task) =>
          task.status === source.droppableId ||
          task.status === destination.droppableId
      )
      .forEach((task) => {
        updateTaskPosition(task.id, task.status, task.sort_order);
      });
  };

  const addTask = async () => {
    if (!newTaskTitle) return;
    const tasksInTodo = tasks.filter((task) => task.status === "To-Do");
    const newSortOrder =
      tasksInTodo.length > 0
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

  let currentUserName = "";
  if (token) {
    try {
      // Decode the token and get the user id
      const payload = JSON.parse(atob(token.split(".")[1]));
      currentUserName = payload.username;
    } catch (error) {
      console.error("Error decoding token", error);
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const columns = ["To-Do", "In Progress", "Complete"];

  return (

    <div className="kanban-container">

      {/* Account info area in the top right */}
      <div className="account-info-kanban">
        <span>Hey, {currentUserName}!</span>
        <button onClick={handleLogout}>Log Out</button>
      </div>

      <h1 className="kanban-title">Kanban Board</h1>


      {/* Add Task Panel */}
      <div className="add-task-container">
        <input
          type="text"
          placeholder="New task title"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
        />
        <button onClick={addTask}>Add Task</button>
      </div>

      {/* Drag-and-Drop Task Columns */}
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
                      <Draggable
                        key={task.id}
                        draggableId={task.id.toString()}
                        index={index}
                      >
                        {(provided) => (
                          <div
                            className="kanban-task"
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            {editingTaskId === task.id ? (
                              <>
                                <input
                                  type="text"
                                  className="edit-input"
                                  value={editingTaskTitle}
                                  onChange={(e) => setEditingTaskTitle(e.target.value)}
                                />
                                <button
                                  className={`save-button ${editingTaskId === task.id ? "save-button-edit-mode" : ""}`}
                                  onClick={() => handleSaveTask(task)}
                                >
                                  Save
                                </button>
                                <button onClick={handleCancelEdit}>Cancel</button>
                              </>
                            ) : (
                              <>
                                <span>{task.title}</span>
                                <button className="edit-task" onClick={() => handleEditTask(task)}>
                                  Edit
                                </button>
                                <button onClick={() => deleteTask(task.id)}>Delete</button>
                              </>
                            )}

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

      {/* Share Board Panel */}
      <div className="share-board-panel">
        <h2>Share Board</h2>
        {boardInfo && Number(boardInfo.user_id) !== Number(currentUserId) ? (
          <p>Only the author of this board can use the share feature</p>
        ) : (
          <ul className="share-user-list">
            {users.map((user) => (
              <li key={user.id} className="share-user-item">
                <span>{user.username}</span>
                {sharedUsers.includes(Number(user.id)) ? (
                  <div className="share-buttons">
                    <button disabled>Shared</button>
                    <button className="remove-access" onClick={() => removeShare(user.id)}>
                      Remove Access
                    </button>
                  </div>
                ) : (
                  <div className="share-buttons">
                    <button onClick={() => shareBoard(user.id)}>Share</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default KanbanPage;
