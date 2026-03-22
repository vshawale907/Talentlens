import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Building, Briefcase, Loader2, Copy, Check, User, Mail, Phone, GraduationCap, Code } from 'lucide-react';
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

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-12">
            <div>
                <h1 className="text-3xl font-bold text-text-primary">Cover Letter Generator</h1>
                <p className="text-text-secondary mt-1">Perfectly tailored cover letters based on your detailed profile</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div className="card space-y-4">
                        <h2 className="text-lg font-bold text-text-primary mb-2 flex items-center gap-2">
                            <User size={20} className="text-primary" /> Personal Information
                        </h2>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1.5">Full Name *</label>
                            <input value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} className="input-field" placeholder="John Doe" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1.5">Email *</label>
                                <div className="relative">
                                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                                    <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input-field pl-9" placeholder="john@example.com" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1.5">Phone Number *</label>
                                <div className="relative">
                                    <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                                    <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="input-field pl-9" placeholder="+1 234 567 890" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card space-y-4">
                        <h2 className="text-lg font-bold text-text-primary mb-2 flex items-center gap-2">
                            <Briefcase size={20} className="text-primary" /> Job Information
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1.5">Job Title *</label>
                                <div className="relative">
                                    <Briefcase size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                                    <input value={form.jobTitle} onChange={e => setForm(f => ({ ...f, jobTitle: e.target.value }))} className="input-field pl-9" placeholder="Software Engineer" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1.5">Company Name *</label>
                                <div className="relative">
                                    <Building size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                                    <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} className="input-field pl-9" placeholder="Google" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card space-y-4">
                        <h2 className="text-lg font-bold text-text-primary mb-2 flex items-center gap-2">
                            <Code size={20} className="text-primary" /> Candidate Profile
                        </h2>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1.5">Key Skills (comma separated) *</label>
                            <textarea value={form.skills} onChange={e => setForm(f => ({ ...f, skills: e.target.value }))} rows={2} className="input-field resize-none bg-background-card" placeholder="React, Node.js, MongoDB, JavaScript..." />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1.5">Work Experience (Optional)</label>
                            <textarea value={form.experience} onChange={e => setForm(f => ({ ...f, experience: e.target.value }))} rows={3} className="input-field resize-none bg-background-card" placeholder="Software Engineer at Acme Corp (2020-2023)..." />
                        </div>
                        <div className="space-y-3">
                            <label className="block text-sm font-medium text-text-secondary">Highlight Project (Optional)</label>
                            <input value={form.projectTitle} onChange={e => setForm(f => ({ ...f, projectTitle: e.target.value }))} className="input-field" placeholder="Project Heading (e.g. AI Resume Analyzer)" />
                            <textarea value={form.projectDesc} onChange={e => setForm(f => ({ ...f, projectDesc: e.target.value }))} rows={2} className="input-field resize-none bg-background-card" placeholder="Short description of what you built and the impact..." />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1.5">Education (Degree / College) *</label>
                            <div className="relative">
                                <GraduationCap size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                                <input value={form.education} onChange={e => setForm(f => ({ ...f, education: e.target.value }))} className="input-field pl-9" placeholder="B.E. Information Technology - MMCOE Pune" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1.5">Why are you interested in the role? *</label>
                            <textarea value={form.whyInterested} onChange={e => setForm(f => ({ ...f, whyInterested: e.target.value }))} rows={2} className="input-field resize-none bg-background-card" placeholder="Interested in building scalable web applications..." />
                        </div>
                    </div>

                    <button onClick={generate} disabled={loading || !isFormValid} className="btn-primary w-full justify-center py-3 text-base shadow-lg hover:shadow-primary/20 transition-all">
                        {loading ? <Loader2 size={20} className="animate-spin" /> : <FileText size={20} />}
                        {loading ? 'Writing Perfect Cover Letter…' : 'Generate Cover Letter'}
                    </button>
                    {error && <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm font-medium">{error}</div>}
                </div>

                <div className="space-y-6 relative">
                    <AnimatePresence mode="wait">
                        {letter ? (
                            <motion.div key="letter" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="card pb-8 lg:sticky lg:top-24">
                                <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                                    <h2 className="text-lg font-bold text-text-primary">Your Cover Letter</h2>
                                    <button onClick={copy} className="btn-secondary text-sm">
                                        {copied ? <><Check size={16} className="text-emerald-500" /> Copied!</> : <><Copy size={16} /> Copy Text</>}
                                    </button>
                                </div>
                                <div className="bg-background-panel rounded-xl border border-border text-text-primary text-sm leading-relaxed whitespace-pre-wrap font-serif p-6 max-h-[60vh] overflow-y-auto">
                                    {letter}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div key="placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8 border-dashed border-2 border-border/50 lg:sticky lg:top-24 bg-background-panel/30">
                                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary">
                                    <FileText size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-text-primary mb-2">Ready to generate</h3>
                                <p className="text-text-secondary max-w-sm">
                                    Fill out the required information on the left and click generate to create a perfectly tailored cover letter that highlights your strengths.
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
