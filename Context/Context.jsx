import React, {useState} from "react";
import axios from "axios";
import { useNavigate } from "react-router";
import { useEffect } from "react";

const AuthContext = React.createContext();

const AuthProvider = ({children}) => {
    const [user, setuser] = useState(localStorage.getItem("user") ? JSON.parse(localStorage.getItem("user")) : null)
    const navigate = useNavigate();
    const [token, setToken] = useState(localStorage.getItem("token") || null);
    const [apiMessage, setApiMessage] = useState("Success!");
    const [pbxUsers, setPBXUsers] = useState([]);
    const [pbxLoading, setPBXLoading] = useState(false);
    const [pbxError, setPBXError] = useState(null);

    const loadPBXUsers = async () => {
        try {
            setPBXLoading(true);
            setPBXError(null);

            const response = await axios.get("http://localhost:3001/api/pbx/users");
            console.log("PBX response:", response.data);
            const sortedPBXUsers = response.data.sort((a,b)=> {
                return a.displayname.localeCompare(b.displayname)
            })
            console.log(sortedPBXUsers)
            setPBXUsers(Array.isArray(sortedPBXUsers) ? response.data : []);
        } catch (error) {
            console.error("PBX load error:", error.response?.data || error.message);
            setPBXError(error.response?.data || error.message);
        } finally {
            setPBXLoading(false);
        }
};
useEffect(() => {
        loadPBXUsers();
    }, []);


    return (
        <AuthContext.Provider value={{user, token, setuser, apiMessage, loadPBXUsers, pbxUsers, pbxLoading, pbxError}}>
            {children}
        </AuthContext.Provider>
    )
}

export {AuthContext, AuthProvider}