import React from "react";
import "../Design/Login.css";
import Logo from "../assets/Logo.avif";
import { useState } from "react";
import { useNavigate } from "react-router";
import api from "../API/api.js";
import { useAuth } from "../../Context/Context";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await api.post("/api/login", { username, password });
      const res = await api.get("/api/me");
      setUser(res.data);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div id="loginPageDiv">
      <div id="formWrapper">
        <img id="MAETSLOGO" src={Logo} alt="MAETS LOGO" />
        <form onSubmit={handleLogin} id="loginForm">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit">Login</button>
          {error && <p>{error}</p>}
        </form>
      </div>
    </div>
  );
}

export default Login;