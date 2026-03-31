import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Loader2, ChevronDown, ChevronUp, Briefcase, User, Layers, Target, CheckCircle } from 'lucide-react';
import { analysisApi, resumeApi } from '../lib/api';
import { useResumeStore } from '../stores/resumeStore';

interface Question { question: string; type: string; rationale?: string; sampleAnswer?: string; difficulty?: string; }

const typeIcon = (t: string) => ({ behavioral: User, technical: Layers, situational: Target }[t] ?? MessageSquare);
const typeBadge = (t: string) => ({ behavioral: 'bg-accent/10 text-accent border border-accent/20', technical: 'bg-blue-500/10 text-blue-400 border border-blue-500/20', situational: 'bg-white/10 text-white/70 border border-white/20' }[t] ?? 'badge-skill');

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
        // Hide raw UUIDs from the dropdown
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

    return (
        <div className="max-w-4xl mx-auto space-y-6 pt-8 pb-12 px-4 sm:px-0">
            <div>
                <h1 className="text-4xl font-bold text-white tracking-tight">Interview Coach</h1>
                <p className="text-white/50 mt-1.5 text-base">AI-generated questions tailored to your resume & target role</p>
            </div>

            {/* Config */}
            <div className="bg-gray-900 border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
                {/* Decorative background glow */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-accent/5 rounded-full blur-3xl pointer-events-none" />

                {/* Resume picker */}
                {(isSelect || !paramId) && (
                    <div className="relative z-10">
                        <label className="block text-sm font-medium text-white/70 mb-2">Resume</label>
                        {resumes.length > 0 ? (
                            <div className="relative">
                                <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="w-full bg-gray-950 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-white/30 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 transition-all appearance-none cursor-pointer relative z-10">
                                    <option value="">Select a resume…</option>
                                    {resumes.map((r: any) => <option key={r._id} value={r._id}>{formatResumeName(r)}</option>)}
                                </select>
                                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none z-20" />
                            </div>
                        ) : (
                            <div className="p-5 rounded-xl border border-dashed border-white/20 bg-gray-950/50 flex flex-col items-center justify-center text-center">
                                <p className="text-white/50 mb-3 text-sm">No resumes found on your account.</p>
                                <button onClick={() => navigate('/upload')} className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg transition-colors text-sm font-medium">
                                    Upload a Resume First
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Resume Form Inputs */}
                <div className="space-y-6 relative z-10">
                    <div>
                        <label className="block text-sm font-medium text-white/70 mb-2">Target Role *</label>
                        {!isCustomRole ? (
                            <div className="relative">
                                <Briefcase size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                                <select value={jobTitle} onChange={(e) => {
                                    if (e.target.value === 'custom') { setIsCustomRole(true); setJobTitle(''); }
                                    else setJobTitle(e.target.value);
                                }} className="w-full bg-gray-950 border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-white focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 transition-all appearance-none cursor-pointer">
                                    <option value="">Select a role...</option>
                                    {['Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Data Scientist', 'Product Manager', 'UX/UI Designer', 'DevOps Engineer'].map(r => <option key={r} value={r}>{r}</option>)}
                                    <option value="custom">Other (Custom Role)...</option>
                                </select>
                                <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                            </div>
                        ) : (
                            <div className="relative">
                                <Briefcase size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                                <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && generate(false)}
                                    className="w-full bg-gray-950 border border-white/10 rounded-xl pl-11 pr-24 py-3.5 text-white placeholder-white/20 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 transition-all" placeholder="e.g. Machine Learning Engineer" autoFocus />
                                <button onClick={() => { setIsCustomRole(false); setJobTitle(''); }} className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-accent hover:text-accent-light transition-colors p-1 bg-white/5 rounded-md">
                                    Back to list
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2 w-full">
                        <button onClick={() => generate(false)} disabled={loading || !selectedId || !jobTitle.trim()} 
                            className={`flex-1 justify-center py-4 rounded-xl font-bold flex items-center gap-2 transition-all ${
                                (loading || !selectedId || !jobTitle.trim()) 
                                    ? 'bg-gray-800 text-white/30 cursor-not-allowed border border-white/5' 
                                    : 'btn-accent shadow-lg shadow-accent/20 border border-accent/50 text-base'
                            }`}>
                            {loading ? <Loader2 size={20} className="animate-spin" /> : <MessageSquare size={20} />}
                            {loading ? 'Analyzing Resume...' : 
                             !selectedId ? 'Select a Resume First' : 
                             !jobTitle.trim() ? 'Select a Target Role' : 
                             'Generate AI Coach'}
                        </button>
                        {questions.length > 0 && (
                            <button onClick={() => generate(true)} disabled={loading || !selectedId || !jobTitle.trim()} className="px-6 py-4 rounded-xl font-semibold bg-gray-800 text-white border border-white/10 hover:bg-gray-700 transition-colors shadow-lg">
                                Regenerate
                            </button>
                        )}
                    </div>
                    {error && <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-medium flex items-center gap-2"><Target size={16} /> {error}</div>}
                </div>
            </div>

            <AnimatePresence>
                {questions.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 pb-12">
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-xl font-bold text-white tracking-tight">Practice Questions</h2>
                            <p className="text-sm text-accent font-semibold px-3 py-1 bg-accent/10 border border-accent/20 rounded-full">{questions.length} Generated</p>
                        </div>
                        {questions.map((q, i) => {
                            const Icon = typeIcon(q.type);
                            return (
                                <div key={i} className="bg-gray-900 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all shadow-lg group">
                                    <button onClick={() => setOpenIdx(openIdx === i ? null : i)}
                                        className="w-full flex items-center gap-4 p-5 sm:p-6 text-left hover:bg-white/5 transition-colors">
                                        <div className="w-12 h-12 rounded-xl bg-gray-800 border border-white/10 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-inner">
                                            <Icon size={22} className="text-white/70" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-base sm:text-lg text-white font-semibold leading-snug pr-4">{q.question}</p>
                                            <div className="flex flex-wrap items-center gap-2 mt-3">
                                                <span className={`inline-flex text-[10px] px-2.5 py-1 rounded-md border font-bold uppercase tracking-widest shadow-sm ${typeBadge(q.type)}`}>{q.type}</span>
                                                {q.difficulty && (
                                                    <span className={`inline-flex text-[10px] px-2.5 py-1 rounded-md border font-bold uppercase tracking-widest shadow-sm ${
                                                        q.difficulty === 'hard' ? 'text-red-400 border-red-500/30 bg-red-500/10' :
                                                        q.difficulty === 'medium' ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' :
                                                        'text-emerald-400 border-emerald-500/30 bg-emerald-500/10'
                                                    }`}>{q.difficulty}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-white/5 border border-white/10 transition-colors ${openIdx === i ? 'bg-accent/20 border-accent/30 text-accent' : 'text-white/40 group-hover:bg-white/10 group-hover:text-white/80'}`}>
                                            {openIdx === i ? <ChevronUp size={18} className="flex-shrink-0" /> : <ChevronDown size={18} className="flex-shrink-0" />}
                                        </div>
                                    </button>
                                    <AnimatePresence>
                                        {openIdx === i && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                                className="border-t border-white/10 px-5 sm:px-6 pb-6 pt-5 space-y-5 bg-gray-950/60 shadow-inner">
                                                {q.rationale && (
                                                    <div className="flex gap-3 text-white/60">
                                                        <Target size={18} className="flex-shrink-0 mt-0.5 text-accent/70" />
                                                        <p className="text-sm font-medium leading-relaxed">{q.rationale}</p>
                                                    </div>
                                                )}
                                                {q.sampleAnswer && (
                                                    <div className="p-5 bg-emerald-900/10 border border-emerald-500/20 rounded-xl shadow-inner relative overflow-hidden">
                                                        {/* Subtle gradient accent for the answer box */}
                                                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/50"></div>
                                                        <p className="text-xs font-bold text-emerald-400 mb-3 uppercase tracking-widest flex items-center gap-2">
                                                            <CheckCircle size={14} /> AI Model Answer
                                                        </p>
                                                        <p className="text-[15px] text-white/90 leading-relaxed font-normal">{q.sampleAnswer}</p>
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
    );
}
