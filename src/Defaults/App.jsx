import { useNavigate} from "react-router";
import { useContext } from "react";
import MainLayout from "../Layout/MainLayout";
import { Route, Routes } from "react-router";
import { useState, useEffect } from "react";
import Landing from "../Content/Landing";
function  App() {
    const navigate  = useNavigate();
    return (
        <>
        <MainLayout/>
        <Routes>
            <Route path="/home" element={<Landing/>} />
        </Routes>
        </>
    )
}
export default App