import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

function DashboardPage() {
  const [boards, setBoards] = useState([]);
  const [newBoardName, setNewBoardName] = useState("");
  const [editingBoard, setEditingBoard] = useState(null);
  const [editName, setEditName] = useState("");
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
    if (!newBoardName.trim()) return;
    try {
      const response = await axios.post(
        "http://localhost:5000/api/boards",
        { name: newBoardName },
        { headers: { Authorization: localStorage.getItem("token") } }
      );
  
      setBoards([...boards, response.data]); // Now includes { id, name }
      setNewBoardName("");
    } catch (error) {
      console.error("Error creating board", error);
    }
  };
  

  const deleteBoard = async (id) => {
    try {
      await axios.delete(`http://localhost:5000/api/boards/${id}`, {
        headers: { Authorization: localStorage.getItem("token") },
      });
      setBoards(boards.filter((board) => board.id !== id)); // Remove from UI instantly
    } catch (error) {
      console.error("Error deleting board", error);
    }
  };

  const startEditing = (board) => {
    setEditingBoard(board.id);
    setEditName(board.name);
  };

  const renameBoard = async (id) => {
    if (!editName.trim()) return;
    try {
      await axios.put(
        `http://localhost:5000/api/boards/${id}`,
        { name: editName },
        { headers: { Authorization: localStorage.getItem("token") } }
      );
      setBoards(
        boards.map((board) =>
          board.id === id ? { ...board, name: editName } : board
        )
      ); // Instantly update UI
      setEditingBoard(null);
    } catch (error) {
      console.error("Error renaming board", error);
    }
  };

  return (
    <div className="container mt-4">
      <h2 className="text-center">Dashboard</h2>
      <div className="row">
        <div className="col-12">
          <div className="input-group mb-3">
            <input
              type="text"
              className="form-control"
              placeholder="New board name"
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
            />
            <button className="btn btn-primary" onClick={createBoard}>
              Create Board
            </button>
          </div>
        </div>
      </div>

      <div className="row">
        {boards.map((board) => (
          <div key={board.id} className="col-12 mb-3">
            <div className="card">
              <div className="card-body">
                {editingBoard === board.id ? (
                  <>
                    <input
                      type="text"
                      className="form-control mb-2"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                    <button
                      className="btn btn-success w-100 mb-2"
                      onClick={() => renameBoard(board.id)}
                    >
                      Save
                    </button>
                    <button
                      className="btn btn-secondary w-100"
                      onClick={() => setEditingBoard(null)}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <h5>{board.name}</h5>
                    <button
                      className="btn btn-warning w-100 mb-2"
                      onClick={() => startEditing(board)}
                    >
                      Rename
                    </button>
                    <button
                      className="btn btn-danger w-100"
                      onClick={() => deleteBoard(board.id)}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DashboardPage;
