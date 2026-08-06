import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import Navbar from "./components/Navbar.jsx";
import Welcome from "./pages/Welcome.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import SearchResults from "./pages/SearchResults.jsx";
import Assistant from "./pages/Assistant.jsx";
import History from "./pages/History.jsx";
import Profile from "./pages/Profile.jsx";
import Insights from "./pages/Insights.jsx";
import AllPharmacies from "./pages/AllPharmacies.jsx";
import Checkout from "./pages/Checkout.jsx";
import Orders from "./pages/Orders.jsx";

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// Public marketing landing at "/" -- once logged in, "/" is the app
// dashboard instead (same path, different content), matching how most
// consumer apps treat their root URL.
function Home() {
  const { user, loading } = useAuth();
  if (loading) return null;
  return user ? <Dashboard /> : <Welcome />;
}

export default function App() {
  const { user } = useAuth();
  const location = useLocation();
  const showAppNavbar = user && location.pathname !== "/welcome";

  return (
    <div className="app-shell">
      {showAppNavbar && <Navbar />}
      <Routes>
        <Route path="/welcome" element={<Welcome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
        <Route path="/search" element={<Protected><SearchResults /></Protected>} />
        <Route path="/assistant" element={<Protected><Assistant /></Protected>} />
        <Route path="/history" element={<Protected><History /></Protected>} />
        <Route path="/insights" element={<Protected><Insights /></Protected>} />
        <Route path="/pharmacies" element={<Protected><AllPharmacies /></Protected>} />
        <Route path="/checkout" element={<Protected><Checkout /></Protected>} />
        <Route path="/orders" element={<Protected><Orders /></Protected>} />
        <Route path="/profile" element={<Protected><Profile /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
