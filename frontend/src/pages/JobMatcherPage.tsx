import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Search, MapPin, Clock, TrendingUp, ChevronRight, Loader2, Zap, X } from 'lucide-react';
import { jobApi, resumeApi } from '../lib/api';
import { useResumeStore } from '../stores/resumeStore';

interface Job { _id: string; title: string; company: string; location: string; type: string; experienceLevel: string; salaryMin?: number; salaryMax?: number; currency: string; industry: string; }
interface Match { job: Job; matchScore: number; matchedSkills: string[]; missingSkills: string[]; }

const scoreColor = (s: number) => s >= 70 ? 'text-emerald-400' : s >= 40 ? 'text-amber-400' : 'text-red-400';
const scoreBg = (s: number) => s >= 70 ? 'bg-emerald-500/10 border-emerald-500/20' : s >= 40 ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20';

export default function JobMatcherPage() {
    const navigate = useNavigate();
    const { resumes, setResumes, selectedResumeId, selectResume } = useResumeStore();
    const [matches, setMatches] = useState<Match[]>([]);
    const [searchResults, setSearchResults] = useState<Job[]>([]);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState<'matches' | 'search'>('matches');

    useEffect(() => {
        resumeApi.list().then(({ data }) => {
            const list = Array.isArray(data.data) ? data.data : (data.data?.resumes ?? []);
            setResumes(list);
        }).catch(console.error);
    }, []);

    const loadMatches = async (resumeId: string) => {
        selectResume(resumeId);
        setLoading(true);
        try {
            const { data } = await jobApi.getMatches(resumeId);
            setMatches(data.data.matches ?? []);
            setTab('matches');
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const search = async () => {
        if (!query.trim()) return;
        setLoading(true);
        try {
            const { data } = await jobApi.search(query);
            setSearchResults(data.data ?? []);
            setTab('search');
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const container = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.08 } }
    };
    const item = {
        hidden: { opacity: 0, y: 16 },
        show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-text-primary">Job Matcher</h1>
                    <p className="text-text-secondary mt-1">Find jobs that match your skills and experience</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <Briefcase size={22} className="text-primary" />
                </div>
            </motion.div>

            {/* Resume selector */}
            <AnimatePresence>
                {resumes.length > 0 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="card flex gap-3 flex-wrap items-center">
                        <p className="text-sm font-semibold text-text-secondary flex items-center gap-2">
                            <Zap size={14} className="text-primary" /> Match against:
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {resumes.map((r) => (
                                <motion.button key={r._id} onClick={() => loadMatches(r._id)}
                                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                                    className={`text-sm px-4 py-1.5 rounded-lg border transition-all font-medium ${selectedResumeId === r._id
                                        ? 'bg-primary/10 border-primary/30 text-primary'
                                        : 'bg-slate-800/50 border-slate-700 text-text-secondary hover:text-text-primary hover:border-slate-600'}`}>
                                    {r.title}
                                </motion.button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Search bar */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="flex gap-3">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input value={query} onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && search()}
                        className="input-field pl-9"
                        placeholder="Search jobs by title, skill, company…" />
                    {query && (
                        <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                            <X size={14} />
                        </button>
                    )}
                </div>
                <motion.button onClick={search} disabled={loading || !query.trim()}
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    className="btn-secondary disabled:opacity-50">
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Search
                </motion.button>
            </motion.div>

            {/* Loading */}
            <AnimatePresence>
                {loading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex justify-center py-12">
                        <div className="flex flex-col items-center gap-4">
                            <Loader2 size={36} className="text-primary animate-spin" />
                            <p className="text-text-secondary text-sm animate-pulse">Searching jobs…</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Matches */}
            {!loading && tab === 'matches' && matches.length > 0 && (
                <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
                    <p className="text-sm text-text-secondary font-medium">{matches.length} matches found based on your resume</p>
                    {matches.map(({ job, matchScore, matchedSkills, missingSkills }) => (
                        <motion.div key={job._id} variants={item}
                            className="card hover:border-slate-700 hover:-translate-y-0.5 cursor-pointer"
                            onClick={() => navigate(`/jobs/${job._id}`)}>
                            <div className="flex gap-4">
                                <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center border flex-shrink-0 ${scoreBg(matchScore)}`}>
                                    <span className={`text-lg font-bold ${scoreColor(matchScore)}`}>{matchScore}%</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <h3 className="text-text-primary font-semibold text-lg">{job.title}</h3>
                                            <p className="text-text-secondary text-sm">{job.company}</p>
                                        </div>
                                        <span className="badge-skill capitalize flex-shrink-0">{job.type.replace('-', ' ')}</span>
                                    </div>
                                    <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
                                        <span className="flex items-center gap-1"><MapPin size={12} /> {job.location}</span>
                                        <span className="flex items-center gap-1"><Clock size={12} /> {job.experienceLevel}</span>
                                        {job.salaryMin && (
                                            <span className="flex items-center gap-1">
                                                <TrendingUp size={12} /> {job.currency} {job.salaryMin.toLocaleString()}–{job.salaryMax?.toLocaleString()}
                                            </span>
                                        )}
                                    </div>
                                    {matchedSkills.length > 0 && (
                                        <div className="mt-3 flex flex-wrap gap-1.5">
                                            {matchedSkills.slice(0, 5).map((s) => <span key={s} className="badge-matched text-xs">{s}</span>)}
                                            {missingSkills.slice(0, 3).map((s) => <span key={s} className="badge-missing text-xs border-dashed">{s}</span>)}
                                        </div>
                                    )}
                                </div>
                                <ChevronRight size={18} className="text-text-muted self-center flex-shrink-0" />
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            )}

            {/* Search Results */}
            {!loading && tab === 'search' && searchResults.length > 0 && (
                <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
                    <p className="text-sm text-text-secondary font-medium">{searchResults.length} results found</p>
                    {searchResults.map((job) => (
                        <motion.div key={job._id} variants={item} className="card hover:border-slate-700 hover:-translate-y-0.5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-text-primary font-semibold">{job.title}</h3>
                                    <p className="text-text-secondary text-sm">{job.company} · {job.location}</p>
                                </div>
                                <span className="badge-skill capitalize">{job.experienceLevel}</span>
                            </div>
                        </motion.div>
                    ))}
                </motion.div>
            )}

            {/* Empty state */}
            {!loading && matches.length === 0 && resumes.length === 0 && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="card py-16 text-center flex flex-col items-center">
                    <motion.div
                        animate={{ y: [0, -8, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                        className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
                        <Briefcase size={36} className="text-primary" />
                    </motion.div>
                    <h3 className="text-xl font-bold text-text-primary mb-2">No Resume Found</h3>
                    <p className="text-text-secondary mb-8 max-w-sm">Upload and analyze a resume to get personalized job matches</p>
                    <motion.button onClick={() => navigate('/upload')} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                        className="btn-primary mx-auto">
                        Upload Resume
                    </motion.button>
                </motion.div>
            )}
        </div>
    );
}
