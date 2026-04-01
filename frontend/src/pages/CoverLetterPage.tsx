import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Building, Briefcase, Loader2, Copy, Check, User, Mail, Phone, GraduationCap, Code, Sparkles } from 'lucide-react';
import { analysisApi } from '../lib/api';

export default function CoverLetterPage() {
    const [form, setForm] = useState({
        fullName: '',
        email: '',
        phone: '',
        jobTitle: '',
        company: '',
        skills: '',
        experience: '',
        projectTitle: '',
        projectDesc: '',
        education: '',
        whyInterested: ''
    });
    const [letter, setLetter] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [copied, setCopied] = useState(false);

    const generate = async () => {
        if (!form.fullName || !form.email || !form.jobTitle || !form.company || !form.skills) return;
        setLoading(true); setError(''); setLetter('');
        try {
            const { data } = await analysisApi.getCustomCoverLetter(form);
            setLetter(data.data.coverLetter ?? '');
        } catch (e: any) {
            setError(e?.response?.data?.message ?? 'Generation failed');
        } finally { setLoading(false); }
    };

    const copy = () => {
        navigator.clipboard.writeText(letter);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const isFormValid = !!(form.fullName.trim() && form.email.trim() && form.jobTitle.trim() && form.company.trim() && form.skills.trim() && form.education.trim() && form.whyInterested.trim());

    const inputCls = "w-full bg-gray-950 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25 focus:outline-none focus:border-amber-500/70 focus:ring-1 focus:ring-amber-500/30 transition-all text-sm";
    const textareaCls = `${inputCls} resize-none`;
    const labelCls = "block text-sm font-medium text-gray-400 mb-1.5";

    return (
        <div className="w-full bg-gray-950 text-gray-200 p-4 md:p-6 lg:p-8">
            <div className="max-w-[1400px] mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                            <FileText size={22} className="text-amber-500" />
                        </div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Cover Letter Generator</h1>
                    </div>
                    <p className="text-gray-400 mt-1 ml-1">Perfectly tailored cover letters based on your detailed profile</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* ── Left: Form ── */}
                    <div className="space-y-5">
                        {/* Personal Information */}
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
                            <h2 className="text-base font-semibold text-white flex items-center gap-2">
                                <div className="bg-blue-500/10 p-1.5 rounded-lg border border-blue-500/20">
                                    <User size={15} className="text-blue-400" />
                                </div>
                                Personal Information
                            </h2>
                            <div>
                                <label className={labelCls}>Full Name *</label>
                                <input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} className={inputCls} placeholder="John Doe" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>Email *</label>
                                    <div className="relative">
                                        <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                        <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={`${inputCls} pl-9`} placeholder="john@example.com" />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelCls}>Phone *</label>
                                    <div className="relative">
                                        <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                        <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className={`${inputCls} pl-9`} placeholder="+1 234 567 890" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Job Information */}
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
                            <h2 className="text-base font-semibold text-white flex items-center gap-2">
                                <div className="bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20">
                                    <Briefcase size={15} className="text-emerald-400" />
                                </div>
                                Job Information
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>Job Title *</label>
                                    <div className="relative">
                                        <Briefcase size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                        <input value={form.jobTitle} onChange={e => setForm(f => ({ ...f, jobTitle: e.target.value }))} className={`${inputCls} pl-9`} placeholder="Software Engineer" />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelCls}>Company Name *</label>
                                    <div className="relative">
                                        <Building size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                        <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} className={`${inputCls} pl-9`} placeholder="Google" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Candidate Profile */}
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
                            <h2 className="text-base font-semibold text-white flex items-center gap-2">
                                <div className="bg-purple-500/10 p-1.5 rounded-lg border border-purple-500/20">
                                    <Code size={15} className="text-purple-400" />
                                </div>
                                Candidate Profile
                            </h2>
                            <div>
                                <label className={labelCls}>Key Skills (comma separated) *</label>
                                <textarea value={form.skills} onChange={e => setForm(f => ({ ...f, skills: e.target.value }))} rows={2} className={textareaCls} placeholder="React, Node.js, MongoDB, JavaScript..." />
                            </div>
                            <div>
                                <label className={labelCls}>Work Experience <span className="text-gray-600 font-normal">(Optional)</span></label>
                                <textarea value={form.experience} onChange={e => setForm(f => ({ ...f, experience: e.target.value }))} rows={3} className={textareaCls} placeholder="Software Engineer at Acme Corp (2020-2023)..." />
                            </div>
                            <div className="space-y-3">
                                <label className={labelCls}>Highlight Project <span className="text-gray-600 font-normal">(Optional)</span></label>
                                <input value={form.projectTitle} onChange={e => setForm(f => ({ ...f, projectTitle: e.target.value }))} className={inputCls} placeholder="Project Title (e.g. AI Resume Analyzer)" />
                                <textarea value={form.projectDesc} onChange={e => setForm(f => ({ ...f, projectDesc: e.target.value }))} rows={2} className={textareaCls} placeholder="Short description of what you built and the impact..." />
                            </div>
                            <div>
                                <label className={labelCls}>Education *</label>
                                <div className="relative">
                                    <GraduationCap size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                    <input value={form.education} onChange={e => setForm(f => ({ ...f, education: e.target.value }))} className={`${inputCls} pl-9`} placeholder="B.E. Information Technology - MMCOE Pune" />
                                </div>
                            </div>
                            <div>
                                <label className={labelCls}>Why are you interested in this role? *</label>
                                <textarea value={form.whyInterested} onChange={e => setForm(f => ({ ...f, whyInterested: e.target.value }))} rows={2} className={textareaCls} placeholder="Interested in building scalable web applications..." />
                            </div>
                        </div>

                        <button
                            onClick={generate}
                            disabled={loading || !isFormValid}
                            className="w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 text-sm transition-all bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_20px_rgba(245,158,11,0.2)] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                            {loading ? 'Writing Perfect Cover Letter…' : 'Generate Cover Letter'}
                        </button>

                        {error && (
                            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm font-medium">
                                {error}
                            </div>
                        )}
                    </div>

                    {/* ── Right: Preview ── */}
                    <div className="lg:sticky lg:top-6 h-fit">
                        <AnimatePresence mode="wait">
                            {letter ? (
                                <motion.div
                                    key="letter"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden"
                                >
                                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
                                        <div className="flex items-center gap-2">
                                            <FileText size={16} className="text-amber-500" />
                                            <h2 className="text-base font-semibold text-white">Your Cover Letter</h2>
                                        </div>
                                        <button
                                            onClick={copy}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white text-xs font-semibold rounded-lg transition-colors"
                                        >
                                            {copied
                                                ? <><Check size={13} className="text-emerald-400" /> Copied!</>
                                                : <><Copy size={13} /> Copy Text</>
                                            }
                                        </button>
                                    </div>
                                    <div className="p-6 max-h-[72vh] overflow-y-auto">
                                        <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap font-serif">
                                            {letter}
                                        </p>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="placeholder"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="bg-gray-900 border border-gray-800 border-dashed rounded-2xl flex flex-col items-center justify-center text-center p-10 min-h-[340px]"
                                >
                                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-5">
                                        <FileText size={28} className="text-amber-500" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-white mb-2">Ready to generate</h3>
                                    <p className="text-gray-500 text-sm max-w-xs leading-relaxed">
                                        Fill out the required fields on the left and click generate to create a perfectly tailored cover letter.
                                    </p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}
