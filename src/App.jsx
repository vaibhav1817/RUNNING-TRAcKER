import { HashRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Home from "./pages/Home";
import Activity from "./pages/Activity";
import Maps from "./pages/Maps";
import Plan from "./pages/Plan";
import Profile from "./pages/Profile";
import ForgotPassword from "./pages/Auth/ForgotPassword";
import ResetPassword from "./pages/Auth/ResetPassword";
import Social from "./pages/Social";
import Login from "./pages/Auth/Login";
import BottomNav from "./components/BottomNav";
import { RunProvider, useRun } from "./context/RunProvider";

function RequireAuth({ children }) {
  const { token } = useRun();
  return token ? children : <Navigate to="/login" replace />;
}

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<PageWrapper><Login /></PageWrapper>} />
        <Route path="/forgot-password" element={<PageWrapper><ForgotPassword /></PageWrapper>} />
        <Route path="/reset-password/:token" element={<PageWrapper><ResetPassword /></PageWrapper>} />

        <Route
          path="/"
          element={
            <RequireAuth>
              <PageWrapper>
                <Home />
              </PageWrapper>
            </RequireAuth>
          }
        />
        <Route
          path="/community"
          element={
            <RequireAuth>
              <PageWrapper>
                <Social />
              </PageWrapper>
            </RequireAuth>
          }
        />
        <Route
          path="/activity"
          element={
            <RequireAuth>
              <PageWrapper>
                <Activity />
              </PageWrapper>
            </RequireAuth>
          }
        />
        <Route
          path="/maps"
          element={
            <RequireAuth>
              <PageWrapper>
                <Maps />
              </PageWrapper>
            </RequireAuth>
          }
        />
        <Route
          path="/plan" // Assuming Plan is "Training" or similar
          element={
            <RequireAuth>
              <PageWrapper>
                <Plan />
              </PageWrapper>
            </RequireAuth>
          }
        />
        <Route
          path="/profile"
          element={
            <RequireAuth>
              <PageWrapper>
                <Profile />
              </PageWrapper>
            </RequireAuth>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}

const PageWrapper = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    transition={{ duration: 0.2 }}
    style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}
  >
    {children}
  </motion.div>
);

function MainLayout() {
  const location = useLocation();
  // Hide BottomNav on login page and password reset pages
  const showNav = !['/login', '/forgot-password'].includes(location.pathname) && !location.pathname.startsWith('/reset-password');

  return (
    <>
      <AnimatedRoutes />
      {showNav && <BottomNav />}
    </>
  );
}

import Particles from "./components/Particles";

export default function App() {
  return (
    <RunProvider>
      <div className="app-container">
        <Particles />
        <HashRouter>
          <MainLayout />
        </HashRouter>
      </div>
    </RunProvider>
  );
}
