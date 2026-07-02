import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Clock, Users, Calendar, ArrowRight, Zap, Award } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { fetchContests } from '../api/api';

const Contests = () => {
    const navigate = useNavigate();
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
        
        let statusBadge = "bg-[#f9fafb] text-[#9ca3af] border border-[#e5e7eb]";
        let statusText = "Ended";
        let glowColor = "bg-[#d1d5db]";
        
        if (status === 'active') {
            statusBadge = "bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0]";
            statusText = "Live Now";
            glowColor = "bg-[#16a34a] shadow-[0_0_8px_#16a34a]";
        } else if (status === 'upcoming') {
            statusBadge = "bg-[#fffbeb] text-[#d97706] border border-[#fde68a]";
            statusText = "Upcoming";
            glowColor = "bg-[#d97706] shadow-[0_0_8px_#d97706]";
        }

        const handleCardClick = () => {
            if (status === 'upcoming') {
                alert("This contest has not started yet. Please check back at the scheduled start time!");
            } else {
                navigate(`/editor/contest/${contest.id}`);
            }
        };

        return (
            <div 
                onClick={handleCardClick}
                className="group relative flex flex-col gap-5 overflow-hidden rounded-[14px] border border-[#e5e7eb] bg-[#ffffff] p-6 shadow-[0_4px_12px_rgba(17,24,39,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-[#4f6ef7] hover:shadow-[0_8px_20px_rgba(17,24,39,0.12)] cursor-pointer"
            >
                
                {/* Status Badge */}
                <div className="flex items-start justify-between">
                    <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${statusBadge}`}>
                        {status === 'active' && <div className={`h-1.5 w-1.5 rounded-full ${glowColor}`} />}
                        {statusText}
                    </div>
                    
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#9ca3af]">
                        <Users size={14} />
                        {contest._count?.participants || 0} Joined
                    </div>
                </div>

                {/* Content */}
                <div>
                    <h3 className="mb-2 text-xl font-bold text-[#111827] group-hover:text-[#4f6ef7] transition-colors">{contest.title}</h3>
                    <p className="line-clamp-2 text-sm leading-relaxed text-[#4b5563]">
                        {contest.description || "Compete in this SQL challenge and climb the leaderboard."}
                    </p>
                </div>

                {/* Footer Metrics */}
                <div className="mt-auto flex gap-5 border-t border-[#e5e7eb] pt-4">
                    <div className="flex items-center gap-1.5 text-sm font-medium text-[#4b5563]">
                        <Calendar size={15} className="text-[#4f6ef7]" />
                        {start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </div>
                    <div className="flex items-center gap-1.5 text-sm font-medium text-[#4b5563]">
                        <Clock size={15} className="text-[#4f6ef7]" />
                        {durationMin} mins
                    </div>
                    {status === 'active' && (
                        <div className="ml-auto flex items-center text-sm font-bold text-[#4f6ef7]">
                            Enter <ArrowRight size={16} className="ml-1 transition-transform group-hover:translate-x-1" />
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="mx-auto w-full max-w-7xl px-8 py-10">
            {/* Header Section */}
            <div className="mb-12 flex items-end justify-between flex-wrap gap-4">
                <div>
                    <h1 className="mb-3 flex items-center gap-3 text-[2rem] font-bold text-[#111827] tracking-tight">
                        <div className="flex rounded-2xl bg-[#4f6ef7] p-3 shadow-[0_4px_12px_rgba(79,110,247,0.3)]">
                            <Trophy size={28} className="text-white" strokeWidth={2} />
                        </div>
                        Arena
                    </h1>
                    <p className="max-w-2xl text-base leading-relaxed text-[#4b5563]">
                        Test your SQL mastery against other engineers in real-time. Compete in timed challenges, climb the global leaderboard, and prove your skills.
                    </p>
                </div>
                
                <div className="flex gap-4">
                    <div className="rounded-[14px] border border-[#e5e7eb] bg-[#ffffff] shadow-[0_4px_12px_rgba(17,24,39,0.06)] px-7 py-3.5 text-center">
                        <div className="text-[1.5rem] font-bold text-[#111827]">{contests.length}</div>
                        <div className="mt-0.5 text-[0.7rem] font-bold uppercase tracking-wider text-[#9ca3af]">Total Contests</div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-24">
                    <div className="font-semibold text-[#4f6ef7]">Loading Arena...</div>
                </div>
            ) : (
                <div className="flex flex-col gap-10">
                    
                    {/* Active Contests */}
                    {activeContests.length > 0 && (
                        <div>
                            <h2 className="mb-5 flex items-center gap-2.5 text-xl font-bold text-[#111827]">
                                <Zap size={20} className="text-[#16a34a]" /> Live Tournaments
                            </h2>
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {activeContests.map(c => <ContestCard key={c.id} contest={c} status="active" />)}
                            </div>
                        </div>
                    )}

                    {/* Upcoming Contests */}
                    {upcomingContests.length > 0 && (
                        <div>
                            <h2 className="mb-5 flex items-center gap-2.5 text-xl font-bold text-[#111827]">
                                <Calendar size={20} className="text-[#d97706]" /> Upcoming Scheduled
                            </h2>
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {upcomingContests.map(c => <ContestCard key={c.id} contest={c} status="upcoming" />)}
                            </div>
                        </div>
                    )}

                    {/* Past Contests */}
                    {pastContests.length > 0 && (
                        <div>
                            <h2 className="mb-5 flex items-center gap-2.5 text-xl font-bold text-[#111827]">
                                <Award size={20} className="text-[#9ca3af]" /> Past Archives
                            </h2>
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {pastContests.map(c => <ContestCard key={c.id} contest={c} status="past" />)}
                            </div>
                        </div>
                    )}

                    {contests.length === 0 && !loading && (
                        <div className="rounded-[14px] border border-dashed border-[#e5e7eb] bg-[#ffffff] py-16 text-center shadow-[0_4px_12px_rgba(17,24,39,0.04)]">
                            <Trophy size={48} className="mx-auto mb-4 text-[#9ca3af]" />
                            <h3 className="mb-2 text-xl font-bold text-[#111827]">No Contests Found</h3>
                            <p className="text-sm text-[#9ca3af]">Check back later for new competitive events.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Contests;
