import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, Upload, Briefcase, MessageSquare,
    FileText, Bot, Shield, LogOut, ChevronRight, Zap, Sparkles
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

const navItems = [
    { to: '/dashboard',      icon: LayoutDashboard, label: 'Dashboard'      },
    { to: '/upload',         icon: Upload,           label: 'Upload Resume'  },
    { to: '/interview/select', icon: MessageSquare,  label: 'Interview Coach'},
    { to: '/cover-letter/select', icon: FileText,    label: 'Cover Letter'  },
    { to: '/chat',           icon: Bot,              label: 'AI Coach Chat'  },
];

export default function Layout() {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => { logout(); navigate('/login'); };

    return (
        <div className="flex h-screen overflow-hidden bg-background-panel">
            {/* ─── Sidebar ─────────────────────────────────── */}
            <motion.aside
                initial={{ x: -72, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="w-72 flex-shrink-0 flex flex-col bg-background-dark thin-grid-dark relative"
            >
                {/* Subtle gold top accent line */}
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-accent" />

                {/* Logo */}
                <motion.div
                    whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                    className="flex items-center gap-3 px-6 py-5 border-b border-white/10 cursor-pointer transition-colors"
                    onClick={() => navigate('/dashboard')}
                >
                    <motion.div
                        whileHover={{ rotate: 15, scale: 1.1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                        className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center flex-shrink-0"
                    >
                        <Zap size={18} className="text-white" />
                    </motion.div>
                    <span className="text-lg font-bold text-white tracking-tight">TalentLens</span>
                    <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity }}>
                        <Sparkles size={12} className="text-accent ml-auto" />
                    </motion.div>
                </motion.div>

                {/* Nav */}
                <nav className="flex-1 overflow-y-auto pt-4 pb-4 space-y-0.5 px-3">
                    {navItems.map(({ to, icon: Icon, label }, idx) => (
                        <motion.div
                            key={to}
                            initial={{ opacity: 0, x: -16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.05 + idx * 0.05, type: 'spring', stiffness: 300, damping: 24 }}
                        >
                            <NavLink to={to} className={({ isActive }) =>
                                isActive ? 'nav-link-active' : 'nav-link-inactive'
                            }>
                                {({ isActive }) => (
                                    <>
                                        <motion.div whileHover={{ scale: 1.15 }} transition={{ type: 'spring', stiffness: 400, damping: 10 }}>
                                            <Icon size={20} className={isActive ? 'text-white' : 'text-white/50 group-hover:text-white/80'} />
                                        </motion.div>
                                        <span className="flex-1">{label}</span>
                                        {isActive && (
                                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 15 }}>
                                                <ChevronRight size={14} className="text-white/70" />
                                            </motion.div>
                                        )}
                                    </>
                                )}
                            </NavLink>
                        </motion.div>
                    ))}

                    {user?.role === 'admin' && (
                        <motion.div
                            initial={{ opacity: 0, x: -16 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.35, type: 'spring', stiffness: 300, damping: 24 }}
                            className="mt-2"
                        >
                            <NavLink to="/admin" className={({ isActive }) =>
                                isActive ? 'nav-link-active' : 'nav-link-inactive'
                            }>
                                <Shield size={20} />
                                <span>Admin</span>
                            </NavLink>
                        </motion.div>
                    )}
                </nav>

                {/* Divider label */}
                <div className="px-6 mb-2">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-white/20">Account</p>
                </div>

                {/* User profile */}
                <div className="p-4 border-t border-white/10">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/10 transition-colors group cursor-default"
                    >
                        <motion.div
                            whileHover={{ scale: 1.1 }}
                            className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                        >
                            {user?.name?.[0]?.toUpperCase() ?? 'U'}
                        </motion.div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                            <p className="text-xs text-white/40 capitalize">{user?.subscriptionTier ?? 'free'} plan</p>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.15, color: '#F87171' }}
                            onClick={handleLogout}
                            className="text-white/30 hover:text-red-400 transition-colors"
                            title="Logout"
                        >
                            <LogOut size={15} />
                        </motion.button>
                    </motion.div>
                </div>
            </motion.aside>

            {/* ─── Main Content ────────────────────────────── */}
            <main className="flex-1 overflow-hidden p-0 bg-gray-950">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        className="w-full h-full overflow-y-auto"
                    >
                        <Outlet />
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    );
}
