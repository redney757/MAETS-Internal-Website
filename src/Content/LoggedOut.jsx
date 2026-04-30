import { useEffect } from "react";
import { useNavigate } from "react-router";
import "../Design/Login.css";
import Logo from "../assets/Logo.avif";

function LoggedOut() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/");
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div id="loginPageDiv">
      <div id="formWrapper">
        <img id="MAETSLOGO" src={Logo} alt="MAETS LOGO" />
        <h2>Signed out</h2>
        <p>You have been successfully signed out.</p>
        <p>Redirecting to home in 5 seconds...</p>
      </div>
    </div>
  );
}

export default LoggedOut;