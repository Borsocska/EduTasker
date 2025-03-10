import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./LoginPage.css"; // Keeping your CSS design

function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post("http://localhost:5000/api/login", {
        username,
        password,
      });
      localStorage.setItem("token", response.data.token); // Store JWT token
      navigate("/dashboard"); // Redirect after login
    } catch (error) {
      console.error(error);
      alert("Login failed");
    }
  };

  return (
    <div className="wrapper">
      <form onSubmit={handleLogin}>
        <img id="logo_banner" src="/logo_white.svg" alt="Brand logo" />
        <h1>Sign in</h1>
        <div className="entry-box">
          <input
            type="text"
            placeholder="Username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <i className="bx bx-user"></i>
        </div>
        <div className="entry-box">
          <input
            type="password"
            placeholder="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <i className="bx bxs-key"></i>
        </div>
        <button type="submit" className="btn">
          Login
        </button>
        <p id="register">
          or Sign up <a href="/register">here</a>
        </p>
      </form>
    </div>
  );
}

export default LoginPage;
