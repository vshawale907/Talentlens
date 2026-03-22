import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Loader2, ChevronDown, ChevronUp, Briefcase, User, Layers, Target } from 'lucide-react';
import { analysisApi, resumeApi } from '../lib/api';
import { useResumeStore } from '../stores/resumeStore';

interface Question { question: string; type: string; rationale?: string; sampleAnswer?: string; difficulty?: string; }

const typeIcon = (t: string) => ({ behavioral: User, technical: Layers, situational: Target }[t] ?? MessageSquare);
const typeBadge = (t: string) => ({ behavioral: 'bg-accent-subtle text-amber-700 border border-accent-border', technical: 'bg-primary/5 text-primary border border-primary/10', situational: 'bg-gray-100 text-text-secondary border border-border' }[t] ?? 'badge-skill');

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
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-text-primary">Interview Coach</h1>
                <p className="text-text-secondary mt-1">AI-generated questions tailored to your resume & target role</p>
            </div>

            {/* Config */}
            <div className="card space-y-4">
                {/* Resume picker */}
                {(isSelect || !paramId) && resumes.length > 0 && (
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1.5">Resume</label>
                        <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="input-field">
                            <option value="">Select a resume…</option>
                            {resumes.map((r: any) => <option key={r._id} value={r._id}>{formatResumeName(r)}</option>)}
                        </select>
                    </div>
                )}
                {/* Resume Form Inputs */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1.5">Target Role *</label>
                        {!isCustomRole ? (
                            <select value={jobTitle} onChange={(e) => {
                                if (e.target.value === 'custom') { setIsCustomRole(true); setJobTitle(''); }
                                else setJobTitle(e.target.value);
                            }} className="input-field bg-background-card">
                                <option value="">Select a role...</option>
                                {['Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Data Scientist', 'Product Manager', 'UX/UI Designer', 'DevOps Engineer'].map(r => <option key={r} value={r}>{r}</option>)}
                                <option value="custom">Other (Custom Role)...</option>
                            </select>
                        ) : (
                            <div className="relative">
                                <Briefcase size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                                <input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && generate(false)}
                                    className="input-field pl-9 pr-24 bg-background-card" placeholder="e.g. Machine Learning Engineer" autoFocus />
                                <button onClick={() => { setIsCustomRole(false); setJobTitle(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-primary hover:underline">
                                    Back to list
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => generate(false)} disabled={loading || !selectedId || !jobTitle.trim()} className="btn-primary flex-1 justify-center shadow-lg hover:shadow-primary/20">
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <MessageSquare size={18} />}
                            {loading ? 'Generating…' : 'Generate Questions'}
                        </button>
                        {questions.length > 0 && (
                            <button onClick={() => generate(true)} disabled={loading || !selectedId || !jobTitle.trim()} className="btn-secondary flex-1 justify-center shadow-lg">
                                Regenerate (Clear Cache)
                            </button>
                        )}
                    </div>
                    {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm font-medium">{error}</div>}
                </div>
            </div>

            {/* Questions */}
            <AnimatePresence>
                {questions.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                        <p className="text-sm text-text-secondary font-medium">{questions.length} questions generated</p>
                        {questions.map((q, i) => {
                            const Icon = typeIcon(q.type);
                            return (
                                <div key={i} className="card overflow-hidden !p-0 border border-border hover:border-gray-300 transition-all">
                                    <button onClick={() => setOpenIdx(openIdx === i ? null : i)}
                                        className="w-full flex items-center gap-4 p-5 text-left hover:bg-gray-50 transition-colors">
                                        <div className="w-10 h-10 rounded-xl bg-background-panel border border-border flex items-center justify-center flex-shrink-0">
                                            <Icon size={20} className="text-text-secondary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-text-primary font-bold">{q.question}</p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className={`inline-block text-[10px] px-2 py-0.5 rounded-md border font-bold uppercase tracking-wider ${typeBadge(q.type)}`}>{q.type}</span>
                                                {q.difficulty && (
                                                    <span className={`inline-block text-[10px] px-2 py-0.5 rounded-md border font-bold uppercase tracking-wider ${
                                                        q.difficulty === 'hard' ? 'text-red-400 border-red-500/20 bg-red-500/10' :
                                                        q.difficulty === 'medium' ? 'text-amber-400 border-amber-500/20 bg-amber-500/10' :
                                                        'text-emerald-400 border-emerald-500/20 bg-emerald-500/10'
                                                    }`}>{q.difficulty}</span>
                                                )}
                                            </div>
                                        </div>
                                        {openIdx === i ? <ChevronUp size={20} className="text-text-muted flex-shrink-0" /> : <ChevronDown size={20} className="text-text-muted flex-shrink-0" />}
                                    </button>
                                    <AnimatePresence>
                                        {openIdx === i && (
                                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                                className="border-t border-border px-5 pb-5 pt-4 space-y-4 bg-background-panel">
                                                {q.rationale && <p className="text-sm text-text-secondary italic leading-relaxed">{q.rationale}</p>}
                                                {q.sampleAnswer && (
                                                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                                                        <p className="text-xs font-bold text-emerald-500 mb-2 uppercase tracking-wider">Sample Answer</p>
                                                        <p className="text-sm text-text-primary leading-relaxed">{q.sampleAnswer}</p>
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
