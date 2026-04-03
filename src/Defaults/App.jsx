import MainLayout from "../Layout/MainLayout";
import { Route, Routes, Navigate, useLocation } from "react-router";
import Landing from "../Content/Landing";
import Directory from "../Content/Directory";
import Login from "../Content/Login";
import { useAuth } from "../../Context/Context";
import Account from "../Content/Account";
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
  const hideLayout = location.pathname === "/login";

  return (
    <>
      {!hideLayout && <MainLayout />}

      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/home" element={<Landing />} />
        <Route path="/myAccount" element={<RequireAuth><Account /></RequireAuth>} />
        <Route path="/directory" element={<RequireAuth><Directory /></RequireAuth>} />

        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <Login />
            </PublicOnlyRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;