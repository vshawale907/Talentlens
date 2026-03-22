import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, Zap, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { authApi } from '../lib/api';

export default function ResetPasswordPage() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        
        if (!token) {
            setError('Invalid or missing reset token');
            return;
        }

        setLoading(true);
        try {
            await authApi.resetPassword({ token, newPassword: password });
            setSuccess(true);
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            setError(msg ?? 'Failed to reset password. The link might be expired.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background thin-grid">
            <motion.div
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mb-4 border border-primary/20">
                        <Zap size={28} className="text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold text-text-primary">New Password</h1>
                    <p className="text-text-muted mt-3">Choose a strong password to secure your account</p>
                </div>

                <div className="card">
                    {error && (
                        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
                            {error}
                        </div>
                    )}

                    {success ? (
                        <div className="text-center py-6">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4">
                                <CheckCircle size={32} className="text-green-500" />
                            </div>
                            <h2 className="text-xl font-bold text-text-primary mb-2">Password Reset!</h2>
                            <p className="text-text-secondary mb-6 text-sm">You can now use your new password to sign in to your account.</p>
                            <Link to="/login" className="btn-primary w-full inline-flex justify-center">
                                Proceed to Login
                            </Link>
                        </div>
                    ) : (
                        <motion.form
                            onSubmit={handleSubmit}
                            className="space-y-4"
                            initial="hidden"
                            animate="show"
                            variants={{
                                hidden: { opacity: 0 },
                                show: { opacity: 1, transition: { staggerChildren: 0.1 } }
                            }}
                        >
                            <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                                <label className="block text-sm font-medium text-text-secondary mb-1.5">New Password</label>
                                <div className="relative">
                                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                                    <input
                                        type={showPassword ? 'text' : 'password'} required value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="input-field pl-9 pr-10" placeholder="••••••••"
                                        minLength={8}
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors">
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </motion.div>
                            
                            <motion.div variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                                <label className="block text-sm font-medium text-text-secondary mb-1.5">Confirm New Password</label>
                                <div className="relative">
                                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                                    <input
                                        type={showPassword ? 'text' : 'password'} required value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="input-field pl-9 pr-10" placeholder="••••••••"
                                        minLength={8}
                                    />
                                </div>
                            </motion.div>

                            <motion.button variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} type="submit" disabled={loading} className="btn-primary w-full mt-4">
                                {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                                {loading ? 'Resetting...' : 'Reset Password'}
                            </motion.button>
                        </motion.form>
                    )}
                </div>

                {!success && (
                    <p className="text-center mt-6">
                        <Link to="/login" className="inline-flex items-center gap-2 text-text-secondary hover:text-primary font-medium transition-colors text-sm">
                            <ArrowLeft size={16} /> Back to Login
                        </Link>
                    </p>
                )}
            </motion.div>
        </div>
    );
}
