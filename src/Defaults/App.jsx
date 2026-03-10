import { useNavigate} from "react-router";
import { useContext } from "react";
import MainLayout from "../Layout/MainLayout";
import { Route, Routes } from "react-router";
import { useState, useEffect } from "react";
import Landing from "../Content/Landing";
import Directory from "../Content/Directory";
function  App() {
    const navigate  = useNavigate();
    return (
        <>
        <MainLayout/>
        <Routes>
            <Route path="/home" element={<Landing/>} />
            <Route path="/directory" element={<Directory/>}/>
        </Routes>
        </>
    )
}
export default App