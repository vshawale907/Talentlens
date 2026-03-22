import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Zap, Loader2, ArrowLeft } from 'lucide-react';
import { authApi } from '../lib/api';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setLoading(true);
        try {
            await authApi.forgotPassword({ email });
            setSuccessMessage(`A password reset link has been sent to ${email}. Please check your inbox (and spam folder).`);
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            setError(msg ?? 'Failed to process request. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-8 thin-grid bg-white">
            <motion.div
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-lg"
            >
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent mb-4">
                        <Zap size={28} className="text-white" />
                    </div>
                    <h1 className="text-4xl font-bold text-text-primary">Reset Password</h1>
                    <p className="text-text-muted mt-3">We'll send you a link to reset your password</p>
                </div>

                <div className="card">
                    {error && (
                        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
                            {error}
                        </div>
                    )}
                    {successMessage && (
                        <div className="mb-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400/90 text-sm font-medium break-all">
                            {successMessage}
                        </div>
                    )}
                    
                    {!successMessage && (
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
                            <label className="block text-sm font-semibold text-text-primary mb-2">Email Address</label>
                                <div className="relative">
                                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                                    <input
                                        type="email" required value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="input-field pl-9" placeholder="you@example.com"
                                    />
                                </div>
                            </motion.div>
                            <motion.button variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }} type="submit" disabled={loading} className="btn-primary w-full mt-4">
                                {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                                {loading ? 'Sending...' : 'Send Reset Link'}
                            </motion.button>
                        </motion.form>
                    )}
                </div>

                <p className="text-center mt-6">
                    <Link to="/login" className="inline-flex items-center gap-2 text-text-secondary hover:text-accent font-semibold transition-colors text-sm">
                        <ArrowLeft size={16} /> Back to Login
                    </Link>
                </p>
            </motion.div>
        </div>
    );
}
