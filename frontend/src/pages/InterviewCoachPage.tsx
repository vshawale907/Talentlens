import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Loader2, ChevronDown, ChevronUp, Briefcase, User, Layers, Target, CheckCircle, RefreshCw, Sparkles } from 'lucide-react';
import { analysisApi, resumeApi } from '../lib/api';
import { useResumeStore } from '../stores/resumeStore';

interface Question { question: string; type: string; rationale?: string; sampleAnswer?: string; difficulty?: string; }

const typeIcon = (t: string) => ({ behavioral: User, technical: Layers, situational: Target }[t] ?? MessageSquare);

const typeBadgeClass = (t: string) => ({
    behavioral: 'text-amber-400 bg-amber-500/10 border border-amber-500/20',
    technical: 'text-blue-400 bg-blue-500/10 border border-blue-500/20',
    situational: 'text-purple-400 bg-purple-500/10 border border-purple-500/20',
}[t] ?? 'text-gray-400 bg-white/5 border border-white/10');

const difficultyClass = (d?: string) => ({
    hard: 'text-rose-400 bg-rose-500/10 border border-rose-500/20',
    medium: 'text-amber-400 bg-amber-500/10 border border-amber-500/20',
    easy: 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20',
}[d ?? ''] ?? 'text-gray-400 bg-white/5 border border-white/10');

export default function InterviewCoachPage() {
    const { resumeId: paramId } = useParams<{ resumeId: string }>();
    const isSelect = paramId === 'select';
    const navigate = useNavigate();
    const { resumes, setResumes } = useResumeStore();
    const [selectedId, setSelectedId] = useState(isSelect ? '' : (paramId ?? ''));
    const [jobTitle, setJobTitle] = useState('');
    const [isCustomRole, setIsCustomRole] = useState(false);
    const [questions, setQuestions] = useState<Question[]>([]);
    const [openIdx, setOpenIdx] = useState<number | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        resumeApi.list().then(({ data }) => {
            const list = Array.isArray(data.data) ? data.data : (data.data?.resumes ?? []);
            setResumes(list);
        }).catch(console.error);
    }, []);

    const formatResumeName = (r: any) => {
        let name = (r.originalFilename || r.title || 'Untitled').replace(/\s+/g, ' ').trim();
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/i.test(name)) {
            name = `Uploaded Resume (${name.split('-')[0]})`;
        }
        return name.length > 40 ? name.substring(0, 40) + '...' : name;
    };

    const generate = async (forceRegenerate = false) => {
        if (!selectedId || !jobTitle.trim()) return;
        setLoading(true); setError(''); setQuestions([]);
        try {
            const { data } = await analysisApi.getInterviewQuestions(selectedId, { jobTitle, forceRegenerate });
            const q = data.data.questions ?? {};
            const flat = [
                ...(q.behavioural ?? []).map((item: any) => ({ question: item.question, type: 'behavioral', rationale: item.hint, sampleAnswer: item.answer, difficulty: item.difficulty })),
                ...(q.technical ?? []).map((item: any) => ({ question: item.question, type: 'technical', rationale: item.hint, sampleAnswer: item.answer, difficulty: item.difficulty })),
                ...(q.situational ?? []).map((item: any) => ({ question: item.question, type: 'situational', rationale: item.hint, sampleAnswer: item.answer, difficulty: item.difficulty })),
            ];
            setQuestions(flat);
        } catch (e: unknown) {
            setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Generation failed');
        } finally { setLoading(false); }
    };

    const PRESET_ROLES = [
        'Frontend Developer', 'Backend Developer', 'Full Stack Developer',
        'Data Scientist', 'Machine Learning Engineer', 'Product Manager',
        'UX/UI Designer', 'DevOps Engineer', 'Cloud Engineer', 'Data Analyst',
    ];

    return (
        <div className="w-full bg-gray-950 min-h-full text-gray-200 p-4 md:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto pb-12">

                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="bg-blue-500/10 p-2 rounded-lg border border-blue-500/20">
                            <MessageSquare size={22} className="text-blue-400" />
                        </div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Interview Coach</h1>
                    </div>
                    <p className="text-gray-400 mt-1 ml-1">AI-generated questions precisely tailored to your resume & target role</p>
                </div>

                {/* Config Card */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 sm:p-8 shadow-xl space-y-6 relative overflow-hidden mb-6">
                    <div className="absolute -top-20 -right-20 w-60 h-60 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

                    {/* Resume Picker */}
                    {(isSelect || !paramId) && (
                        <div className="relative z-10">
                            <label className="block text-sm font-medium text-gray-400 mb-2">Select Resume</label>
                            {resumes.length > 0 ? (
                                <div className="relative">
                                    <select
                                        value={selectedId}
                                        onChange={(e) => setSelectedId(e.target.value)}
                                        className="w-full bg-gray-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/50 transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="">Select a resume…</option>
                                        {resumes.map((r: any) => <option key={r._id} value={r._id}>{formatResumeName(r)}</option>)}
                                    </select>
                                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                                </div>
                            ) : (
                                <div className="p-5 rounded-xl border border-dashed border-white/15 bg-gray-950/50 flex flex-col items-center justify-center text-center">
                                    <p className="text-gray-500 mb-3 text-sm">No resumes found on your account.</p>
                                    <button onClick={() => navigate('/upload')} className="px-5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg text-sm font-medium transition-colors">
                                        Upload a Resume First
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Target Role */}
                    <div className="relative z-10">
                        <label className="block text-sm font-medium text-gray-400 mb-2">Target Role *</label>
                        {!isCustomRole ? (
                            <div className="relative">
                                <Briefcase size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                <select
                                    value={jobTitle}
                                    onChange={(e) => {
                                        if (e.target.value === 'custom') { setIsCustomRole(true); setJobTitle(''); }
                                        else setJobTitle(e.target.value);
                                    }}
                                    className="w-full bg-gray-950 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white focus:outline-none focus:border-amber-500/50 transition-all appearance-none cursor-pointer"
                                >
                                    <option value="">Select a role…</option>
                                    {PRESET_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                    <option value="custom">Other (Custom Role)…</option>
                                </select>
                                <ChevronDown size={15} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                            </div>
                        ) : (
                            <div className="relative">
                                <Briefcase size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                                <input
                                    value={jobTitle}
                                    onChange={(e) => setJobTitle(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && generate(false)}
                                    className="w-full bg-gray-950 border border-white/10 rounded-xl pl-11 pr-28 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500/50 transition-all"
                                    placeholder="e.g. Machine Learning Engineer"
                                    autoFocus
                                />
                                <button
                                    onClick={() => { setIsCustomRole(false); setJobTitle(''); }}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors px-2 py-1 bg-white/5 rounded-md"
                                >
                                    ← Back to list
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Generate Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 relative z-10">
                        <button
                            onClick={() => generate(false)}
                            disabled={loading || !selectedId || !jobTitle.trim()}
                            className={`flex-1 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 text-sm transition-all ${
                                (loading || !selectedId || !jobTitle.trim())
                                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-white/5'
                                    : 'bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_20px_rgba(245,158,11,0.2)] border border-amber-400/30'
                            }`}
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                            {loading ? 'Analyzing Resume & Generating…' :
                             !selectedId ? 'Select a Resume First' :
                             !jobTitle.trim() ? 'Select a Target Role' :
                             'Generate Interview Questions'}
                        </button>
                        {questions.length > 0 && (
                            <button
                                onClick={() => generate(true)}
                                disabled={loading}
                                className="px-5 py-3.5 rounded-xl font-semibold text-sm bg-gray-800 text-gray-200 border border-white/10 hover:bg-gray-700 hover:border-white/20 transition-colors flex items-center gap-2"
                            >
                                <RefreshCw size={15} /> Regenerate
                            </button>
                        )}
                    </div>

                    {error && (
                        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm font-medium flex items-center gap-2 relative z-10">
                            <Target size={15} /> {error}
                        </div>
                    )}
                </div>

                {/* Questions List */}
                <AnimatePresence>
                    {questions.length > 0 && (
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                            <div className="flex items-center justify-between px-1 mb-4">
                                <h2 className="text-xl font-bold text-white">Practice Questions</h2>
                                <span className="text-sm text-amber-400 font-semibold px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full">
                                    {questions.length} Generated
                                </span>
                            </div>

                            {questions.map((q, i) => {
                                const Icon = typeIcon(q.type);
                                return (
                                    <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-gray-700 transition-all group">
                                        <button
                                            onClick={() => setOpenIdx(openIdx === i ? null : i)}
                                            className="w-full flex items-center gap-4 p-5 text-left hover:bg-white/[0.02] transition-colors"
                                        >
                                            <div className="w-11 h-11 rounded-xl bg-gray-800 border border-white/10 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                                                <Icon size={20} className="text-gray-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-base text-white font-semibold leading-snug pr-4">{q.question}</p>
                                                <div className="flex flex-wrap items-center gap-2 mt-2.5">
                                                    <span className={`inline-flex text-[10px] px-2.5 py-1 rounded-md font-bold uppercase tracking-widest ${typeBadgeClass(q.type)}`}>
                                                        {q.type}
                                                    </span>
                                                    {q.difficulty && (
                                                        <span className={`inline-flex text-[10px] px-2.5 py-1 rounded-md font-bold uppercase tracking-widest ${difficultyClass(q.difficulty)}`}>
                                                            {q.difficulty}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border transition-colors ${openIdx === i ? 'bg-amber-500/20 border-amber-500/30 text-amber-400' : 'bg-white/5 border-white/10 text-gray-500 group-hover:border-white/20'}`}>
                                                {openIdx === i ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                            </div>
                                        </button>

                                        <AnimatePresence>
                                            {openIdx === i && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="border-t border-white/5 px-5 pb-6 pt-5 space-y-4 bg-gray-950/50"
                                                >
                                                    {q.rationale && (
                                                        <div className="flex gap-3 text-gray-400">
                                                            <Target size={16} className="flex-shrink-0 mt-0.5 text-amber-500/50" />
                                                            <p className="text-sm leading-relaxed">{q.rationale}</p>
                                                        </div>
                                                    )}
                                                    {q.sampleAnswer && (
                                                        <div className="p-5 bg-emerald-900/10 border border-emerald-500/15 rounded-xl relative overflow-hidden">
                                                            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/40" />
                                                            <p className="text-xs font-bold text-emerald-400 mb-3 uppercase tracking-widest flex items-center gap-2 pl-2">
                                                                <CheckCircle size={13} /> Model Answer
                                                            </p>
                                                            <p className="text-sm text-white/85 leading-relaxed pl-2">{q.sampleAnswer}</p>
                                                        </div>
                                                    )}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
