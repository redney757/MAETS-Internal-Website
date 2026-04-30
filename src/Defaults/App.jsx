import MainLayout from "../Layout/MainLayout";
import { Route, Routes, Navigate, useLocation } from "react-router";
import Landing from "../Content/Landing/Landing";
import Directory from "../Content/Directory";
import Login from "../Content/Login";
import LoggedOut from "../Content/LoggedOut";
import { useAuth } from "../../Context/Context";
import Account from "../Content/Account";
import Settings from "../Content/Settings";
import FrequentlyAsked from "../Content/FrequentlyAsked.jsx";
import InventoryManagement from "../Content/InventoryManagement.jsx";

function PublicOnlyRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <p>Loading...</p>;

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <p>Loading...</p>;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  const location = useLocation();
  const hideLayout =
    location.pathname === "/login" ||
    location.pathname === "/logged-out";

  return (
    <>
      {!hideLayout && <MainLayout />}

      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/myAccount" element={<RequireAuth><Account /></RequireAuth>} />
        <Route path="/directory" element={<Directory />} />
        <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
        <Route path="/inventory-management" element={<RequireAuth><InventoryManagement /></RequireAuth>} />
        <Route path="/frequently-asked" element={<FrequentlyAsked />} />
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <Login />
            </PublicOnlyRoute>
          }
        />

        <Route path="/logged-out" element={<LoggedOut />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;