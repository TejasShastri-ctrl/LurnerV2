import React, { useState, useEffect } from 'react';
import { Trophy, Clock, Users, Calendar, ArrowRight, Zap, Award } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchContests } from '../api/api';

const Contests = () => {
    const { token } = useAuth();
    const [contests, setContests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const data = await fetchContests(token);
            setContests(data);
            setLoading(false);
        };
        load();
    }, [token]);

    const now = new Date();

    const activeContests = contests.filter(c => new Date(c.startTime) <= now && new Date(c.endTime) >= now);
    const upcomingContests = contests.filter(c => new Date(c.startTime) > now);
    const pastContests = contests.filter(c => new Date(c.endTime) < now);

    const ContestCard = ({ contest, status }) => {
        const start = new Date(contest.startTime);
        const end = new Date(contest.endTime);
        const durationMin = Math.round((end - start) / 60000);
        
        let statusBadge = "bg-white/5 text-white/40";
        let statusText = "Ended";
        let glowColor = "bg-white/40 shadow-white/40";
        
        if (status === 'active') {
            statusBadge = "bg-emerald-500/10 text-emerald-500";
            statusText = "Live Now";
            glowColor = "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,1)]";
        } else if (status === 'upcoming') {
            statusBadge = "bg-amber-500/10 text-amber-500";
            statusText = "Upcoming";
            glowColor = "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,1)]";
        }

        return (
            <div className="group relative flex flex-col gap-5 overflow-hidden rounded-2xl border border-white/5 bg-white/5 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-white/15 hover:bg-white/10 hover:shadow-[0_12px_30px_-10px_rgba(0,0,0,0.5)] cursor-pointer">
                
                {/* Status Badge */}
                <div className="flex items-start justify-between">
                    <div className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${statusBadge}`}>
                        {status === 'active' && <div className={`h-1.5 w-1.5 rounded-full ${glowColor}`} />}
                        {statusText}
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-xs font-medium text-white/30">
                        <Users size={14} />
                        {contest._count?.participants || 0} Joined
                    </div>
                </div>

                {/* Content */}
                <div>
                    <h3 className="mb-2 text-xl font-semibold text-white">{contest.title}</h3>
                    <p className="line-clamp-2 text-sm leading-relaxed text-white/50">
                        {contest.description || "Compete in this SQL challenge and climb the leaderboard."}
                    </p>
                </div>

                {/* Footer Metrics */}
                <div className="mt-auto flex gap-5 border-t border-white/5 pt-4">
                    <div className="flex items-center gap-1.5 text-sm text-white/70">
                        <Calendar size={15} className="text-indigo-400" />
                        {start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-white/70">
                        <Clock size={15} className="text-indigo-400" />
                        {durationMin} mins
                    </div>
                    {status === 'active' && (
                        <div className="ml-auto flex items-center text-sm font-semibold text-white">
                            Enter <ArrowRight size={16} className="ml-1 transition-transform group-hover:translate-x-1" />
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="mx-auto w-full max-w-7xl px-16 py-10">
            {/* Header Section */}
            <div className="mb-12 flex items-end justify-between">
                <div>
                    <h1 className="mb-3 flex items-center gap-4 text-4xl font-extrabold text-white">
                        <div className="flex rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 p-3">
                            <Trophy size={32} className="text-white" strokeWidth={1.5} />
                        </div>
                        Arena
                    </h1>
                    <p className="max-w-2xl text-lg leading-relaxed text-white/60">
                        Test your SQL mastery against other engineers in real-time. Compete in timed challenges, climb the global leaderboard, and prove your skills.
                    </p>
                </div>
                
                <div className="flex gap-4">
                    <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-center">
                        <div className="text-2xl font-bold text-white">{contests.length}</div>
                        <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-white/50">Total Contests</div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-24">
                    <div className="font-semibold text-indigo-400">Loading Arena...</div>
                </div>
            ) : (
                <div className="flex flex-col gap-10">
                    
                    {/* Active Contests */}
                    {activeContests.length > 0 && (
                        <div>
                            <h2 className="mb-5 flex items-center gap-2.5 text-xl font-semibold text-white">
                                <Zap size={18} className="text-emerald-500" /> Live Tournaments
                            </h2>
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {activeContests.map(c => <ContestCard key={c.id} contest={c} status="active" />)}
                            </div>
                        </div>
                    )}

                    {/* Upcoming Contests */}
                    {upcomingContests.length > 0 && (
                        <div>
                            <h2 className="mb-5 flex items-center gap-2.5 text-xl font-semibold text-white">
                                <Calendar size={18} className="text-amber-500" /> Upcoming Scheduled
                            </h2>
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {upcomingContests.map(c => <ContestCard key={c.id} contest={c} status="upcoming" />)}
                            </div>
                        </div>
                    )}

                    {/* Past Contests */}
                    {pastContests.length > 0 && (
                        <div>
                            <h2 className="mb-5 flex items-center gap-2.5 text-xl font-semibold text-white">
                                <Award size={18} className="text-white/40" /> Past Archives
                            </h2>
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {pastContests.map(c => <ContestCard key={c.id} contest={c} status="past" />)}
                            </div>
                        </div>
                    )}

                    {contests.length === 0 && !loading && (
                        <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 py-16 text-center">
                            <Trophy size={48} className="mx-auto mb-4 text-white/10" />
                            <h3 className="mb-2 text-xl text-white">No Contests Found</h3>
                            <p className="text-sm text-white/40">Check back later for new competitive events.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Contests;
