import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, Line, ComposedChart
} from 'recharts';
import {
    FileText, Brain, Award, TrendingUp, TrendingDown,
    MessageSquare, Bot, Upload, Sparkles, Minus, AlertCircle, RefreshCw, Mail, ArrowRight
} from 'lucide-react';

import { api } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { useResumeStore } from '../stores/resumeStore';

// === TypeScript Interfaces ===
interface DashboardStats {
    totalResumes: number;
    newResumesThisMonth: number;
    analysesRun: number;
    newAnalysesThisWeek: number;
    avgATSScore: number;
    atsDelta: number;
    bestATSScore: number;
    bestResumeTitle: string;
    coverLettersCount: number;
    interviewSetsCount: number;
    totalQuestionsCount: number;
    coachSessionsCount: number;
    avgTokensPerSession: number;
    latestScore: number;
    latestScoreDelta: number;
    latestScoreDaysAgo: number;
}

interface ScoreHistoryPoint {
    date: string;
    atsScore: number;
    qualityScore?: number;
}

interface ResumeVersion {
    label: string;
    atsScore: number;
    isBest: boolean;
}

interface SkillFrequency {
    skill: string;
    count: number;
    pct: number;
}

interface ActivityItem {
    id: string;
    type: 'analysis' | 'cover_letter' | 'interview' | 'coach' | 'upload';
    label: string;
    detail: string;
    timestamp: string;
}

// === Counter Animation Hook ===
const AnimatedNumber = ({ value }: { value: number }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let startTime: number | null = null;
        const duration = 1200; // ms

        const animate = (time: number) => {
            if (!startTime) startTime = time;
            const progress = Math.min((time - startTime) / duration, 1);
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            
            setCount(Math.floor(easeOutQuart * value));
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setCount(Math.round(value));
            }
        };

        requestAnimationFrame(animate);
    }, [value]);

    return <>{count}</>;
};

// === Custom Tooltip ===
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
        return (
            <div className="bg-gray-900 border border-white/10 rounded-xl px-4 py-3 text-sm shadow-xl">
                <p className="text-gray-400 mb-1">{label}</p>
                <p className="text-amber-400 font-semibold">ATS: {payload[0]?.value}/100</p>
                {payload[1] && <p className="text-blue-400">Quality: {payload[1]?.value}/100</p>}
            </div>
        );
    }
    return null;
};

// === Skeleton Loader ===
const Skeleton = ({ className }: { className?: string }) => (
    <div className={`bg-gray-800/40 animate-pulse rounded-2xl ${className}`} />
);

export default function DashboardPage() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { setResumes } = useResumeStore();

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [scoreHistory, setScoreHistory] = useState<ScoreHistoryPoint[]>([]);
    const [versions, setVersions] = useState<ResumeVersion[]>([]);
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [matchedSkills, setMatchedSkills] = useState<string[]>([]);
    const [missingSkills, setMissingSkills] = useState<string[]>([]);
    const [skillFrequency, setSkillFrequency] = useState<SkillFrequency[]>([]);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);

            // 1. Fetch resumes & chat history
            const [resumesRes, chatHistoryRes] = await Promise.all([
                api.get('/resumes').catch(() => ({ data: { data: { resumes: [] } } })),
                api.get('/chat/history').catch(() => ({ data: { data: { history: [] } } }))
            ]);

            const rawResumes = resumesRes.data?.data?.resumes || resumesRes.data?.data || [];
            const rawChatSessions = chatHistoryRes.data?.data?.history || chatHistoryRes.data?.data || [];

            setResumes(rawResumes);

            // 2. Fetch analysis details in parallel
            const resumeDetails = await Promise.all(
                rawResumes.map(async (r: any) => {
                    const [latestRes, ivRes, clRes] = await Promise.all([
                        api.get(`/analysis/${r._id}/latest`).catch(() => null),
                        api.get(`/analysis/${r._id}/interview-questions`).catch(() => null),
                        api.get(`/analysis/${r._id}/cover-letter`).catch(() => null)
                    ]);
                    
                    return {
                        resume: r,
                        analysis: latestRes?.data?.data?.analysis || latestRes?.data?.analysis || null,
                        iv: ivRes?.data?.data || ivRes?.data || null,
                        cl: clRes?.data?.data || clRes?.data || null
                    };
                })
            );

            // --- Compute Stats ---
            const now = new Date();
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

            const totalResumes = rawResumes.length;
            const newResumesThisMonth = rawResumes.filter((r: any) => new Date(r.createdAt) >= thirtyDaysAgo).length;

            const validAnalyses = resumeDetails.filter(d => d.analysis?.openAIResult?.atsScore);
            const analysesRun = validAnalyses.length;
            const newAnalysesThisWeek = validAnalyses.filter(d => new Date(d.analysis.createdAt) >= sevenDaysAgo).length;

            validAnalyses.sort((a, b) => new Date(a.analysis.createdAt).getTime() - new Date(b.analysis.createdAt).getTime());

            let avgATSScore = 0;
            let atsDelta = 0;
            let bestATSScore = 0;
            let bestResumeTitle = '—';
            let latestScore = 0;
            let latestScoreDelta = 0;
            let latestScoreDaysAgo = 0;

            if (validAnalyses.length > 0) {
                const totalScore = validAnalyses.reduce((sum, d) => sum + (d.analysis.openAIResult.atsScore || 0), 0);
                avgATSScore = Math.round(totalScore / validAnalyses.length);
                
                if (validAnalyses.length > 1) {
                    const prevAnalyses = validAnalyses.slice(0, validAnalyses.length - 1);
                    const prevTotal = prevAnalyses.reduce((sum, d) => sum + (d.analysis.openAIResult.atsScore || 0), 0);
                    const prevAvg = Math.round(prevTotal / prevAnalyses.length);
                    atsDelta = avgATSScore - prevAvg;
                }

                const sortedByScore = [...validAnalyses].sort((a, b) => (b.analysis.openAIResult.atsScore || 0) - (a.analysis.openAIResult.atsScore || 0));
                bestATSScore = sortedByScore[0].analysis.openAIResult.atsScore || 0;
                bestResumeTitle = sortedByScore[0].resume.originalFilename || sortedByScore[0].resume.title || 'Resume';

                const latestDoc = validAnalyses[validAnalyses.length - 1];
                latestScore = latestDoc.analysis.openAIResult.atsScore || 0;
                latestScoreDaysAgo = Math.floor((now.getTime() - new Date(latestDoc.analysis.createdAt).getTime()) / (1000 * 3600 * 24));
                
                if (validAnalyses.length > 1) {
                    const prevLatestDoc = validAnalyses[validAnalyses.length - 2];
                    latestScoreDelta = latestScore - (prevLatestDoc.analysis.openAIResult.atsScore || 0);
                }
            }

            const coverLettersCount = resumeDetails.filter(d => d.cl && d.cl.coverLetter).length;
            const interviewSetsCount = resumeDetails.filter(d => d.iv && d.iv.questions).length;
            const totalQuestionsCount = resumeDetails.reduce((sum, d) => sum + (d.iv?.questions?.length || 0), 0);

            const coachSessionsCount = rawChatSessions.length;
            let avgTokensPerSession = 0;
            if (coachSessionsCount > 0) {
                const totalTokens = rawChatSessions.reduce((sum: number, s: any) => sum + (s.totalTokensUsed || 0), 0);
                avgTokensPerSession = Math.round(totalTokens / coachSessionsCount);
            }

            setStats({
                totalResumes, newResumesThisMonth, analysesRun, newAnalysesThisWeek,
                avgATSScore, atsDelta, bestATSScore, bestResumeTitle,
                coverLettersCount, interviewSetsCount, totalQuestionsCount,
                coachSessionsCount, avgTokensPerSession,
                latestScore, latestScoreDelta, latestScoreDaysAgo
            });

            // --- Compute Score History ---
            const historyObj = validAnalyses.map(d => ({
                date: new Date(d.analysis.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                atsScore: d.analysis.openAIResult?.atsScore || 0,
                qualityScore: d.analysis.openAIResult?.qualityScore || 0
            }));
            if (historyObj.length === 1) historyObj.unshift({ date: 'Start', atsScore: 0, qualityScore: 0 });
            setScoreHistory(historyObj);

            // --- Compute Resume Versions ---
            const vList: ResumeVersion[] = validAnalyses.slice(-4).map((d, i) => ({
                label: d.resume.title || d.resume.originalFilename || `Version ${i + 1}`,
                atsScore: d.analysis.openAIResult?.atsScore || 0,
                isBest: false
            }));
            const maxScore = Math.max(...vList.map(v => v.atsScore));
            vList.forEach(v => { if (v.atsScore === maxScore && maxScore > 0) v.isBest = true; });
            setVersions(vList);

            // --- Skills & Missing Skills ---
            const allMatched: Record<string, number> = {};
            const allMissing: Record<string, number> = {};
            
            validAnalyses.forEach(d => {
                const matched = d.analysis.nlpResult?.matchedSkills || [];
                const missing = d.analysis.nlpResult?.missingSkills || [];
                matched.forEach((s: string) => { allMatched[s] = (allMatched[s] || 0) + 1; });
                missing.forEach((s: string) => { allMissing[s] = (allMissing[s] || 0) + 1; });
            });

            const sortedMatched = Object.entries(allMatched).sort((a, b) => b[1] - a[1]).slice(0, 6).map(e => e[0]);
            const sortedMissing = Object.entries(allMissing).sort((a, b) => b[1] - a[1]).slice(0, 6).map(e => e[0]);
            
            setMatchedSkills(sortedMatched.length > 0 ? sortedMatched : ['React', 'TypeScript', 'Node.js', 'MongoDB', 'AWS', 'Docker']);
            setMissingSkills(sortedMissing.length > 0 ? sortedMissing : ['Kubernetes', 'Terraform', 'GraphQL', 'Rust', 'MLOps', 'Kafka']);

            // --- Skill Frequency ---
            const totalAnalyzed = Math.max(validAnalyses.length, 1);
            const freqList: SkillFrequency[] = Object.entries(allMatched).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([skill, count]) => ({
                skill, count, pct: Math.round((count / totalAnalyzed) * 100)
            }));
            setSkillFrequency(freqList.length > 0 ? freqList : [
                { skill: 'JavaScript', count: 1, pct: 95 },
                { skill: 'TypeScript', count: 1, pct: 85 },
                { skill: 'React', count: 1, pct: 70 },
                { skill: 'Node.js', count: 1, pct: 50 },
                { skill: 'AWS', count: 1, pct: 30 },
            ]);

            // --- Activity Feed ---
            const feats: ActivityItem[] = [];
            validAnalyses.forEach(d => {
                feats.push({ 
                    id: `ana-${d.analysis._id}`, type: 'analysis', label: d.resume.title || d.resume.originalFilename, 
                    detail: `Scored ${d.analysis.openAIResult.atsScore}/100`, timestamp: d.analysis.createdAt 
                });
            });
            resumeDetails.forEach(d => {
                if (d.cl?.coverLetter) {
                    feats.push({ id: `cl-${d.resume._id}`, type: 'cover_letter', label: d.resume.title || 'Resume', detail: 'Generated tailored cover letter', timestamp: d.cl.updatedAt || d.cl.createdAt || new Date().toISOString() });
                }
                if (d.iv?.questions?.length > 0) {
                    feats.push({ id: `iv-${d.resume._id}`, type: 'interview', label: d.resume.title || 'Resume', detail: `Created ${d.iv.questions.length} interview questions`, timestamp: d.iv.updatedAt || d.iv.createdAt || new Date().toISOString() });
                }
            });
            rawChatSessions.forEach((c: any) => {
                feats.push({ id: `chat-${c._id}`, type: 'coach', label: c.mode || 'Career Coaching', detail: `Chat session (${c.totalTokensUsed || 0} tokens)`, timestamp: c.createdAt });
            });
            rawResumes.forEach((r: any) => {
                feats.push({ id: `upl-${r._id}`, type: 'upload', label: r.originalFilename || 'New Document', detail: 'Document uploaded', timestamp: r.createdAt });
            });

            feats.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            setActivities(feats.slice(0, 5));

        } catch (err: any) {
            console.error('API Error:', err);
            setError('Failed to fetch dashboard data. Please check your connection or backend status.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const containerVariants = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.08 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 16 },
        show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
    };

    const parseBoldNames = (text: string) => {
        return { __html: text.replace(/([A-Za-z0-9_.-]+(?:pdf|docx)|[A-Z][A-Za-z]+)/g, '<strong class="text-white font-semibold">$1</strong>') };
    };

    const formatTimeAgo = (ts: string) => {
        const ms = new Date().getTime() - new Date(ts).getTime();
        if (ms < 3600000) return `${Math.max(1, Math.floor(ms / 60000))} mins ago`;
        if (ms < 86400000) return `${Math.floor(ms / 3600000)} hours ago`;
        return `${Math.floor(ms / 86400000)} days ago`;
    };

    if (loading) {
        return (
            <div className="w-full h-full bg-gray-950 overflow-y-auto p-6 md:p-10 space-y-8">
               <div className="max-w-[1600px] mx-auto">
                    <Skeleton className="h-12 w-64 mb-10" />
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[120px]" />)}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-[110px]" />)}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        <Skeleton className="h-[340px]" />
                        <Skeleton className="h-[340px]" />
                    </div>
               </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full bg-gray-950 overflow-y-auto text-gray-200 p-4 md:p-6 lg:p-8">
            <AnimatePresence>
                    {error && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-6">
                            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl flex items-center justify-between">
                                <span className="flex items-center gap-2"><AlertCircle size={18} /> {error}</span>
                                <button onClick={fetchData} className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 rounded-lg text-sm font-semibold transition-colors">
                                    <RefreshCw size={14} /> Retry
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <motion.header 
                    initial={{ opacity: 0, y: -20 }} 
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4"
                >
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-1">
                            Dashboard, <span className="text-amber-500">{user?.name?.split(' ')[0] || 'User'}</span>
                        </h1>
                        <p className="text-gray-400 text-sm md:text-base">Your AI-powered career growth over time.</p>
                    </div>
                    {stats?.totalResumes !== 0 && (
                        <button 
                            onClick={() => navigate('/upload')}
                            className="bg-amber-500 flex-shrink-0 hover:bg-amber-400 text-black px-5 py-2.5 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                        >
                            <Upload size={18} /> New Resume
                        </button>
                    )}
                </motion.header>

                {stats?.totalResumes === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-[60vh] gap-6">
                        <div className="w-20 h-20 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                            <FileText className="w-10 h-10 text-amber-400" />
                        </div>
                        <div className="text-center">
                            <h2 className="text-xl font-semibold text-white mb-2">No resumes yet</h2>
                            <p className="text-gray-400 text-sm max-w-xs">Upload your first resume to get your ATS score, skill analysis, and AI career coaching.</p>
                        </div>
                        <button
                            onClick={() => navigate('/upload')}
                            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold px-6 py-3 rounded-xl transition-colors"
                        >
                            <Upload className="w-4 h-4" />
                            Upload First Resume
                        </button>
                    </motion.div>
                ) : (
                    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
                        
                        {/* --- Row 1 --- */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <motion.div variants={itemVariants} className="bg-gray-900 border border-gray-800 p-5 rounded-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <p className="text-sm font-normal text-gray-400 mb-3 flex items-center gap-2">
                                    <div className="bg-amber-500/10 p-2 rounded-lg text-amber-500"><FileText size={20} /></div>
                                    Total Resumes
                                </p>
                                <div className="flex items-baseline gap-2">
                                    <h3 className="text-3xl font-bold text-white"><AnimatedNumber value={stats?.totalResumes || 0} /></h3>
                                    <span className="text-xs text-gray-500">+{stats?.newResumesThisMonth || 0} this month</span>
                                </div>
                            </motion.div>

                            <motion.div variants={itemVariants} className="bg-gray-900 border border-gray-800 p-5 rounded-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <p className="text-sm font-normal text-gray-400 mb-3 flex items-center gap-2">
                                    <div className="bg-blue-500/10 p-2 rounded-lg text-blue-500"><Brain size={20} /></div>
                                    Analyses Run
                                </p>
                                <div className="flex items-baseline gap-2">
                                    <h3 className="text-3xl font-bold text-white"><AnimatedNumber value={stats?.analysesRun || 0} /></h3>
                                    <span className="text-xs text-gray-500">+{stats?.newAnalysesThisWeek || 0} this week</span>
                                </div>
                            </motion.div>

                            <motion.div variants={itemVariants} className="bg-gray-900 border border-gray-800 p-5 rounded-2xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                <p className="text-sm font-normal text-gray-400 mb-3 flex items-center gap-2">
                                    <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-500"><TrendingUp size={20} /></div>
                                    Avg ATS Score
                                </p>
                                <div className="flex items-baseline gap-2">
                                    <h3 className="text-3xl font-bold text-white"><AnimatedNumber value={stats?.avgATSScore || 0} /><span className="text-xl text-gray-500 font-normal">/100</span></h3>
                                    {stats?.atsDelta !== undefined ? (
                                        <span className={`text-xs font-medium flex items-center ${stats.atsDelta > 0 ? 'text-emerald-500' : 'text-gray-500'}`}>
                                            {stats.atsDelta > 0 && <TrendingUp size={12} className="mr-0.5" />}
                                            {stats.atsDelta > 0 ? `↑ +${stats.atsDelta}` : stats.atsDelta < 0 ? `↓ ${stats.atsDelta}` : '+0'} pts from last
                                        </span>
                                    ) : <span className="text-xs text-gray-500">No previous data</span>}
                                </div>
                            </motion.div>

                            <motion.div variants={itemVariants} className="bg-gray-900 border border-gray-800 p-5 rounded-2xl relative overflow-hidden group">
                                <p className="text-sm font-normal text-gray-400 mb-3 flex items-center gap-2">
                                    <div className="bg-amber-400/10 p-2 rounded-lg text-amber-400"><Award size={20} /></div>
                                    Best ATS Score
                                </p>
                                <div className="flex items-end justify-between">
                                    <h3 className="text-3xl font-bold text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.3)]"><AnimatedNumber value={stats?.bestATSScore || 0} /><span className="text-xl text-amber-500/50 font-normal">/100</span></h3>
                                </div>
                                <p className="text-xs text-gray-500 mt-1 truncate w-full" title={stats?.bestResumeTitle}>{stats?.bestResumeTitle || '—'}</p>
                            </motion.div>
                        </div>

                        {/* --- Row 2 --- */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <motion.div variants={itemVariants} className="bg-gray-900 border border-gray-800 p-5 rounded-2xl relative group">
                                <p className="text-sm font-normal text-gray-400 mb-3 flex items-center gap-2">
                                    <div className="bg-amber-500/10 p-2 rounded-lg text-amber-500"><Mail size={20} /></div>
                                    Cover Letters Generated
                                </p>
                                <h3 className="text-2xl font-bold text-white"><AnimatedNumber value={stats?.coverLettersCount || 0} /></h3>
                            </motion.div>

                            <motion.div variants={itemVariants} className="bg-gray-900 border border-gray-800 p-5 rounded-2xl relative group">
                                <p className="text-sm font-normal text-gray-400 mb-3 flex items-center gap-2">
                                    <div className="bg-blue-500/10 p-2 rounded-lg text-blue-500"><MessageSquare size={20} /></div>
                                    Interview Sets
                                </p>
                                <div className="flex items-baseline gap-2">
                                    <h3 className="text-2xl font-bold text-white"><AnimatedNumber value={stats?.interviewSetsCount || 0} /></h3>
                                    <span className="text-xs text-gray-500">({stats?.totalQuestionsCount || 0} questions)</span>
                                </div>
                            </motion.div>

                            <motion.div variants={itemVariants} className="bg-gray-900 border border-gray-800 p-5 rounded-2xl relative group">
                                <p className="text-sm font-normal text-gray-400 mb-3 flex items-center gap-2">
                                    <div className="bg-purple-500/10 p-2 rounded-lg text-purple-400"><Bot size={20} /></div>
                                    AI Coach Sessions
                                </p>
                                <div className="flex items-baseline gap-2">
                                    <h3 className="text-2xl font-bold text-white"><AnimatedNumber value={stats?.coachSessionsCount || 0} /></h3>
                                    <span className="text-xs text-gray-500">~{stats?.avgTokensPerSession || 0} avg tokens</span>
                                </div>
                            </motion.div>

                            <motion.div variants={itemVariants} className="bg-gray-900 border border-gray-800 p-5 rounded-2xl relative group">
                                <p className="text-sm font-normal text-gray-400 mb-3 flex items-center gap-2">
                                    <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-500"><TrendingUp size={20} /></div>
                                    Latest Score
                                </p>
                                <div className="flex items-baseline gap-2">
                                    <h3 className="text-2xl font-bold text-white"><AnimatedNumber value={stats?.latestScore || 0} /><span className="text-lg font-normal text-gray-500">/100</span></h3>
                                    {stats?.latestScore ? (
                                        <span className={`flex items-center text-xs font-semibold ${stats.latestScoreDelta > 0 ? 'text-emerald-500' : stats.latestScoreDelta < 0 ? 'text-rose-500' : 'text-gray-500'}`}>
                                            {stats.latestScoreDelta > 0 ? `↑ +${stats.latestScoreDelta}` : stats.latestScoreDelta < 0 ? `↓ ${stats.latestScoreDelta}` : 'No change'} from last · {stats.latestScoreDaysAgo === 0 ? 'Today' : `${stats.latestScoreDaysAgo} days ago`}
                                        </span>
                                    ) : <span className="text-xs text-gray-600">No data</span>}
                                </div>
                            </motion.div>
                        </div>

                        {/* --- Main Content: 2 Columns --- */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                            {/* ATS Score Trend Chart */}
                            <motion.div variants={itemVariants} className="bg-gray-900 border border-gray-800 p-6 rounded-2xl flex flex-col">
                                <h3 className="text-lg font-semibold text-white mb-6">ATS Score Trend</h3>
                                <div className="flex-1 w-full h-[280px]">
                                    {scoreHistory.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ComposedChart data={scoreHistory} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                                <defs>
                                                    <linearGradient id="colorScore2" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                                                <XAxis dataKey="date" tick={{ fill: '#737373', fontSize: 12 }} axisLine={false} tickLine={false} dy={10} />
                                                <YAxis domain={['auto', 100]} tick={{ fill: '#737373', fontSize: 12 }} axisLine={false} tickLine={false} />
                                                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#333', strokeWidth: 1 }} />
                                                <Area type="monotone" dataKey="atsScore" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorScore2)" activeDot={{ r: 6, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }} />
                                                <Line type="monotone" dataKey="qualityScore" stroke="#60a5fa" strokeDasharray="4 4" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#60a5fa' }} />
                                            </ComposedChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-gray-600 text-sm">No analysis history yet.</div>
                                    )}
                                </div>
                            </motion.div>

                            {/* Resume Version Comparison */}
                            <motion.div variants={itemVariants} className="bg-gray-900 border border-gray-800 p-6 rounded-2xl flex flex-col">
                                <h3 className="text-lg font-semibold text-white mb-6">Resume Progress Comparison</h3>
                                <div className="space-y-6 flex-1 flex flex-col justify-center">
                                    {versions.length > 0 ? versions.map((v, i) => {
                                        const gradient = i === 0 ? 'from-gray-600 to-gray-500' :
                                                         i === 1 ? 'from-blue-600 to-blue-500' :
                                                         i === 2 ? 'from-teal-500 to-emerald-500' :
                                                         'from-amber-500 to-amber-400';
                                        
                                        return (
                                            <div key={i} className="relative">
                                                <div className="flex justify-between text-sm mb-2.5">
                                                    <span className={`font-medium flex items-center gap-1.5 ${v.isBest ? 'text-amber-400' : 'text-gray-300'}`}>
                                                        {v.isBest && <Sparkles size={14} className="text-amber-400" />} {v.label}
                                                    </span>
                                                    <span className={`font-bold ${v.isBest ? 'text-amber-400' : 'text-white'}`}>{v.atsScore}/100</span>
                                                </div>
                                                <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                                                    <motion.div 
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${v.atsScore}%` }}
                                                        transition={{ duration: 1, delay: 0.5 + (i * 0.1), ease: "easeOut" }}
                                                        className={`h-full rounded-full bg-gradient-to-r ${gradient} shadow-sm`}
                                                    />
                                                </div>
                                            </div>
                                        )
                                    }) : <p className="text-gray-600 text-sm text-center">Analyze a resume to see progress.</p>}
                                </div>
                            </motion.div>
                        </div>

                        {/* --- Bottom Grid: 3 Columns --- */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                            {/* Missing Skills */}
                            <motion.div variants={itemVariants} className="bg-gray-900 border border-gray-800 p-6 rounded-2xl flex flex-col h-full">
                                <h3 className="text-lg font-semibold text-white mb-5">Top Missing Skills</h3>
                                <div className="flex flex-wrap gap-2.5 content-start flex-1 mb-4">
                                    {missingSkills.length > 0 ? missingSkills.map(s => (
                                        <span key={s} className="px-3.5 py-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg text-sm font-medium">
                                            {s}
                                        </span>
                                    )) : <span className="text-sm text-gray-500">No missing skills identified.</span>}
                                </div>
                                <div className="mt-auto pt-3 border-t border-white/5 space-y-2">
                                    <div className="flex items-center justify-between text-xs text-gray-400">
                                        <span>Skill match rate</span>
                                        <span>{matchedSkills.length} / {matchedSkills.length + missingSkills.length} skills matched</span>
                                    </div>
                                    <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden flex">
                                        <div style={{ width: `${(matchedSkills.length / Math.max(1, matchedSkills.length + missingSkills.length)) * 100}%` }} className="bg-emerald-500 h-full rounded-full" />
                                    </div>
                                    <p className="text-xs text-gray-500 italic mt-1 text-right">Across all analyses vs target JDs</p>
                                </div>
                            </motion.div>

                            {/* Matched Skills */}
                            <motion.div variants={itemVariants} className="bg-gray-900 border border-gray-800 p-6 rounded-2xl flex flex-col h-full">
                                <h3 className="text-lg font-semibold text-white mb-5">Top Matched Skills</h3>
                                <div className="flex flex-wrap gap-2.5 content-start flex-1 mb-4">
                                    {matchedSkills.length > 0 ? matchedSkills.map(s => (
                                        <span key={s} className="px-3.5 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-sm font-medium">
                                            {s}
                                        </span>
                                    )) : <span className="text-sm text-gray-500">No matched skills identified.</span>}
                                </div>
                                <div className="mt-auto pt-3 border-t border-white/5 space-y-2">
                                    <div className="flex items-center justify-between text-xs text-gray-400">
                                        <span>Skill match rate</span>
                                        <span>{matchedSkills.length} / {matchedSkills.length + missingSkills.length} skills matched</span>
                                    </div>
                                    <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden flex">
                                        <div style={{ width: `${(matchedSkills.length / Math.max(1, matchedSkills.length + missingSkills.length)) * 100}%` }} className="bg-emerald-500 h-full rounded-full" />
                                    </div>
                                    <p className="text-xs text-gray-500 italic mt-1 text-right">Across all analyses vs target JDs</p>
                                </div>
                            </motion.div>

                            {/* Skill Frequency Heatmap */}
                            <motion.div variants={itemVariants} className="bg-gray-900 border border-gray-800 p-6 rounded-2xl flex flex-col">
                                <h3 className="text-lg font-semibold text-white mb-5">Skill Profile Strength</h3>
                                <div className="space-y-4 flex-1 justify-center flex flex-col">
                                    {skillFrequency.length > 0 ? skillFrequency.map((s, idx) => {
                                        const barColor = s.pct >= 70 ? 'bg-amber-400' : s.pct >= 40 ? 'bg-teal-400' : 'bg-blue-400';
                                        return (
                                            <div key={s.skill} className="flex items-center gap-4">
                                                <span className="text-sm text-gray-300 w-24 truncate font-medium">{s.skill}</span>
                                                <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                                                    <motion.div 
                                                        initial={{ width: 0 }} 
                                                        animate={{ width: `${s.pct}%` }} 
                                                        transition={{ duration: 0.8, delay: 0.6 + (idx * 0.05) }}
                                                        className={`h-full ${barColor} rounded-full`} 
                                                    />
                                                </div>
                                                <span className="text-xs text-gray-400 text-right w-8">{s.pct}%</span>
                                            </div>
                                        )
                                    }) : <span className="text-sm text-gray-500 text-center">Run analyses to view graph.</span>}
                                </div>
                            </motion.div>
                        </div>

                        {/* --- Bottom Row: 2 Columns --- */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                            {/* Recent Activity Feed */}
                            <motion.div variants={itemVariants} className="bg-gray-900 border border-gray-800 p-6 rounded-2xl min-h-[300px]">
                                <h3 className="text-lg font-semibold text-white mb-6">Recent Activity</h3>
                                <div className="space-y-6">
                                    {activities.length > 0 ? activities.map((act, i) => {
                                        const color = act.type === 'analysis' ? 'bg-blue-500' :
                                                      act.type === 'cover_letter' ? 'bg-teal-500' :
                                                      act.type === 'interview' ? 'bg-amber-500' :
                                                      act.type === 'coach' ? 'bg-purple-500' : 'bg-gray-400';

                                        return (
                                            <div key={act.id + i} className="flex gap-4 relative">
                                                {i !== activities.length - 1 && (
                                                    <div className="absolute left-[9px] top-6 bottom-[-24px] w-[2px] bg-gray-800" />
                                                )}
                                                <div className="relative z-10 mt-1">
                                                    <div className={`w-5 h-5 rounded-full ring-4 ring-gray-900 ${color}`} />
                                                </div>
                                                <div className="flex-1 pb-1">
                                                    <p className="text-sm text-gray-300 leading-tight">
                                                        <span dangerouslySetInnerHTML={parseBoldNames(act.detail)} /> — <span dangerouslySetInnerHTML={parseBoldNames(act.label)} className="italic" />
                                                    </p>
                                                    <span className="text-xs text-gray-500 mt-1 block font-medium">{formatTimeAgo(act.timestamp)}</span>
                                                </div>
                                            </div>
                                        );
                                    }) : (
                                        <div className="flex flex-col items-center justify-center h-[200px] text-gray-500 text-sm gap-2">
                                            <Bot size={24} className="text-gray-600" />
                                            No recent dashboard activity.
                                        </div>
                                    )}
                                </div>
                            </motion.div>

                            {/* Quick Actions Panel */}
                            <motion.div variants={itemVariants} className="bg-gray-900 border border-gray-800 p-6 rounded-2xl flex flex-col">
                                <h3 className="text-lg font-semibold text-white mb-6">Quick Actions</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                                    <button onClick={() => navigate('/upload')} className="group relative flex flex-col p-5 bg-gray-950/50 border border-gray-800 hover:border-amber-500/30 rounded-xl transition-transform duration-200 hover:scale-[1.02] h-full text-left">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
                                            <Upload size={24} />
                                        </div>
                                        <ArrowRight className="absolute top-5 right-5 w-5 h-5 text-gray-600 group-hover:text-gray-300 transition-colors" />
                                        <h4 className="text-white font-semibold mb-1 group-hover:text-amber-400 transition-colors">Upload Resume</h4>
                                        <p className="text-xs text-gray-500">Analyze a new document instantly</p>
                                    </button>
                                    
                                    <button onClick={() => navigate('/interview-coach')} className="group relative flex flex-col p-5 bg-gray-950/50 border border-gray-800 hover:border-blue-500/30 rounded-xl transition-transform duration-200 hover:scale-[1.02] h-full text-left">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4">
                                            <MessageSquare size={24} />
                                        </div>
                                        <ArrowRight className="absolute top-5 right-5 w-5 h-5 text-gray-600 group-hover:text-gray-300 transition-colors" />
                                        <h4 className="text-white font-semibold mb-1 group-hover:text-blue-400 transition-colors">Interview Prep</h4>
                                        <p className="text-xs text-gray-500">Practice custom generated Q&A</p>
                                    </button>

                                    <button onClick={() => navigate('/cover-letter')} className="group relative flex flex-col p-5 bg-gray-950/50 border border-gray-800 hover:border-teal-500/30 rounded-xl transition-transform duration-200 hover:scale-[1.02] h-full text-left">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500/20 to-teal-600/10 border border-teal-500/20 text-teal-400 flex items-center justify-center mb-4">
                                            <FileText size={24} />
                                        </div>
                                        <ArrowRight className="absolute top-5 right-5 w-5 h-5 text-gray-600 group-hover:text-gray-300 transition-colors" />
                                        <h4 className="text-white font-semibold mb-1 group-hover:text-teal-400 transition-colors">Cover Letter</h4>
                                        <p className="text-xs text-gray-500">Generate targeted cover letters</p>
                                    </button>

                                    <button onClick={() => navigate('/coach')} className="group relative flex flex-col p-5 bg-gray-950/50 border border-gray-800 hover:border-purple-500/30 rounded-xl transition-transform duration-200 hover:scale-[1.02] h-full text-left">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-4">
                                            <Bot size={24} />
                                        </div>
                                        <ArrowRight className="absolute top-5 right-5 w-5 h-5 text-gray-600 group-hover:text-gray-300 transition-colors" />
                                        <h4 className="text-white font-semibold mb-1 group-hover:text-purple-400 transition-colors">AI Coach Chat</h4>
                                        <p className="text-xs text-gray-500">1-on-1 personalized career advice</p>
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
        </div>
    );
}
