import React, { useEffect, useState } from "react";
import "../Design/Login.css";
import Logo from "../assets/Logo.avif";
import { useNavigate } from "react-router";
import api from "../API/api.js";
import { useAuth } from "../../Context/Context";

function Login() {
  const [checkingSession, setCheckingSession] = useState(true);
  const navigate = useNavigate();
  const { setUser } = useAuth();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await api.get("/api/me");
        setUser(res.data);
        navigate("/");
      } catch {
        setCheckingSession(false);
      }
    };

    checkSession();
  }, [navigate, setUser]);

  const handleADFSLogin = () => {
    window.location.href = "http://localhost:3001/auth/login";
  };

  if (checkingSession) {
    return (
      <div id="loginPageDiv">
        <div id="formWrapper">
          <img id="MAETSLOGO" src={Logo} alt="MAETS LOGO" />
          <p>Checking sign-in status...</p>
        </div>
      </div>
    );
  }

  return (
    <div id="loginPageDiv">
      <div id="formWrapper">
        <img id="MAETSLOGO" src={Logo} alt="MAETS LOGO" />
        <div id="loginForm">
          <button type="button" onClick={handleADFSLogin}>
            Sign in with ADFS
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;