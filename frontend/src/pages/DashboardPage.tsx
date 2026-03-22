import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, Radar
} from 'recharts';
import {
    FileText, TrendingUp, Brain, ChevronRight, Plus,
    MessageSquare, Bot, Zap, ArrowUpRight, Upload, LucideIcon,
    Award, Sparkles, Target, Briefcase, Activity
} from 'lucide-react';
import { userApi, resumeApi } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { useResumeStore } from '../stores/resumeStore';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// ─── Animated stat card ─────────────────────────────────────────────────────
const StatCard = ({
    icon: Icon, label, value, color, delay = 0, subtitle
}: { icon: LucideIcon; label: string; value: string | number; color: string; delay?: number; subtitle?: string }) => (
    <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, type: 'spring', stiffness: 260, damping: 20 }}
        whileHover={{ y: -3, transition: { duration: 0.2 } }}
        className="card flex items-center gap-4 relative overflow-hidden group cursor-default"
    >
        <div className="absolute top-0 right-0 w-24 h-24 -mt-8 -mr-8 rounded-full bg-black/[0.02] group-hover:bg-black/[0.04] transition-colors" />
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
            <Icon size={22} />
        </div>
        <div>
            <motion.p className="text-2xl font-bold text-text-primary"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: delay + 0.15 }}>
                {value}
            </motion.p>
            <p className="text-sm text-text-secondary">{label}</p>
            {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
        </div>
    </motion.div>
);

// ─── Quick action button ─────────────────────────────────────────────────────
const QuickAction = ({ icon: Icon, label, desc, color, onClick, delay = 0 }: {
    icon: LucideIcon; label: string; desc: string; color: string; onClick: () => void; delay?: number;
}) => (
    <motion.button
        initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }}
        transition={{ delay, type: 'spring', stiffness: 300, damping: 24 }}
        whileHover={{ x: 4 }} whileTap={{ scale: 0.97 }}
        onClick={onClick}
        className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-200 text-left group"
    >
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border ${color}`}>
            <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary">{label}</p>
            <p className="text-xs text-text-muted">{desc}</p>
        </div>
        <ArrowUpRight size={16} className="text-text-muted group-hover:text-text-primary transition-colors flex-shrink-0" />
    </motion.button>
);

// ─── Loading skeleton ────────────────────────────────────────────────────────
const Skeleton = ({ className }: { className?: string }) => (
    <div className={`bg-gray-100 rounded-lg animate-pulse ${className}`} />
);

export default function DashboardPage() {
    const navigate = useNavigate();
    const user = useAuthStore((s) => s.user);
    const { resumes, setResumes } = useResumeStore();
    const [analytics, setAnalytics] = useState<Record<string, unknown> | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            userApi.getAnalytics(),
            resumeApi.list(),
        ]).then(([{ data }, { data: rd }]) => {
            setAnalytics(data.data.analytics);
            setResumes(rd.data.resumes ?? []);
        }).catch(console.error).finally(() => setLoading(false));
    }, []);

    // ── Chart data ────────────────────────────────────────────────────────────
    const scoreData = (analytics?.scoreHistory as Array<{ _id: { month: number }; avgATS: number; avgOverall: number }> ?? []).map((d) => ({
        month: MONTHS[(d._id.month ?? 1) - 1],
        ats: Math.round(d.avgATS ?? 0),
        overall: Math.round(d.avgOverall ?? 0),
    }));

    const uploadData = (analytics?.monthlyUploads as Array<{ _id: { month: number }; count: number }> ?? []).map((d) => ({
        month: MONTHS[(d._id.month ?? 1) - 1],
        uploads: d.count,
    }));

    const recentAnalyses = analytics?.recentAnalyses as Array<{
        _id: string; resume: { _id: string; title: string };
        openAIResult: { atsScore: number; overallScore: number };
        nlpResult?: { extractedSkills?: string[] };
        createdAt: string;
    }> ?? [];

    // ── Radar skill data from latest analysis ─────────────────────────────────
    const latestAnalysis = recentAnalyses[0];
    const avgATS = Math.round(
        recentAnalyses.reduce((acc, a) => acc + (a.openAIResult?.atsScore ?? 0), 0) / Math.max(recentAnalyses.length, 1)
    );
    const resumeCount = Number(analytics?.resumeCount ?? 0);
    const analysisCount = Number(analytics?.analysisCount ?? 0);
    const profileStrength = Math.min(100, 40 + (resumeCount * 10) + (analysisCount * 5));
    const careerReadiness = Math.round((avgATS + profileStrength) / 2);

    const topSkills = (latestAnalysis?.nlpResult?.extractedSkills ?? []).slice(0, 5) as string[];

    const radarData = [
        { metric: 'ATS Score', value: latestAnalysis?.openAIResult?.atsScore ?? 0 },
        { metric: 'Overall', value: latestAnalysis?.openAIResult?.overallScore ?? 0 },
        { metric: 'Avg ATS', value: avgATS },
        { metric: 'Activity', value: Math.min((analytics?.analysisCount as number ?? 0) * 20, 100) },
        { metric: 'Resumes', value: Math.min((analytics?.resumeCount as number ?? 0) * 25, 100) },
    ];

    // ─── Loading skeleton ──────────────────────────────────────────────────────
    if (loading) return (
        <div className="space-y-8">
            <Skeleton className="h-10 w-72" />
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Skeleton className="h-64 lg:col-span-2" />
                <Skeleton className="h-64" />
            </div>
        </div>
    );

    return (
        <div className="space-y-8 max-w-7xl mx-auto">

            {/* ── Header ─────────────────────────────────────────────────────── */}
            <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold text-text-primary">
                        Welcome back, <span className="text-primary">{user?.name?.split(' ')[0]}</span> 👋
                    </h1>
                    <p className="text-text-secondary mt-1">Here's your resume performance overview</p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                    onClick={() => navigate('/upload')} className="btn-primary self-start sm:self-auto">
                    <Plus size={18} /> New Resume
                </motion.button>
            </motion.div>

            {/* ── Stat Cards ─────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={FileText} label="Total Resumes" value={resumeCount}
                    color="bg-accent-subtle text-amber-600 border border-accent-border" delay={0} subtitle="uploaded" />
                <StatCard icon={Brain} label="Analyses Run" value={analysisCount}
                    color="bg-gray-100 text-text-primary border border-border" delay={0.05} subtitle="total" />
                <StatCard icon={Award} label="Avg ATS Score" value={avgATS > 0 ? `${avgATS}%` : '—'}
                    color="bg-accent-subtle text-amber-600 border border-accent-border" delay={0.1} subtitle="across analyses" />
                <StatCard icon={Target} label="Profile Strength"
                    value={`${profileStrength}%`}
                    color="bg-gray-100 text-text-primary border border-border" delay={0.15} subtitle="completeness" />
            </div>

            {/* ── Main Layout: 2 Columns ─────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Column (Wider) */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Score History */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                        className="card">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-text-primary">Score History</h2>
                            <span className="text-xs text-text-muted bg-gray-100 px-2 py-1 rounded-md border border-gray-200">Last 6 months</span>
                        </div>
                        {scoreData.length > 0 ? (
                            <ResponsiveContainer width="100%" height={200}>
                                <AreaChart data={scoreData}>
                                    <defs>
                                        <linearGradient id="atsGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.25} />
                                            <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="overallGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#111827" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="#111827" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                                    <XAxis dataKey="month" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <YAxis domain={[0, 100]} tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} />
                                    <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 8, color: '#111827' }} itemStyle={{ color: '#111827' }} />
                                    <Area type="monotone" dataKey="ats" name="ATS Score" stroke="#F59E0B" fill="url(#atsGrad)" strokeWidth={2.5} dot={{ fill: '#F59E0B', r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: '#F59E0B' }} />
                                    <Area type="monotone" dataKey="overall" name="Overall" stroke="#111827" fill="url(#overallGrad)" strokeWidth={2} strokeDasharray="5 3" dot={{ fill: '#111827', r: 4, strokeWidth: 0 }} activeDot={{ r: 6, fill: '#111827' }} />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-[200px] flex flex-col items-center justify-center text-center gap-3">
                                <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }}
                                    className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                                    <TrendingUp size={20} className="text-primary" />
                                </motion.div>
                                <p className="text-text-muted text-sm">Upload and analyze a resume to see score history</p>
                            </div>
                        )}
                        <div className="flex gap-4 mt-2">
                            <span className="flex items-center gap-1.5 text-xs text-text-muted">
                                <span className="w-3 h-0.5 bg-accent inline-block rounded" /> ATS Score
                            </span>
                            <span className="flex items-center gap-1.5 text-xs text-text-muted">
                                <span className="w-3 h-0.5 bg-primary inline-block rounded" /> Overall Score
                            </span>
                        </div>
                    </motion.div>

                    {/* Top Skills Showcase & Recent Activity */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                            className="card">
                            <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                                <Sparkles size={18} className="text-primary" /> Top Skills
                            </h2>
                            {topSkills.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {topSkills.map((skill, i) => (
                                        <span key={i} className="px-3 py-1.5 bg-accent-subtle text-amber-800 border border-accent-border rounded-lg text-sm font-medium">
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-text-muted">No skills extracted yet.</p>
                            )}
                        </motion.div>

                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                            className="card flex flex-col justify-center items-center text-center py-6">
                            <Activity size={32} className="text-text-muted mb-3" />
                            <h3 className="text-2xl font-bold text-text-primary">{uploadData.reduce((acc, d) => acc + d.uploads, 0)}</h3>
                            <p className="text-sm text-text-secondary">Uploads in 6 months</p>
                        </motion.div>
                    </div>

                    {/* Recent Analyses Timeline */}
                    <AnimatePresence>
                        {recentAnalyses.length > 0 && (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                                className="card">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold text-text-primary">Recent Analyses</h2>
                                    <span className="text-xs text-text-muted bg-gray-100 px-2 py-1 rounded-md border border-gray-200">
                                        {recentAnalyses.length} recent
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {recentAnalyses.map((a, idx) => {
                                        const score = a.openAIResult?.atsScore ?? 0;
                                        const scoreClass = score >= 70 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-red-400';
                                        return (
                                            <motion.button key={a._id}
                                                initial={{ opacity: 0, x: -16 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.45 + idx * 0.05, type: 'spring', stiffness: 300, damping: 24 }}
                                                whileHover={{ x: 4 }}
                                                onClick={() => navigate(`/analysis/${a.resume._id}`)}
                                                className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition-all group text-left border border-transparent hover:border-gray-200">
                                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20">
                                                    <FileText size={18} className="text-primary" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-text-primary truncate">{a.resume?.title ?? 'Resume'}</p>
                                                    <p className="text-xs text-text-secondary">{new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="text-right">
                                                        <span className={`text-sm font-bold ${scoreClass}`}>ATS {score}</span>
                                                        <p className="text-xs text-text-muted">/ 100</p>
                                                    </div>
                                                    <ChevronRight size={16} className="text-text-muted group-hover:text-text-primary transition-colors" />
                                                </div>
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Right Column (Narrower) */}
                <div className="space-y-6">

                    {/* Career Readiness Score */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                        className="card bg-gradient-to-br from-[#111827] to-[#1F2937] text-white border-0">
                        <h2 className="text-lg font-semibold text-white/90 mb-6 flex items-center gap-2">
                            <Target size={18} className="text-[#F59E0B]" /> Readiness Score
                        </h2>
                        <div className="flex flex-col items-center justify-center">
                            <div className="relative flex items-center justify-center w-32 h-32 mb-4">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="#F59E0B" strokeWidth="8"
                                        strokeDasharray={`${careerReadiness * 2.827} 282.7`} strokeLinecap="round"
                                        className="transition-all duration-1000 ease-out" />
                                </svg>
                                <div className="absolute flex flex-col items-center justify-center">
                                    <span className="text-4xl font-black tabular-nums">{careerReadiness}</span>
                                    <span className="text-[10px] text-white/60 uppercase tracking-widest font-bold">/ 100</span>
                                </div>
                            </div>
                            <p className="text-sm text-white/80 text-center max-w-[200px]">
                                Your overall market readiness based on profile strength and ATS match.
                            </p>
                        </div>
                    </motion.div>

                    {/* Job Match Highlights */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                        className="card bg-accent-subtle border-accent-border">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                                    <Briefcase size={18} className="text-accent-heavy" /> Job Matches
                                </h2>
                                <p className="text-xs text-text-secondary mt-1">Found 2 new matches today</p>
                            </div>
                            <span className="px-2 py-1 bg-white border border-gray-200 rounded-md text-[10px] font-bold text-primary uppercase tracking-wider">New</span>
                        </div>
                        
                        <div className="space-y-3">
                            <div className="p-3 bg-white rounded-lg border border-gray-100 shadow-sm flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-bold text-text-primary">Senior Frontend Engineer</p>
                                    <p className="text-xs text-text-secondary">TechCorp Inc. • Remote</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-emerald-500 font-bold text-sm">92%</span>
                                    <p className="text-[10px] text-text-muted">Match</p>
                                </div>
                            </div>
                            <div className="p-3 bg-white rounded-lg border border-gray-100 shadow-sm flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-bold text-text-primary">Full Stack Developer</p>
                                    <p className="text-xs text-text-secondary">StartupX • Hybrid</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-emerald-500 font-bold text-sm">88%</span>
                                    <p className="text-[10px] text-text-muted">Match</p>
                                </div>
                            </div>
                        </div>
                        <button className="w-full mt-4 py-2 text-sm font-semibold text-primary hover:text-primary-dark transition-colors flex items-center justify-center gap-1">
                            Explore All Matches <ArrowUpRight size={14} />
                        </button>
                    </motion.div>

                    {/* Quick Actions */}
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                        className="card">
                        <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
                            <Zap size={18} className="text-primary" /> Quick Actions
                        </h2>
                        <div className="space-y-1">
                            <QuickAction icon={Upload} label="Upload Resume" desc="Start a new analysis"
                                color="bg-accent-subtle text-amber-700 border-accent-border"
                                onClick={() => navigate('/upload')} delay={0.4} />
                            <QuickAction icon={MessageSquare} label="Interview Coach" desc="Practice questions"
                                color="bg-gray-100 text-text-primary border-border"
                                onClick={() => navigate('/interview/select')} delay={0.45} />
                            <QuickAction icon={FileText} label="Cover Letter" desc="Generate a tailored letter"
                                color="bg-gray-100 text-text-primary border-border"
                                onClick={() => navigate('/cover-letter/select')} delay={0.5} />
                            <QuickAction icon={Bot} label="AI Coach Chat" desc="Get career advice"
                                color="bg-primary/5 text-primary border-primary/10"
                                onClick={() => navigate('/chat')} delay={0.55} />
                        </div>
                    </motion.div>

                </div>
            </div>

        </div>
    );
}
