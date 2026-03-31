import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Zap, Loader2 } from 'lucide-react';
import { authApi } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

export default function LoginPage() {
    const navigate = useNavigate();
    const setAuth = useAuthStore((s) => s.setAuth);
    const [form, setForm] = useState({ email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(''); setLoading(true);
        try {
            const { data } = await authApi.login(form);
            const { user, tokens } = data.data;
            setAuth(user, tokens.accessToken, tokens.refreshToken);
            navigate('/dashboard');
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            setError(msg ?? 'Login failed. Please try again.');
        } finally { setLoading(false); }
    };

    return (
        <div className="min-h-screen flex bg-white">
            {/* ── Left brand panel ── */}
            <div className="hidden lg:flex w-[420px] flex-shrink-0 bg-background-dark thin-grid-dark flex-col justify-between p-10 relative overflow-hidden">
                {/* Gold top bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-accent" />

                <div>
                    <div className="flex items-center gap-3 mb-16">
                        <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                            <Zap size={20} className="text-white" />
                        </div>
                        <span className="text-xl font-bold text-white">TalentLens</span>
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-4 leading-snug">
                        Analyze. Optimize.<br />
                        <span className="text-accent">Get Hired.</span>
                    </h2>
                    <p className="text-white/50 text-base leading-relaxed">
                        AI-powered resume analysis that gives you the competitive edge ATS scoring, skill gaps & actionable improvements in seconds.
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                    {[
                        { val: '95%', label: 'ATS pass rate' },
                        { val: '3×',  label: 'More interviews' },
                        { val: '10s', label: 'Analysis time'  },
                        { val: 'AI',  label: 'Groq-powered'   },
                    ].map(({ val, label }) => (
                        <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-4">
                            <p className="text-2xl font-bold text-accent">{val}</p>
                            <p className="text-xs text-white/40 mt-0.5">{label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Right form panel ── */}
            <div className="flex-1 flex items-center justify-center p-8 thin-grid">
                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-full max-w-md"
                >
                    {/* Mobile logo */}
                    <div className="flex items-center gap-2.5 mb-10 lg:hidden">
                        <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
                            <Zap size={18} className="text-white" />
                        </div>
                        <span className="text-xl font-bold text-text-primary">TalentLens</span>
                    </div>

                    <h1 className="text-4xl font-bold text-text-primary mb-2">Welcome back</h1>
                    <p className="text-text-secondary mb-8">Sign in to your account to continue</p>

                    {error && (
                        <div className="mb-5 p-3.5 rounded-xl bg-danger-light border border-danger-border text-danger text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <motion.form
                        onSubmit={handleSubmit}
                        className="space-y-5"
                        initial="hidden"
                        animate="show"
                        variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }}
                    >
                        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                            <label className="block text-sm font-semibold text-text-primary mb-2">Email</label>
                            <div className="relative">
                                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                                <input
                                    type="email" required value={form.email}
                                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                                    className="input-field pl-10" placeholder="you@example.com"
                                />
                            </div>
                        </motion.div>

                        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-sm font-semibold text-text-primary">Password</label>
                                <Link to="/forgot-password" className="text-xs text-accent hover:text-accent-hover font-semibold transition-colors">
                                    Forgot password?
                                </Link>
                            </div>
                            <div className="relative">
                                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                                <input
                                    type={showPassword ? 'text' : 'password'} required value={form.password}
                                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                                    className="input-field pl-10 pr-11" placeholder="••••••••"
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors">
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </motion.div>

                        <motion.button
                            variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                            type="submit" disabled={loading}
                            className="btn-primary w-full mt-2"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                            {loading ? 'Signing in…' : 'Sign In'}
                        </motion.button>
                    </motion.form>

                    <p className="text-center text-text-secondary mt-6 text-sm">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-accent hover:text-accent-hover font-semibold transition-colors">
                            Create one free
                        </Link>
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
