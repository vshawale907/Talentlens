import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { User, Mail, Lock, Eye, EyeOff, Zap, Loader2 } from 'lucide-react';
import { authApi } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

export default function RegisterPage() {
    const navigate = useNavigate();
    const setAuth = useAuthStore((s) => s.setAuth);
    const [form, setForm] = useState({ name: '', email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(''); setLoading(true);
        try {
            const { data } = await authApi.register(form);
            const { user, tokens } = data.data;
            setAuth(user, tokens.accessToken, tokens.refreshToken);
            navigate('/dashboard');
        } catch (err: any) {
            let msg = err?.response?.data?.message;
            if (err?.response?.data?.errors) {
                const firstError = Object.values(err.response.data.errors)[0] as string[];
                if (firstError?.[0]) msg = firstError[0];
            }
            if (!msg && err?.message) msg = err.message;
            setError(msg ?? 'Registration failed. Please try again.');
        } finally { setLoading(false); }
    };

    const strength = form.password.length >= 8 && /[A-Z]/.test(form.password) && /\d/.test(form.password);

    return (
        <div className="min-h-screen flex bg-white">
            {/* ── Left brand panel ── */}
            <div className="hidden lg:flex w-[420px] flex-shrink-0 bg-background-dark thin-grid-dark flex-col justify-between p-10 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-accent" />
                <div>
                    <div className="flex items-center gap-3 mb-16">
                        <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                            <Zap size={20} className="text-white" />
                        </div>
                        <span className="text-xl font-bold text-white">TalentLens</span>
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-4 leading-snug">
                        Your career journey<br />
                        <span className="text-accent">starts here.</span>
                    </h2>
                    <p className="text-white/50 text-base leading-relaxed">
                        Join thousands of professionals who upgraded their resume and landed their dream job with AI-powered insights.
                    </p>
                </div>
                <ul className="space-y-3">
                    {['AI-powered ATS scoring', 'Keyword gap analysis', 'Cover letter generator', 'Interview coach'].map((f) => (
                        <li key={f} className="flex items-center gap-3 text-sm text-white/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                            {f}
                        </li>
                    ))}
                </ul>
            </div>

            {/* ── Right form panel ── */}
            <div className="flex-1 flex items-center justify-center p-8 thin-grid">
                <motion.div
                    initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }} className="w-full max-w-md"
                >
                    <div className="flex items-center gap-2.5 mb-10 lg:hidden">
                        <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
                            <Zap size={18} className="text-white" />
                        </div>
                        <span className="text-xl font-bold text-text-primary">TalentLens</span>
                    </div>

                    <h1 className="text-4xl font-bold text-text-primary mb-2">Create account</h1>
                    <p className="text-text-secondary mb-8">Start optimizing your career for free</p>

                    {error && <div className="mb-5 p-3.5 rounded-xl bg-danger-light border border-danger-border text-danger text-sm font-medium">{error}</div>}

                    <motion.form
                        onSubmit={handleSubmit} className="space-y-5"
                        initial="hidden" animate="show"
                        variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } }}
                    >
                        {[
                            { label: 'Full Name', icon: User, key: 'name', type: 'text', placeholder: 'John Doe' },
                            { label: 'Email', icon: Mail, key: 'email', type: 'email', placeholder: 'you@example.com' },
                        ].map(({ label, icon: Icon, key, type, placeholder }) => (
                            <motion.div key={key} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                                <label className="block text-sm font-semibold text-text-primary mb-2">{label}</label>
                                <div className="relative">
                                    <Icon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                                    <input type={type} required value={form[key as keyof typeof form]}
                                        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                                        className="input-field pl-10" placeholder={placeholder} />
                                </div>
                            </motion.div>
                        ))}

                        <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                            <label className="block text-sm font-semibold text-text-primary mb-2">Password</label>
                            <div className="relative">
                                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
                                <input type={showPassword ? 'text' : 'password'} required value={form.password}
                                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                                    className="input-field pl-10 pr-11" placeholder="Min. 8 chars, uppercase + number" />
                                <button type="button" onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors">
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {form.password && (
                                <div className="mt-2 flex gap-1 items-center">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${strength ? 'bg-success' : i === 1 ? 'bg-accent' : 'bg-gray-200'}`} />
                                    ))}
                                    <span className="text-xs text-text-secondary ml-1">{strength ? 'Strong' : 'Weak'}</span>
                                </div>
                            )}
                        </motion.div>

                        <motion.button variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                            type="submit" disabled={loading} className="btn-primary w-full mt-2">
                            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                            {loading ? 'Creating account…' : 'Create Free Account'}
                        </motion.button>
                    </motion.form>

                    <p className="text-center text-text-secondary mt-6 text-sm">
                        Already have an account?{' '}
                        <Link to="/login" className="text-accent hover:text-accent-hover font-semibold transition-colors">Sign in</Link>
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
