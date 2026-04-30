import React, { useState, useEffect, useContext } from "react";
import api from "../src/API/api.js";

const AuthContext = React.createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);  
const [ldapConfig, setLdapConfig] = useState(null);










useEffect(()=> {
    async function getSettings() {
      try {
        const config = await api.get("/api/settings");
        console.log("Settings loaded:", config.data);
        setLdapConfig(config.data);
      } catch (err) {
        console.error("Failed to load settings:", err.response?.data || err.message);
      }
    }
    getSettings();
},[])
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await api.get("/api/me");
        setUser(res.data);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, []);

  function hasRole(role) {
    if (!role || !user?.groups || !user) return false
    return user.groups.includes(role);
  }
  function hasAnyRole(roles = []) {
    if (!user?.groups || !user ) return false;
    return roles
    .filter(Boolean)
    .some(role => user.groups.includes(role));
  }
  function isSiteAdmin() {
    return hasRole(ldapConfig?.SITE_ADMIN_ROLE);
  }

  function canEditLDAPSettings() {
    return hasRole(ldapConfig?.SITE_ADMIN_ROLE);
  }
  function canEditQuickAccess() {
    return hasAnyRole([ldapConfig?.SITE_ADMIN_ROLE]);
  }

  async function logout() {
    try {
      const res = await api.post("/api/logout");
      setUser(null);

      if (res.data.logoutUrl) {
        window.location.href = res.data.logoutUrl;
      } else {
        window.location.href = "/logged-out";
      }
    } catch (err) {
      console.error("Logout failed:", err);
      window.location.href = "/logged-out";
    }
  }

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout, ldapConfig, setLdapConfig, hasRole, hasAnyRole, isSiteAdmin, canEditLDAPSettings, canEditQuickAccess }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => useContext(AuthContext);

export { AuthContext, AuthProvider, useAuth };