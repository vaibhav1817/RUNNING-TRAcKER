import { useState, useEffect } from "react";
import { useRun } from "../context/RunProvider";
import { Trophy, Users, User, Clock, MapPin } from "lucide-react";
import Loader from "../components/Loader";

export default function Community() {
    const { token, user } = useRun();
    const [activeTab, setActiveTab] = useState('leaderboard');
    const [leaderboard, setLeaderboard] = useState([]);
    const [feed, setFeed] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                if (activeTab === 'leaderboard') {
                    const res = await fetch('/api/community/leaderboard', {
                        headers: { 'x-auth-token': token }
                    });
                    const data = await res.json();
                    setLeaderboard(data);
                } else {
                    const res = await fetch('/api/community/feed', {
                        headers: { 'x-auth-token': token }
                    });
                    const data = await res.json();
                    setFeed(data);
                }
            } catch (err) {
                console.error("Failed to fetch community data:", err);
            } finally {
                setLoading(false);
            }
        };

        if (token) fetchData();
    }, [activeTab, token]);

    return (
        <div className="page" style={{ justifyContent: 'flex-start', paddingTop: '20px' }}>
            <div className="header-section" style={{ width: '100%', marginBottom: '20px' }}>
                <h1 className="page-title">Community</h1>
            </div>

            {/* TABS */}
            <div style={{ display: 'flex', background: '#1e293b', borderRadius: '12px', padding: '4px', marginBottom: '20px', width: '100%' }}>
                <button
                    onClick={() => setActiveTab('leaderboard')}
                    style={{
                        flex: 1, padding: '10px', borderRadius: '8px',
                        background: activeTab === 'leaderboard' ? '#3b82f6' : 'transparent',
                        color: activeTab === 'leaderboard' ? 'white' : '#94a3b8',
                        fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}
                >
                    <Trophy size={18} /> Leaderboard
                </button>
                <button
                    onClick={() => setActiveTab('feed')}
                    style={{
                        flex: 1, padding: '10px', borderRadius: '8px',
                        background: activeTab === 'feed' ? '#3b82f6' : 'transparent',
                        color: activeTab === 'feed' ? 'white' : '#94a3b8',
                        fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                    }}
                >
                    <Users size={18} /> Activity Feed
                </button>
            </div>

            {/* CONTENT */}
            {loading ? (
                <div style={{ padding: '40px' }}><Loader /></div>
            ) : (
                <div style={{ width: '100%' }}>

                    {/* LEADERBOARD VIEW */}
                    {activeTab === 'leaderboard' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {leaderboard.map((runner, index) => {
                                let rankColor = '#64748b'; // default
                                if (index === 0) rankColor = '#eab308'; // Gold
                                if (index === 1) rankColor = '#94a3b8'; // Silver
                                if (index === 2) rankColor = '#b45309'; // Bronze

                                const isMe = user && runner._id === user.id;

                                return (
                                    <div key={runner._id} className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', border: isMe ? '1px solid #3b82f6' : 'none' }}>
                                        <div style={{ fontSize: '20px', fontWeight: '900', color: rankColor, width: '24px', textAlign: 'center' }}>
                                            {index + 1}
                                        </div>

                                        {/* Avatar */}
                                        <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: '#334155', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {runner.profilePicture ? (
                                                <img src={runner.profilePicture} alt="User" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <User color="#94a3b8" />
                                            )}
                                        </div>

                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '16px', color: 'white' }}>
                                                {runner.username} {isMe && <span style={{ fontSize: '12px', color: '#3b82f6', marginLeft: '4px' }}>(You)</span>}
                                            </div>
                                            <div style={{ fontSize: '13px', color: '#94a3b8' }}>{runner.totalRuns} runs</div>
                                        </div>

                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#3b82f6' }}>{runner.totalDistance.toFixed(1)}</div>
                                            <div style={{ fontSize: '12px', color: '#64748b' }}>km</div>
                                        </div>
                                    </div>
                                );
                            })}

                            {leaderboard.length === 0 && <div style={{ textAlign: 'center', color: '#64748b', marginTop: '20px' }}>No runs recorded yet. Be the first!</div>}
                        </div>
                    )}

                    {/* PREVIEW FEED VIEW */}
                    {activeTab === 'feed' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {feed.map((run) => (
                                <div key={run.id} className="card" style={{ padding: '20px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '14px', background: '#334155', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {run.user.image ? (
                                                <img src={run.user.image} alt="User" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <User size={20} color="#94a3b8" />
                                            )}
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 'bold', color: 'white', fontSize: '15px' }}>{run.user.name}</div>
                                            <div style={{ fontSize: '12px', color: '#64748b' }}>{new Date(run.date).toLocaleDateString()} at {new Date(run.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px' }}>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'white' }}>{run.distance}</div>
                                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>km</div>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'white' }}>
                                                {Math.floor(run.time / 60)}:{(run.time % 60).toString().padStart(2, '0')}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>time</div>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'white' }}>{run.pace}</div>
                                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>/km</div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {feed.length === 0 && <div style={{ textAlign: 'center', color: '#64748b', marginTop: '20px' }}>No recent activity.</div>}
                        </div>
                    )}

                </div>
            )}
        </div>
    );
}
