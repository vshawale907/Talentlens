import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, BarChart2, Briefcase, Shield, Check, X, Search, Loader2 } from 'lucide-react';
import { adminApi } from '../lib/api';

interface Stats { totalUsers: number; activeUsers: number; totalResumes: number; totalAnalyses: number; totalJobs: number; revenue?: number; }
interface User { _id: string; name: string; email: string; role: string; subscriptionTier: string; isActive: boolean; createdAt: string; }

const StatCard = ({ icon: Icon, label, value, color }: { icon: typeof Users; label: string; value: number | string; color: string }) => (
    <div className={`card p-5 flex items-center gap-4 border-l-4 ${color}`}>
        <Icon size={24} className="text-text-muted" />
        <div>
            <p className="text-2xl font-bold text-text-primary">{typeof value === 'number' ? value.toLocaleString() : value}</p>
            <p className="text-sm font-medium text-text-secondary">{label}</p>
        </div>
    </div>
);

export default function AdminPage() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [togglingId, setTogglingId] = useState<string | null>(null);

    useEffect(() => {
        Promise.all([adminApi.getStats(), adminApi.getUsers()])
            .then(([s, u]) => { setStats(s.data.data.stats); setUsers(u.data.data.users ?? []); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const filtered = users.filter((u) =>
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    );

    const toggleStatus = async (id: string, isActive: boolean) => {
        setTogglingId(id);
        try {
            await adminApi.setUserStatus(id, !isActive);
            setUsers((us) => us.map((u) => u._id === id ? { ...u, isActive: !isActive } : u));
        } catch (e) { console.error(e); }
        finally { setTogglingId(null); }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-64"><Loader2 size={32} className="text-primary animate-spin" /></div>
    );

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="flex items-center gap-4 pb-6 border-b border-border">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <Shield size={24} className="text-amber-500" />
                </div>
                <div>
                    <h1 className="text-3xl font-extrabold text-text-primary tracking-tight">Admin Dashboard</h1>
                    <p className="text-text-secondary font-medium">Platform management and analytics</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard icon={Users} label="Total Users" value={stats?.totalUsers ?? 0} color="border-primary" />
                <StatCard icon={BarChart2} label="Total Analyses" value={stats?.totalAnalyses ?? 0} color="border-purple-500" />
                <StatCard icon={Briefcase} label="Job Listings" value={stats?.totalJobs ?? 0} color="border-emerald-500" />
                <StatCard icon={BarChart2} label="Total Resumes" value={stats?.totalResumes ?? 0} color="border-amber-500" />
            </div>

            {/* Users Table */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card !p-0 overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-border bg-slate-800/50">
                    <h2 className="text-lg font-bold text-text-primary">User Management</h2>
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input value={search} onChange={(e) => setSearch(e.target.value)}
                            className="input-field pl-9 py-2 text-sm w-64" placeholder="Search users…" />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-900/40">
                            <tr>
                                {['Name', 'Email', 'Role', 'Plan', 'Status', 'Joined', 'Action'].map((h) => (
                                    <th key={h} className="text-left py-4 px-6 text-xs font-bold text-text-muted uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filtered.map((u) => (
                                <tr key={u._id} className="hover:bg-slate-800/30 transition-colors group">
                                    <td className="py-4 px-6 text-text-primary font-bold">{u.name}</td>
                                    <td className="py-4 px-6 text-text-secondary">{u.email}</td>
                                    <td className="py-4 px-6">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider border ${u.role === 'admin' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-primary/10 text-primary border-primary/20'}`}>{u.role}</span>
                                    </td>
                                    <td className="py-4 px-6 text-text-secondary capitalize font-medium">{u.subscriptionTier}</td>
                                    <td className="py-4 px-6">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border ${u.isActive ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                            {u.isActive ? <><Check size={12} /> Active</> : <><X size={12} /> Inactive</>}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-text-muted font-medium text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                                    <td className="py-4 px-6">
                                        {u.role !== 'admin' && (
                                            <button onClick={() => toggleStatus(u._id, u.isActive)} disabled={togglingId === u._id}
                                                className={`text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-md border transition-all ${u.isActive ? 'border-red-500/20 text-red-500 hover:bg-red-500/10' : 'border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/10'}`}>
                                                {togglingId === u._id ? <Loader2 size={14} className="animate-spin" /> : u.isActive ? 'Deactivate' : 'Activate'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </div>
    );
}
