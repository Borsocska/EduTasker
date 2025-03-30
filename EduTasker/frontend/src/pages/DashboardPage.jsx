import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import "./KanbanPage.css"; // Using the same CSS file for consistency

function DashboardPage() {
  const [boards, setBoards] = useState([]);
  const [newBoard, setNewBoard] = useState("");
  const [editingBoard, setEditingBoard] = useState(null);
  const [updatedBoardName, setUpdatedBoardName] = useState("");
  const navigate = useNavigate();

  // Decode current user id and username from the stored JWT token
  const token = localStorage.getItem("token");
  let currentUserId = "";
  let currentUserName = "";
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      currentUserId = payload.id;
      currentUserName = payload.username;
    } catch (error) {
      console.error("Error decoding token", error);
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  useEffect(() => {
    fetchBoards();
  }, []);

  const fetchBoards = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/boards", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBoards(response.data);
    } catch (error) {
      console.error("Error fetching boards", error);
    }
  };

  const createBoard = async () => {
    if (!newBoard.trim()) return;
    try {
      await axios.post(
        "http://localhost:5000/api/boards",
        { name: newBoard },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewBoard("");
      fetchBoards();
    } catch (error) {
      console.error("Error creating board", error);
    }
  };

  const startEditing = (board, e) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingBoard(board.id);
    setUpdatedBoardName(board.name);
  };

  const updateBoard = async (boardId, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!updatedBoardName.trim()) return;
    try {
      await axios.put(
        `http://localhost:5000/api/boards/${boardId}`,
        { name: updatedBoardName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setEditingBoard(null);
      fetchBoards();
    } catch (error) {
      console.error("Error updating board", error);
    }
  };

  const deleteBoard = async (boardId, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await axios.delete(`http://localhost:5000/api/boards/${boardId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchBoards();
    } catch (error) {
      console.error("Error deleting board", error);
    }
  };

  return (
    <div className="kanban-container dashboard-container">
      {/* Account info area in the top right */}
      <div className="account-info">
        <span>Hey, {currentUserName}!</span>
        <button onClick={handleLogout}>Log Out</button>
      </div>

      <h1 className="kanban-title">Dashboard</h1>

      <div className="add-task-container">
        <input
          type="text"
          placeholder="New board name"
          value={newBoard}
          onChange={(e) => setNewBoard(e.target.value)}
        />
        <button onClick={createBoard}>Create Board</button>
      </div>

      <div className="kanban-columns">
        {boards.map((board) => (
          <Link
            key={board.id}
            to={`/board/${board.id}`}
            style={{ textDecoration: "none" }}
          >
            <div className="kanban-task">
              <h5>{board.name}</h5>
              <div>
                {board.user_id === currentUserId ? (
                  editingBoard === board.id ? (
                    <>
                      <input
                        type="text"
                        value={updatedBoardName}
                        onChange={(e) => setUpdatedBoardName(e.target.value)}
                        className="edit-input"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                      />
                      <button
                        className="edit-task"
                        onClick={(e) => updateBoard(board.id, e)}
                      >
                        Save
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditingBoard(null);
                        }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="edit-task"
                        onClick={(e) => startEditing(board, e)}
                      >
                        Rename
                      </button>
                      <button
                        className="remove-access"
                        onClick={(e) => deleteBoard(board.id, e)}
                      >
                        Delete
                      </button>
                    </>
                  )
                ) : (
                  <small>Shared by {board.owner_username}</small>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default DashboardPage;
