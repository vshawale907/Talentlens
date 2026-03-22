import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuthStore } from './stores/authStore';
import Layout from './components/Layout';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import UploadPage from './pages/UploadPage';
import AnalysisPage from './pages/AnalysisPage';
import InterviewCoachPage from './pages/InterviewCoachPage';
import CoverLetterPage from './pages/CoverLetterPage';
import ChatCoachPage from './pages/ChatCoachPage';
import JobMatcherPage from './pages/JobMatcherPage';
import AdminPage from './pages/AdminPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

// ─── Protected Route Guard ────────────────────────────
const ProtectedRoute = () => {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

// ─── Admin Route Guard ────────────────────────────────
const AdminRoute = () => {
    const user = useAuthStore((s) => s.user);
    if (!user) return <Navigate to="/login" replace />;
    if (user.role !== 'admin') return <Navigate to="/dashboard" replace />;
    return <Outlet />;
};

// ─── Public Only (redirect if logged in) ─────────────
const PublicRoute = () => {
    const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
    return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />;
};

const AnimatedRoutes = () => {
    const location = useLocation();

    return (
        <Routes location={location} key={location.pathname}>
            {/* Public routes — animated here since they don't use Layout */}
            <Route element={<PublicRoute />}>
                <Route path="/login" element={
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                        <LoginPage />
                    </motion.div>
                } />
                <Route path="/register" element={
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                        <RegisterPage />
                    </motion.div>
                } />
                <Route path="/forgot-password" element={
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                        <ForgotPasswordPage />
                    </motion.div>
                } />
                <Route path="/reset-password/:token" element={
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                        <ResetPasswordPage />
                    </motion.div>
                } />
            </Route>

            {/* Protected routes — Layout handles its own AnimatePresence page transitions */}
            <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/upload" element={<UploadPage />} />
                    <Route path="/analysis/:resumeId" element={<AnalysisPage />} />
                    <Route path="/interview/:resumeId" element={<InterviewCoachPage />} />
                    <Route path="/cover-letter/:resumeId" element={<CoverLetterPage />} />
                    <Route path="/chat" element={<ChatCoachPage />} />
                    <Route path="/jobs" element={<JobMatcherPage />} />

                    {/* Admin only */}
                    <Route element={<AdminRoute />}>
                        <Route path="/admin" element={<AdminPage />} />
                    </Route>
                </Route>
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    );
};

export default function App() {
    return (
        <BrowserRouter>
            <AnimatedRoutes />
        </BrowserRouter>
    );
}
