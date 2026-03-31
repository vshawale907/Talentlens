import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, X, Loader2, CheckCircle, AlertCircle, Briefcase } from 'lucide-react';
import { resumeApi } from '../lib/api';
import { useResumeStore } from '../stores/resumeStore';

export default function UploadPage() {
    const navigate = useNavigate();
    const { addResume, selectResume, setUploading, isUploading } = useResumeStore();
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [step, setStep] = useState<'upload' | 'analyzing' | 'done' | 'error'>('upload');
    const [errorMsg, setErrorMsg] = useState('');
    const [resumeId, setResumeId] = useState('');

    const onDrop = useCallback((accepted: File[]) => {
        if (accepted[0]) { setFile(accepted[0]); setTitle(accepted[0].name.replace(/\.[^.]+$/, '')); }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'application/pdf': ['.pdf'], 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'] },
        maxFiles: 1,
        maxSize: 10 * 1024 * 1024,
    });

    const handleSubmit = async () => {
        if (!file) return;
        setUploading(true); setStep('analyzing');
        try {
            // Step 1: Upload file → triggers BullMQ background job automatically
            const fd = new FormData();
            fd.append('resume', file);
            fd.append('title', title || file.name);
            const { data: uploadData } = await resumeApi.upload(fd);
            const resume = uploadData.data.resume;
            addResume(resume);
            setResumeId(resume._id);

            // Step 2: If user provided a job description, explicitly re-queue with JD
            if (jobDescription.trim()) {
                await resumeApi.analyze(resume._id, jobDescription);
            }

            // Step 3: Poll /status every 3s until analysis is ready (max 3 min)
            const maxWait = Date.now() + 3 * 60 * 1000;
            const poll = async (): Promise<void> => {
                if (Date.now() > maxWait) {
                    // Timeout — navigate anyway so user can see whatever partial data is there
                    selectResume(resume._id);
                    setStep('done');
                    setTimeout(() => navigate(`/analysis/${resume._id}`), 1200);
                    return;
                }
                const { data: statusData } = await resumeApi.getStatus(resume._id);
                const status = statusData.data.status as string;
                if (status === 'analyzed') {
                    selectResume(resume._id);
                    setStep('done');
                    setTimeout(() => navigate(`/analysis/${resume._id}`), 1200);
                } else if (status === 'error') {
                    throw new Error('Analysis failed in background worker. Please try again.');
                } else {
                    // Still processing — wait 3s and try again
                    await new Promise(r => setTimeout(r, 3000));
                    return poll();
                }
            };
            await poll();
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message
                ?? (err as { message?: string })?.message
                ?? 'Upload failed. Please try again.';
            setErrorMsg(msg);
            setStep('error');
        } finally { setUploading(false); }
    };


    return (
        <div className="max-w-3xl mx-auto space-y-6 pt-8 pb-12 px-4 sm:px-0">
            <div>
                <h1 className="text-4xl font-bold text-white tracking-tight">Upload Resume</h1>
                <p className="text-white/50 mt-1.5 text-base">Upload your PDF or DOCX resume to get AI-powered insights</p>
            </div>

            <AnimatePresence mode="wait">
                {step === 'upload' && (
                    <motion.div key="upload" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
                        {/* Dropzone */}
                        <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-14 text-center cursor-pointer transition-all duration-200 group
              ${isDragActive ? 'border-accent bg-accent/10' : file ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-white/10 bg-gray-900/50 hover:border-accent/40 hover:bg-gray-800'}`}>
                            <input {...getInputProps()} />
                            {file ? (
                                <div className="flex flex-col items-center gap-3">
                                    <CheckCircle size={40} className="text-emerald-400" />
                                    <div>
                                        <p className="text-white font-medium text-lg">{file.name}</p>
                                        <p className="text-white/50 text-sm mt-0.5">{(file.size / 1024).toFixed(0)} KB · {file.type.includes('pdf') ? 'PDF' : 'DOCX'}</p>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); setFile(null); }} className="mt-2 text-white/40 hover:text-red-400 p-2 rounded-full hover:bg-white/5 transition-all">
                                        <X size={20} />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center mb-1 group-hover:bg-accent/30 transition-colors">
                                        <Upload size={28} className="text-accent" />
                                    </div>
                                    <div>
                                        <p className="text-white font-medium text-lg">{isDragActive ? 'Drop it here!' : 'Drop your resume here'}</p>
                                        <p className="text-white/40 text-sm mt-1">PDF or DOCX · Max 10 MB</p>
                                    </div>
                                    <span className="px-5 py-2.5 rounded-lg bg-white/5 text-white/70 text-sm mt-3 border border-white/10 group-hover:bg-white/10 transition-colors">Browse Files</span>
                                </div>
                            )}
                        </div>

                        <div className="space-y-5 bg-gray-900/40 p-6 rounded-xl border border-white/5">
                            {/* Title */}
                            {file && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                                    <label className="block text-sm font-medium text-white/70 mb-2">Resume Title</label>
                                    <div className="relative">
                                        <FileText size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                                        <input value={title} onChange={(e) => setTitle(e.target.value)}
                                            className="w-full bg-gray-950 border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-white/20 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 transition-all duration-200" placeholder="e.g. Senior Engineer Application" />
                                    </div>
                                </motion.div>
                            )}

                            {/* Job Description */}
                            <div>
                                <label className="block text-sm font-medium text-white/70 mb-2">
                                    <span className="flex items-center gap-2">
                                        <Briefcase size={16} className="text-accent" /> 
                                        Target Job Description 
                                        <span className="text-white/30 font-normal text-xs ml-1">(Optional but recommended)</span>
                                    </span>
                                </label>
                                <textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} rows={6}
                                    className="w-full bg-gray-950 border border-white/10 rounded-xl px-5 py-4 text-white placeholder-white/20 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/50 transition-all duration-200 resize-none leading-relaxed" placeholder="Paste the exact job description you are applying for. Our AI will analyze your skill gaps and tailor the ATS scoring to this role..." />
                            </div>
                        </div>

                        <button onClick={handleSubmit} disabled={!file || isUploading} className="btn-accent w-full justify-center py-4 text-lg mt-2 shadow-lg shadow-accent/20">
                            <Upload size={20} /> {isUploading ? 'Preparing...' : 'Analyze Resume'}
                        </button>
                    </motion.div>
                )}

                {step === 'analyzing' && (
                    <motion.div key="analyzing" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-gray-900 border border-white/10 rounded-2xl p-16 text-center shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-white/5 overflow-hidden">
                            <motion.div className="h-full bg-accent" initial={{ x: '-100%' }} animate={{ x: '100%' }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} />
                        </div>
                        <Loader2 size={56} className="text-accent animate-spin mx-auto mb-6" />
                        <h2 className="text-2xl font-bold text-white mb-2">Analyzing Your Resume</h2>
                        <p className="text-white/50">Running deep AI insights & semantic extraction...</p>
                        <div className="mt-8 space-y-3 text-sm text-white/40">
                            {['Extracting text & formatting...', 'Running NLP skill extraction...', 'Computing semantic similarity...', 'Generating AI insights...'].map((s, i) => (
                                <motion.p key={s} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.9 }}>{s}</motion.p>
                            ))}
                        </div>
                    </motion.div>
                )}

                {step === 'done' && (
                    <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-gray-900 border border-emerald-500/20 rounded-2xl p-16 text-center shadow-2xl glow-gold">
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 15 }}>
                            <CheckCircle size={64} className="text-emerald-500 mx-auto mb-6 drop-shadow-lg" />
                        </motion.div>
                        <h2 className="text-2xl font-bold text-white">Analysis Complete!</h2>
                        <p className="text-white/60 mt-2">Redirecting you to your results dashboard...</p>
                    </motion.div>
                )}

                {step === 'error' && (
                    <motion.div key="error" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-gray-900 border border-red-500/20 rounded-2xl p-16 text-center shadow-2xl flex flex-col items-center">
                        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 mb-6 relative">
                            <div className="absolute inset-0 rounded-full animate-ping bg-red-500/20 opacity-75"></div>
                            <AlertCircle size={36} className="text-red-500 relative z-10" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-3">Upload Failed</h2>
                        <p className="text-red-400/80 mb-8 max-w-sm text-center leading-relaxed">{errorMsg}</p>
                        <button onClick={() => setStep('upload')} className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl border border-white/10 transition-colors font-medium">Try Again</button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
