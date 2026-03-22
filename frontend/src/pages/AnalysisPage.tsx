import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';
import { CheckCircle, XCircle, AlertTriangle, ArrowRight, MessageSquare, FileText, Map, Lightbulb, Target, Sparkles, Award, Clock } from 'lucide-react';
import { analysisApi, resumeApi } from '../lib/api';

interface Analysis {
    nlpResult?: { extractedSkills: string[]; softSkills: string[]; experienceYears: number; similarityScore: number; missingSkills: string[]; matchedSkills: string[] };
    openAIResult?: { atsScore: number; qualityScore: number; overallScore: number; strengths: string[]; weaknesses: string[]; improvements: string[]; summary: string; bulletImpactScores: Array<{ bullet: string; score: number; rewritten: string }> };
}

const ScoreGauge = ({ score, label, color, icon: Icon, delay = 0 }: { score: number; label: string; color: string; icon: any; delay?: number }) => {
    const data = [{ name: label, value: score, fill: color }];
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay, duration: 0.5, ease: "easeOut" }}
            className="flex flex-col items-center justify-center p-6 bg-background-panel rounded-xl border border-border hover:border-gray-200 transition-all relative overflow-hidden group shadow-sm"
        >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Icon size={48} style={{ color }} />
            </div>

            <div style={{ width: 140, height: 140, position: 'relative' }} className="mx-auto z-10">
                <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart innerRadius="70%" outerRadius="100%" data={data} startAngle={90} endAngle={-270}>
                        <RadialBar dataKey="value" cornerRadius={10} background={{ fill: '#F3F4F6' }} />
                    </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.span
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: delay + 0.2 }}
                        className="text-4xl font-bold text-accent"
                    >
                        {score}
                    </motion.span>
                    <span className="text-xs text-text-muted font-bold tracking-widest uppercase mt-0.5">Score</span>
                </div>
            </div>
            <div className="flex items-center gap-2 mt-5 z-10 w-full justify-center border-t border-border pt-4">
                <Icon size={16} style={{ color }} />
                <p className="text-sm font-bold text-text-primary uppercase tracking-wider">{label}</p>
            </div>
        </motion.div>
    );
};

export default function AnalysisPage() {
    const { resumeId } = useParams<{ resumeId: string }>();
    const navigate = useNavigate();
    const [analysis, setAnalysis] = useState<Analysis | null>(null);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<string>('processing');
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (!resumeId) return;

        const loadAnalysis = async () => {
            try {
                // First check status
                const { data: statusData } = await resumeApi.getStatus(resumeId);
                const currentStatus = statusData.data.status as string;
                setStatus(currentStatus);

                if (currentStatus === 'analyzed') {
                    const { data } = await analysisApi.getLatest(resumeId);
                    setAnalysis(data.data.analysis);
                    // Stop polling if we were
                    if (pollingRef.current) clearInterval(pollingRef.current);
                } else if (currentStatus === 'processing') {
                    // Poll every 4 seconds until done
                    if (!pollingRef.current) {
                        pollingRef.current = setInterval(async () => {
                            try {
                                const { data: s } = await resumeApi.getStatus(resumeId);
                                setStatus(s.data.status);
                                if (s.data.status === 'analyzed') {
                                    clearInterval(pollingRef.current!);
                                    pollingRef.current = null;
                                    const { data } = await analysisApi.getLatest(resumeId);
                                    setAnalysis(data.data.analysis);
                                }
                            } catch { /* ignore polling errors */ }
                        }, 4000);
                    }
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        loadAnalysis();
        return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
    }, [resumeId]);

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-100px)] gap-6">
            <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin"></div>
                <div className="absolute inset-2 rounded-full border-r-2 border-accent animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                <div className="absolute inset-4 flex items-center justify-center">
                    <Sparkles className="text-primary animate-pulse" size={20} />
                </div>
            </div>
            <p className="text-text-secondary font-medium animate-pulse">Running advanced AI analysis...</p>
        </div>
    );

    if (!analysis) return (
        <div className="card text-center max-w-lg mx-auto mt-20 p-12">
            {status === 'processing' ? (
                <>
                    <div className="relative w-20 h-20 mx-auto mb-6">
                        <div className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin"></div>
                        <div className="absolute inset-2 rounded-full border-r-2 border-accent animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Clock className="text-primary" size={28} />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-text-primary mb-2">AI Analysis Running</h2>
                    <p className="text-text-secondary mb-4">Your resume is being processed in the background. This page will update automatically.</p>
                    <div className="mt-4 space-y-2 text-sm text-text-muted">
                        {['Extracting text & skills…', 'Running NLP analysis…', 'Generating AI insights…'].map((s, i) => (
                            <motion.p key={s} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.6 }}>✦ {s}</motion.p>
                        ))}
                    </div>
                </>
            ) : status === 'error' ? (
                <>
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20 mx-auto mb-6">
                        <AlertTriangle size={40} className="text-red-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-text-primary mb-2">Analysis Failed</h2>
                    <p className="text-text-secondary mb-8">The AI worker encountered an error. Please try uploading again.</p>
                    <button onClick={() => navigate('/upload')} className="btn-primary w-full justify-center py-3">
                        Try Again
                    </button>
                </>
            ) : (
                <>
                    <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center border border-amber-500/20 mx-auto mb-6">
                        <AlertTriangle size={40} className="text-amber-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-text-primary mb-2">No Analysis Found</h2>
                    <p className="text-text-secondary mb-8">We couldn't find any generated insights for this resume. Let's run a new analysis.</p>
                    <button onClick={() => navigate('/upload')} className="btn-primary w-full justify-center py-3">
                        Upload &amp; Analyze Resume
                    </button>
                </>
            )}
        </div>
    );

    const { nlpResult: nlp, openAIResult: ai } = analysis;

    // Determine primary action focus
    const weakestScore = Math.min(ai?.atsScore ?? 100, ai?.qualityScore ?? 100, nlp?.similarityScore || 100);
    const actionFocus = weakestScore === ai?.atsScore ? "Formatting & Keywords" : weakestScore === ai?.qualityScore ? "Impact & Writing" : "Skill Alignment";
    const primaryImprovement = ai?.improvements?.[0] || "Optimize your resume layout for standard ATS parsing.";

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-12">

            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border">
                <div>
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-primary/10 rounded-lg border border-primary/20">
                            <Target className="text-primary" size={24} />
                        </div>
                        <h1 className="text-4xl font-extrabold text-text-primary tracking-tight">
                            Intelligence Report
                        </h1>
                    </motion.div>
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="text-text-secondary text-lg ml-1">
                        Deep dive into your resume's performance metrics
                    </motion.p>
                </div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex gap-3">
                    <button onClick={() => navigate(`/interview/${resumeId}`)} className="btn-secondary whitespace-nowrap">
                        <MessageSquare size={18} /> Mock Interview
                    </button>
                    <button onClick={() => navigate(`/cover-letter/${resumeId}`)} className="btn-primary whitespace-nowrap px-6">
                        <FileText size={18} /> Generate Cover Letter
                    </button>
                </motion.div>
            </div>

            <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-12 gap-6">

                {/* Hero Summary & Action Item (Spans 12 or 8 cols) */}
                <motion.div variants={itemVariants} className="col-span-12 lg:col-span-8 space-y-6">
                    {/* Executive Summary Card */}
                    <div className="card relative overflow-hidden h-full flex flex-col justify-center border-t-2 border-t-primary">
                        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-primary/5 rounded-full pointer-events-none"></div>
                        <h2 className="text-xs font-bold uppercase tracking-widest text-primary mb-4 flex items-center gap-2">
                            <Sparkles size={14} /> Executive Summary
                        </h2>
                        <p className="text-2xl text-text-primary leading-relaxed font-light">
                            {ai?.summary || "Your resume has been completely processed by our hybrid AI engine."}
                        </p>
                    </div>
                </motion.div>

                {/* Top Priority Action Card (Spans 12 or 4 cols) */}
                <motion.div variants={itemVariants} className="col-span-12 lg:col-span-4">
                    <div className="card border-t-2 border-t-accent p-8 rounded-xl h-full flex flex-col relative overflow-hidden bg-background-panel">
                        <div className="absolute top-4 right-4 p-3 bg-accent/10 rounded-full border border-accent/20">
                            <Lightbulb size={24} className="text-accent" />
                        </div>
                        <h2 className="text-lg font-bold text-text-primary mb-2">Top Priority</h2>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent/10 text-accent border border-accent/20 rounded-md text-xs font-bold mb-4 w-fit uppercase tracking-wider">
                            Focus: {actionFocus}
                        </div>
                        <p className="text-text-secondary text-sm leading-relaxed mt-auto font-medium shadow-accent/5">
                            "{primaryImprovement}"
                        </p>
                    </div>
                </motion.div>

                {/* The 4 Gauges */}
                <motion.div variants={itemVariants} className="col-span-12">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <ScoreGauge score={ai?.overallScore ?? 0} label="Overall Score" color="#F59E0B" icon={Award} delay={0.1} />
                        <ScoreGauge score={ai?.atsScore ?? 0} label="ATS Scannability" color="#111827" icon={FileText} delay={0.2} />
                        <ScoreGauge score={ai?.qualityScore ?? 0} label="Writing Quality" color="#D97706" icon={Sparkles} delay={0.3} />
                        <ScoreGauge score={Math.round(nlp?.similarityScore ?? 75)} label="Role Alignment" color="#1F2937" icon={Target} delay={0.4} />
                    </div>
                </motion.div>

                {/* Strengths & Weaknesses (Split 6/6) */}
                <motion.div variants={itemVariants} className="col-span-12 md:col-span-6">
                    <div className="card h-full border-t-2 border-t-emerald-500">
                        <h2 className="text-xl font-bold text-text-primary mb-6 flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20"><CheckCircle size={20} className="text-emerald-500" /></div>
                            Core Strengths
                        </h2>
                        <ul className="space-y-4">
                            {(ai?.strengths ?? []).map((s, i) => (
                                <li key={i} className="flex items-start gap-4">
                                    <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5 border border-emerald-500/20">
                                        <CheckCircle size={12} className="text-emerald-500" />
                                    </div>
                                    <span className="text-text-secondary text-sm leading-relaxed">{s}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="col-span-12 md:col-span-6">
                    <div className="card h-full border-t-2 border-t-red-500">
                        <h2 className="text-xl font-bold text-text-primary mb-6 flex items-center gap-3">
                            <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20"><XCircle size={20} className="text-red-500" /></div>
                            Areas for Improvement
                        </h2>
                        <ul className="space-y-4">
                            {(ai?.weaknesses ?? []).map((w, i) => (
                                <li key={i} className="flex items-start gap-4">
                                    <div className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5 border border-red-500/20">
                                        <XCircle size={12} className="text-red-500" />
                                    </div>
                                    <span className="text-text-secondary text-sm leading-relaxed">{w}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </motion.div>

                {/* Skills Analysis */}
                <motion.div variants={itemVariants} className="col-span-12 lg:col-span-8">
                    <div className="card h-full">
                        <h2 className="text-xl font-bold text-text-primary mb-8 flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg border border-primary/20"><Map size={20} className="text-primary" /></div>
                            Skills Topography
                        </h2>

                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-primary"></span> Hard Skills
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {nlp?.extractedSkills?.slice(0, 15).map(s => <span key={s} className="badge-skill">{s}</span>)}
                                        {(nlp?.extractedSkills?.length ?? 0) > 15 && <span className="badge-soft">+{(nlp?.extractedSkills?.length ?? 0) - 15} more</span>}
                                    </div>
                                </div>

                                <div>
                                    <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-accent"></span> Soft Skills
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {(nlp?.softSkills ?? []).map(s => <span key={s} className="badge-soft">{s}</span>)}
                                    </div>
                                </div>
                            </div>

                            {(nlp?.matchedSkills?.length ?? 0) > 0 && nlp?.missingSkills && (
                                <div className="p-6 bg-background-panel border border-border rounded-xl grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-3">Target Matches</p>
                                        <div className="flex flex-wrap gap-2">
                                            {nlp.matchedSkills.map(s => <span key={s} className="badge-matched">{s}</span>)}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-red-500 uppercase tracking-widest mb-3">Missing Keywords</p>
                                        <div className="flex flex-wrap gap-2">
                                            {nlp.missingSkills.map(s => <span key={s} className="badge-missing border-dashed">{s}</span>)}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* Actionable Steps List */}
                <motion.div variants={itemVariants} className="col-span-12 lg:col-span-4">
                    <div className="card h-full">
                        <h2 className="text-xl font-bold text-text-primary mb-6">Action Plan</h2>
                        <div className="space-y-4">
                            {(ai?.improvements ?? []).slice(0, 4).map((imp, i) => (
                                <div key={i} className="flex gap-4 group">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0 text-sm font-bold text-text-secondary group-hover:bg-primary group-hover:text-white group-hover:border-primary transition-colors">
                                        {i + 1}
                                    </div>
                                    <p className="text-sm text-text-secondary leading-relaxed group-hover:text-text-primary transition-colors pt-1">
                                        {imp}
                                    </p>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => navigate(`/interview/${resumeId}`)} className="w-full mt-8 btn-secondary justify-center py-4 text-sm rounded-lg">
                            Generate Full Career Roadmap &rarr;
                        </button>
                    </div>
                </motion.div>

                {/* Bullet Impact Rewrites */}
                {(ai?.bulletImpactScores?.length ?? 0) > 0 && (
                    <motion.div variants={itemVariants} className="col-span-12">
                        <div className="card relative overflow-hidden">
                            <h2 className="text-xl font-bold text-text-primary mb-2">Bullet Point Optimizer</h2>
                            <p className="text-text-secondary text-sm mb-8">AI-suggested rewrites for maximum impact and quantifiable results.</p>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {ai!.bulletImpactScores.slice(0, 4).map((b, i) => (
                                    <div key={i} className="flex flex-col bg-background-panel rounded-xl border border-border overflow-hidden">
                                        <div className="p-5 border-b border-border bg-background-panel">
                                            <div className="flex justify-between items-start gap-4 mb-2">
                                                <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Original</span>
                                                <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${b.score >= 7 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : b.score >= 4 ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                                    Score: {b.score}/10
                                                </span>
                                            </div>
                                            <p className="text-sm text-text-secondary line-through decoration-red-500/50">{b.bullet}</p>
                                        </div>
                                        <div className="p-5 bg-primary/5 relative">
                                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background-panel border border-border flex items-center justify-center">
                                                <ArrowRight size={14} className="text-primary transform rotate-90 lg:rotate-0" />
                                            </div>
                                            <span className="block text-xs font-bold uppercase tracking-wider text-primary mb-2 mt-2 lg:mt-0">AI Rewritten</span>
                                            <p className="text-sm text-text-primary font-medium leading-relaxed">{b.rewritten}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
}
