import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

function DashboardPage() {
  const [boards, setBoards] = useState([]);
  const [newBoard, setNewBoard] = useState("");
  const [editingBoard, setEditingBoard] = useState(null);
  const [updatedBoardName, setUpdatedBoardName] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchBoards();
  }, []);

  const fetchBoards = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/boards", {
        headers: { Authorization: localStorage.getItem("token") },
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
        { headers: { Authorization: localStorage.getItem("token") } }
      );
      setNewBoard("");
      fetchBoards();
    } catch (error) {
      console.error("Error creating board", error);
    }
  };

  const startEditing = (board) => {
    setEditingBoard(board.id);
    setUpdatedBoardName(board.name);
  };

  const updateBoard = async (boardId) => {
    if (!updatedBoardName.trim()) return;
    try {
      await axios.put(
        `http://localhost:5000/api/boards/${boardId}`,
        { name: updatedBoardName },
        { headers: { Authorization: localStorage.getItem("token") } }
      );
      setEditingBoard(null);
      fetchBoards();
    } catch (error) {
      console.error("Error updating board", error);
    }
  };

  const deleteBoard = async (boardId) => {
    try {
      await axios.delete(`http://localhost:5000/api/boards/${boardId}`, {
        headers: { Authorization: localStorage.getItem("token") },
      });
      fetchBoards();
    } catch (error) {
      console.error("Error deleting board", error);
    }
  };

  return (
    <div className="container mt-4">
      <h2>Dashboard</h2>

      <div className="input-group mb-3">
        <input
          type="text"
          className="form-control"
          placeholder="New board name"
          value={newBoard}
          onChange={(e) => setNewBoard(e.target.value)}
        />
        <button className="btn btn-primary" onClick={createBoard}>
          Create Board
        </button>
      </div>

      <div className="list-group">
        {boards.map((board) => (
          <div key={board.id} className="list-group-item d-flex justify-content-between align-items-center">
            <Link to={`/board/${board.id}`} className="text-decoration-none">
              <h5 className="mb-0">{board.name}</h5>
            </Link>
            <div>
              {editingBoard === board.id ? (
                <>
                  <input
                    type="text"
                    value={updatedBoardName}
                    onChange={(e) => setUpdatedBoardName(e.target.value)}
                  />
                  <button className="btn btn-success ms-2" onClick={() => updateBoard(board.id)}>
                    Save
                  </button>
                  <button className="btn btn-secondary ms-2" onClick={() => setEditingBoard(null)}>
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button className="btn btn-warning ms-2" onClick={() => startEditing(board)}>
                    Rename
                  </button>
                  <button className="btn btn-danger ms-2" onClick={() => deleteBoard(board.id)}>
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DashboardPage;
