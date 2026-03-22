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
        <div className="max-w-3xl mx-auto space-y-6">
            <div>
                <h1 className="text-4xl font-bold text-text-primary">Upload Resume</h1>
                <p className="text-text-secondary mt-1">Upload your PDF or DOCX resume to get AI-powered insights</p>
            </div>

            <AnimatePresence mode="wait">
                {step === 'upload' && (
                    <motion.div key="upload" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
                        {/* Dropzone */}
                        <div {...getRootProps()} className={`border-2 border-dashed rounded-xl p-14 text-center cursor-pointer transition-all duration-200
              ${isDragActive ? 'border-accent bg-accent-subtle' : file ? 'border-success bg-success-light' : 'border-border bg-background-panel hover:border-accent/50 hover:bg-accent-subtle/40'}`}>
                            <input {...getInputProps()} />
                            {file ? (
                                <div className="flex flex-col items-center gap-3">
                                    <CheckCircle size={40} className="text-emerald-400" />
                                    <div>
                                        <p className="text-text-primary font-medium">{file.name}</p>
                                        <p className="text-text-secondary text-sm">{(file.size / 1024).toFixed(0)} KB · {file.type.includes('pdf') ? 'PDF' : 'DOCX'}</p>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-text-muted hover:text-red-400 transition-colors">
                                        <X size={18} />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mb-1">
                                        <Upload size={28} className="text-white" />
                                    </div>
                                    <div>
                                        <p className="text-text-primary font-medium">{isDragActive ? 'Drop it here!' : 'Drop your resume here'}</p>
                                        <p className="text-text-secondary text-sm mt-1">PDF or DOCX · Max 10 MB</p>
                                    </div>
                                    <span className="btn-secondary text-sm mt-2">Browse Files</span>
                                </div>
                            )}
                        </div>

                        {/* Title */}
                        {file && (
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1.5">Resume Title</label>
                                <div className="relative">
                                    <FileText size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                                    <input value={title} onChange={(e) => setTitle(e.target.value)}
                                        className="input-field pl-9" placeholder="e.g. Senior Engineer Application" />
                                </div>
                            </div>
                        )}

                        {/* Job Description */}
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1.5">
                                <span className="flex items-center gap-2"><Briefcase size={14} /> Job Description <span className="text-text-muted font-normal">(optional — improves matching)</span></span>
                            </label>
                            <textarea value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} rows={5}
                                className="input-field resize-none" placeholder="Paste the target job description here for tailored ATS scoring and skill gap analysis..." />
                        </div>

                        <button onClick={handleSubmit} disabled={!file || isUploading} className="btn-primary w-full justify-center">
                            <Upload size={18} /> Analyze Resume
                        </button>
                    </motion.div>
                )}

                {step === 'analyzing' && (
                    <motion.div key="analyzing" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card p-16 text-center">
                        <Loader2 size={48} className="text-primary animate-spin mx-auto mb-6" />
                        <h2 className="text-xl font-bold text-text-primary mb-2">Analyzing Your Resume</h2>
                        <p className="text-text-secondary">Running NLP extraction + AI scoring…</p>
                        <div className="mt-6 space-y-2 text-sm text-text-muted">
                            {['Extracting text & cleaning…', 'Running NLP skill extraction…', 'Computing semantic similarity…', 'Generating AI insights…'].map((s, i) => (
                                <motion.p key={s} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.8 }}>{s}</motion.p>
                            ))}
                        </div>
                    </motion.div>
                )}

                {step === 'done' && (
                    <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card p-16 text-center">
                        <CheckCircle size={48} className="text-emerald-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-text-primary">Analysis Complete!</h2>
                        <p className="text-text-secondary mt-2">Redirecting to results…</p>
                    </motion.div>
                )}

                {step === 'error' && (
                    <motion.div key="error" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card p-12 text-center flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 mb-6">
                            <AlertCircle size={32} className="text-red-500" />
                        </div>
                        <h2 className="text-xl font-bold text-text-primary mb-2">Upload Failed</h2>
                        <p className="text-text-secondary mb-6">{errorMsg}</p>
                        <button onClick={() => setStep('upload')} className="btn-primary mx-auto">Try Again</button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
