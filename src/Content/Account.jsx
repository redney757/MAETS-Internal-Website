import { useNavigate } from "react-router"
import { useAuth } from "../../Context/Context";
import { useState, useEffect } from "react";

function Account() {
             const { user, logout } = useAuth();

    return (
        <>
        <h1>Welcome {user?.sn}, {user?.givenName}</h1>
        </>
    )
}

export default Account