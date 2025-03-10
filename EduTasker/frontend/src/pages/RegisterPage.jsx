import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./LoginPage.css"; // Keeping your CSS design

function RegisterPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    try {
      await axios.post("http://localhost:5000/api/register", {
        username,
        password,
      });
      navigate("/"); // Redirect to login after success
    } catch (error) {
      console.error(error);
      alert("Registration failed");
    }
  };

  return (
    <div className="wrapper">
      <form onSubmit={handleRegister}>
        <img id="logo_banner" src="/logo_white.svg" alt="Brand logo" />
        <h1>Sign up</h1>
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
        <div className="entry-box">
          <input
            type="password"
            placeholder="Confirm password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <i className="bx bxs-key"></i>
        </div>
        <button type="submit" className="btn">
          Register
        </button>
        <p id="register">
          or Sign in <a href="/">here</a>
        </p>
      </form>
    </div>
  );
}

export default RegisterPage;
