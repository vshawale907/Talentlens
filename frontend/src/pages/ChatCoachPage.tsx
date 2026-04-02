import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bot, Send, Plus, Trash2, Loader2, User, FileText, Target,
    Mic, Compass, Pencil, ChevronRight, Sparkles, MessageSquare,
    CheckCircle, Lightbulb, Copy, Check
} from 'lucide-react';
import { chatApi, resumeApi } from '../lib/api';
import { useResumeStore } from '../stores/resumeStore';

type CoachingMode = 'general' | 'resume_review' | 'skill_gap' | 'interview_prep' | 'career_guidance' | 'bullet_rewrite' | 'interview_sim' | 'job_rag_coach';

interface StructuredResponse {
    feedback: string;
    improvements: string[];
    example: string;
    confidence: number;
    reasoning: string;
    quickWin: string;
    mode: CoachingMode;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
    structured?: StructuredResponse | null;
    mode?: CoachingMode;
}

interface Session { _id: string; title: string; createdAt: string; }

const COACHING_MODES: { mode: CoachingMode; label: string; icon: typeof FileText; desc: string; prompt: string; color: string }[] = [
    {
        mode: 'resume_review',
        label: 'Resume Review',
        icon: FileText,
        desc: 'Deep ATS & quality analysis',
        prompt: 'Please do a comprehensive review of my resume. Highlight strengths, weaknesses, and specific improvements to make it ATS-optimized.',
        color: 'text-blue-400',
    },
    {
        mode: 'skill_gap',
        label: 'Skill Gap Analysis',
        icon: Target,
        desc: 'Find missing skills for your goal',
        prompt: 'Analyze my skill gaps. What critical skills am I missing and what should I learn next to become more competitive?',
        color: 'text-emerald-400',
    },
    {
        mode: 'interview_prep',
        label: 'Interview Prep',
        icon: Mic,
        desc: 'Practice questions & answers',
        prompt: 'Help me prepare for interviews based on my resume. Give me the 5 most likely questions I\'ll be asked and how to answer them powerfully.',
        color: 'text-purple-400',
    },
    {
        mode: 'career_guidance',
        label: 'Career Guidance',
        icon: Compass,
        desc: 'Strategic career path planning',
        prompt: 'Based on my resume, give me a strategic career roadmap. Where should I be in 6 months, 1 year, and 3 years?',
        color: 'text-amber-400',
    },
    {
        mode: 'bullet_rewrite',
        label: 'Bullet Rewriter',
        icon: Pencil,
        desc: 'Upgrade resume bullet points',
        prompt: 'Help me rewrite my resume bullets to be more impactful with metrics and action verbs.',
        color: 'text-pink-400',
    },
    {
        mode: 'interview_sim',
        label: 'Mock Interview',
        icon: MessageSquare,
        desc: 'Live interview simulation',
        prompt: 'Start a mock interview with me. Ask me one challenging question based on my resume, and after I answer, give me detailed feedback.',
        color: 'text-cyan-400',
    },
    {
        mode: 'job_rag_coach',
        label: 'Job Post RAG',
        icon: Target,
        desc: 'Match against a specific JD',
        prompt: 'I have a specific job description. I want you to tailor your coaching directly to this role.',
        color: 'text-indigo-400',
    },
];

function StructuredCard({ data, onCopy }: { data: StructuredResponse; onCopy: (text: string) => void }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        const text = `${data.feedback}\n\nKey Improvements:\n${data.improvements.map(i => `• ${i}`).join('\n')}\n\nQuick Win: ${data.quickWin}\n\nExample:\n${data.example}`;
        onCopy(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const confColor = data.confidence >= 8 ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' 
        : data.confidence >= 6 ? 'text-amber-400 bg-amber-400/10 border-amber-400/20' 
        : 'text-rose-400 bg-rose-400/10 border-rose-400/20';

    return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800/60 border border-white/10 rounded-2xl overflow-hidden shadow-md w-full max-w-[85%]">
            
            {/* Header: Feedback + Confidence Badge */}
            <div className="px-5 pt-5 pb-4 border-b border-white/10">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Sparkles size={14} className="text-amber-400 flex-shrink-0" />
                        <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Coach Feedback</span>
                    </div>
                    {data.confidence && (
                        <div className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${confColor}`}>
                            Confidence: {data.confidence}/10
                        </div>
                    )}
                </div>
                <p className="text-[15px] text-gray-200 leading-relaxed">{data.feedback}</p>
                {data.reasoning && (
                    <p className="mt-2 text-xs text-gray-400 italic">" {data.reasoning} "</p>
                )}
            </div>

            {/* Quick Win Block */}
            {data.quickWin && (
                <div className="px-5 py-4 border-b border-white/10 bg-gradient-to-r from-amber-500/10 to-transparent">
                    <div className="flex items-start gap-3">
                        <div className="mt-0.5 w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-amber-500 font-bold text-sm">!</span>
                        </div>
                        <div>
                            <span className="text-xs font-bold text-amber-500 uppercase tracking-widest block mb-1">Quick Win (Do this right now)</span>
                            <span className="text-sm text-gray-200">{data.quickWin}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Improvements */}
            {data.improvements?.length > 0 && (
                <div className="px-5 py-4 border-b border-white/10">
                    <div className="flex items-center gap-2 mb-3">
                        <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />
                        <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Action Items</span>
                    </div>
                    <ul className="space-y-2">
                        {data.improvements.map((item, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-sm text-gray-300">
                                <ChevronRight size={13} className="text-amber-400/70 mt-0.5 flex-shrink-0" />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Example */}
            {data.example && (
                <div className="px-5 py-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Lightbulb size={14} className="text-amber-400 flex-shrink-0" />
                        <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Example / Rewrite</span>
                    </div>
                    <div className="bg-gray-950/60 rounded-xl border border-white/10 px-4 py-3 text-sm text-gray-200 font-mono leading-relaxed whitespace-pre-wrap">
                        {data.example}
                    </div>
                </div>
            )}

            {/* Copy button */}
            <div className="px-5 pb-4 flex justify-end">
                <button onClick={handleCopy}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-amber-400 transition-colors py-1 px-2 rounded-lg hover:bg-white/5">
                    {copied ? <><Check size={12} className="text-emerald-400" /> Copied</> : <><Copy size={12} /> Copy response</>}
                </button>
            </div>
        </motion.div>
    );
}

export default function ChatCoachPage() {
    const { resumes, setResumes } = useResumeStore();
    const [sessions, setSessions] = useState<Session[]>([]);
    const [activeSession, setActiveSession] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedResumeId, setSelectedResumeId] = useState('');
    const [activeMode, setActiveMode] = useState<CoachingMode>('general');
    const [bulletInput, setBulletInput] = useState('');
    const [showBulletModal, setShowBulletModal] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        resumeApi.list().then(({ data }) => {
            const list = Array.isArray(data.data) ? data.data : (data.data?.resumes ?? []);
            setResumes(list);
        }).catch(console.error);
        chatApi.getSessions().then(({ data }) => setSessions(data.data.sessions ?? [])).catch(console.error);
    }, []);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

    const newSession = async (startMode: CoachingMode = 'general') => {
        try {
            const { data } = await chatApi.createSession(selectedResumeId || undefined);
            const s = data.data.session;
            setSessions((prev) => [s, ...prev]);
            setActiveSession(s._id);
            setMessages([]);
            setActiveMode(startMode);
        } catch (e) { console.error(e); }
    };

    const sendMessage = async (overrideMessage?: string, overrideMode?: CoachingMode, bulletText?: string, overrideSessionId?: string) => {
        const text = overrideMessage ?? input.trim();
        const sid = overrideSessionId ?? activeSession;
        if (!text || !sid) return;

        const mode = overrideMode ?? activeMode;
        const userMsg: Message = { role: 'user', content: text, mode };
        setMessages((m) => [...m, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const { data } = await chatApi.sendMessage(sid, text, mode, bulletText);
            const reply = data.data.reply as string;
            const structured = data.data.structured as StructuredResponse | null;
            setMessages((m) => [...m, { role: 'assistant', content: reply, structured, mode }]);
        } catch {
            setMessages((m) => [...m, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
        } finally {
            setLoading(false);
            inputRef.current?.focus();
        }
    };

    const triggerMode = async (modeConfig: typeof COACHING_MODES[0]) => {
        if (!activeSession) return;
        if (modeConfig.mode === 'bullet_rewrite') {
            setActiveMode('bullet_rewrite');
            setShowBulletModal(true);
            return;
        }

        try {
            const { data } = await chatApi.createSession(selectedResumeId || undefined);
            const s = data.data.session;
            setSessions((prev) => [s, ...prev]);
            setActiveSession(s._id);
            setMessages([]);
            setActiveMode(modeConfig.mode);
            sendMessage(modeConfig.prompt, modeConfig.mode, undefined, s._id);
        } catch(e) { console.error(e); }
    };

    const submitBulletRewrite = () => {
        if (!bulletInput.trim()) return;
        setShowBulletModal(false);
        const msg = `Please rewrite this resume bullet point professionally:\n"${bulletInput}"`;
        sendMessage(msg, 'bullet_rewrite', bulletInput);
        setBulletInput('');
    };

    const deleteSession = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        await chatApi.deleteSession(id);
        setSessions((s) => s.filter((sess) => sess._id !== id));
        if (activeSession === id) { setActiveSession(null); setMessages([]); }
    };

    const copyText = (text: string) => navigator.clipboard.writeText(text);

    return (
        <div className="flex h-full overflow-hidden bg-gray-950">

            {/* ── Sessions Sidebar ── */}
            <div className="w-60 flex-shrink-0 border-r border-white/5 flex flex-col bg-gray-900">
                {/* Sidebar Header */}
                <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
                    <div className="flex items-center gap-2">
                        <Bot size={16} className="text-amber-500" />
                        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Sessions</span>
                    </div>
                    <button onClick={() => newSession()} title="New Chat"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-amber-400 hover:bg-white/5 transition-colors">
                        <Plus size={16} />
                    </button>
                </div>

                {/* Session List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                    {sessions.length === 0 && (
                        <p className="text-gray-600 text-xs px-2 py-3 italic text-center">No sessions yet</p>
                    )}
                    {sessions.map((s) => (
                        <button key={s._id} onClick={() => { setActiveSession(s._id); setMessages([]); }}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs transition-all ${activeSession === s._id
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold'
                                : 'text-gray-400 hover:bg-white/5 hover:text-gray-200 border border-transparent'}`}>
                            <span className="truncate flex-1">{s.title ?? 'Session'}</span>
                            <button onClick={(e) => deleteSession(s._id, e)}
                                className="text-gray-600 hover:text-rose-400 transition-colors ml-1 p-0.5 rounded flex-shrink-0">
                                <Trash2 size={12} />
                            </button>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Main Chat Area ── */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

                {!activeSession ? (
                    /* Welcome Screen */
                    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                        className="flex-1 flex flex-col items-center justify-center gap-8 text-center p-8 relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 via-transparent to-transparent pointer-events-none" />
                        <div className="relative z-10 space-y-4">
                            <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto shadow-[0_0_40px_-10px] shadow-amber-500/30">
                                <Bot size={40} className="text-amber-500" />
                            </div>
                            <h1 className="text-2xl font-extrabold text-white">AI Career Coach</h1>
                            <p className="text-gray-400 text-sm max-w-xs mx-auto leading-relaxed">
                                Context-aware career coaching powered by your resume. Get personalized advice, interview prep, and career strategies.
                            </p>
                        </div>

                        {resumes.length > 0 && (
                            <div className="relative z-10 w-full max-w-xs text-left">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                    Link Resume Context (Recommended)
                                </label>
                                <select value={selectedResumeId} onChange={(e) => setSelectedResumeId(e.target.value)}
                                    className="w-full bg-gray-900 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50 transition-all text-sm appearance-none">
                                    <option value="">General coaching (no resume)</option>
                                    {resumes.map((r: any) => (
                                        <option key={r._id} value={r._id}>{r.originalFilename || r.title || 'Resume'}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <button onClick={() => newSession()}
                            className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-8 py-3 rounded-xl flex items-center gap-2 transition-colors shadow-[0_0_20px_rgba(245,158,11,0.2)] relative z-10">
                            <Plus size={18} /> Start Coaching Session
                        </button>

                        <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-3xl mt-6">
                            {COACHING_MODES.slice(0, 8).map((m) => (
                                <button key={m.mode} 
                                    onClick={async () => {
                                        await newSession(m.mode);
                                    }}
                                    className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-gray-900 border border-white/5 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all group">
                                    <m.icon size={20} className={`${m.color} group-hover:scale-110 transition-transform`} />
                                    <span className="text-xs text-gray-400 font-medium group-hover:text-gray-200 text-center">{m.label}</span>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                ) : (
                    <>
                        {/* Quick Mode Tabs */}
                        <div className="flex-shrink-0 border-b border-white/5 bg-gray-900/50 px-4 py-2.5">
                            <div className="flex gap-2 overflow-x-auto scrollbar-none">
                                <button
                                    onClick={() => setActiveMode('general')}
                                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${activeMode === 'general'
                                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                                        : 'bg-transparent border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-200'}`}>
                                    <Bot size={12} /> General
                                </button>
                                {COACHING_MODES.map((m) => (
                                    <button key={m.mode}
                                        onClick={() => triggerMode(m)}
                                        className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all whitespace-nowrap ${activeMode === m.mode
                                            ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                                            : 'bg-transparent border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-200'}`}>
                                        <m.icon size={12} className={activeMode === m.mode ? 'text-amber-400' : m.color} />
                                        {m.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-5 min-h-0">
                            {messages.length === 0 && !loading && (
                                <div className="flex flex-col items-center justify-center h-full gap-5 text-center py-12">
                                    <div className="w-14 h-14 rounded-2xl bg-gray-900 border border-white/10 flex items-center justify-center">
                                        <Bot size={26} className="text-amber-500/50" />
                                    </div>
                                    <div>
                                        <p className="text-gray-300 text-sm font-medium">Choose a coaching mode above or ask me anything</p>
                                        <p className="text-gray-600 text-xs mt-1">Your resume data is loaded as context</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 max-w-sm w-full mt-2">
                                        {COACHING_MODES.slice(0, 4).map((m) => (
                                            <button key={m.mode} onClick={() => triggerMode(m)}
                                                className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-900 border border-white/10 hover:border-amber-500/30 hover:bg-amber-500/5 text-left transition-all">
                                                <m.icon size={14} className={m.color} />
                                                <div>
                                                    <p className="text-xs font-semibold text-gray-200">{m.label}</p>
                                                    <p className="text-xs text-gray-600">{m.desc}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <AnimatePresence initial={false}>
                                {messages.map((msg, i) => (
                                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                                        className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                        {/* Avatar */}
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border ${msg.role === 'assistant'
                                            ? 'bg-gray-900 border-white/10 text-amber-500'
                                            : 'bg-amber-500 border-amber-500 text-black'}`}>
                                            {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
                                        </div>

                                        {/* Content */}
                                        {msg.role === 'assistant' && msg.structured ? (
                                            <StructuredCard data={msg.structured} onCopy={copyText} />
                                        ) : (
                                            <div className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm
                                                ${msg.role === 'assistant'
                                                    ? 'bg-gray-800/70 border border-white/10 text-gray-200 rounded-tl-sm'
                                                    : 'bg-amber-500 text-black font-medium rounded-tr-sm'}`}>
                                                <p className="whitespace-pre-wrap">{msg.content}</p>
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            {loading && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-gray-900 border border-white/10 flex items-center justify-center">
                                        <Bot size={16} className="text-amber-500" />
                                    </div>
                                    <div className="bg-gray-800/70 border border-white/10 rounded-2xl rounded-tl-sm px-5 py-3.5 flex items-center gap-2">
                                        <Loader2 size={14} className="animate-spin text-amber-500" />
                                        <span className="text-xs text-gray-400">Coaching…</span>
                                    </div>
                                </motion.div>
                            )}
                            <div ref={bottomRef} />
                        </div>

                        {/* Input Bar */}
                        <div className="flex-shrink-0 border-t border-white/5 bg-gray-900/60 p-3">
                            {activeMode !== 'general' && (
                                <div className="flex items-center gap-2 mb-2 px-1">
                                    {(() => {
                                        const mc = COACHING_MODES.find(m => m.mode === activeMode);
                                        return mc ? (
                                            <>
                                                <mc.icon size={11} className={mc.color} />
                                                <span className="text-xs text-gray-500">{mc.label} mode active</span>
                                            </>
                                        ) : null;
                                    })()}
                                    <button onClick={() => setActiveMode('general')} className="text-xs text-amber-400 hover:underline ml-auto">
                                        Switch to General
                                    </button>
                                </div>
                            )}
                            <div className="flex gap-2">
                                <input
                                    ref={inputRef}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                                    className="flex-1 bg-gray-800 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-amber-500/50 transition-all"
                                    placeholder={activeMode === 'bullet_rewrite'
                                        ? 'Paste a resume bullet point to rewrite…'
                                        : 'Ask your career coach anything…'}
                                />
                                <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
                                    className="bg-amber-500 hover:bg-amber-400 text-black px-4 py-2.5 rounded-xl disabled:opacity-40 active:scale-95 transition-all flex items-center justify-center">
                                    {loading ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* ── Bullet Rewriter Modal ── */}
            <AnimatePresence>
                {showBulletModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
                        onClick={() => setShowBulletModal(false)}>
                        <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                            className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl"
                            onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center">
                                    <Pencil size={18} className="text-pink-400" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white">Resume Bullet Rewriter</h3>
                                    <p className="text-xs text-gray-500">AI will rewrite it with metrics & impact</p>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">
                                    Paste your resume bullet point
                                </label>
                                <textarea
                                    value={bulletInput}
                                    onChange={(e) => setBulletInput(e.target.value)}
                                    rows={3}
                                    placeholder='e.g. "Worked on backend API for the team"'
                                    className="w-full bg-gray-950 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-amber-500/50 transition-all resize-none"
                                    autoFocus
                                />
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setShowBulletModal(false)}
                                    className="flex-1 py-2.5 rounded-xl bg-gray-800 border border-white/10 text-gray-300 hover:text-white font-semibold text-sm transition-colors">Cancel</button>
                                <button onClick={submitBulletRewrite} disabled={!bulletInput.trim()}
                                    className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
                                    <Sparkles size={14} /> Rewrite It
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
