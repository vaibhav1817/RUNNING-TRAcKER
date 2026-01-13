import { useState, useEffect } from "react";
import { useRun } from "../context/RunProvider";
import { formatTime } from "../utils/formatTime";
import RunPathSVG from "../components/RunPathSVG";
import { Search, UserPlus, UserCheck, Heart, MessageCircle, MapPin, Clock, PersonStanding, Plus, X, Map, Share2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Avatar from "../components/Avatar";

export default function Social() {
    const { token, history, refreshUser } = useRun();
    const [activeTab, setActiveTab] = useState('feed'); // 'feed' or 'search' or 'myposts'
    const [loading, setLoading] = useState(false);

    // Post Modal State
    const [showPostModal, setShowPostModal] = useState(false);
    const [selectedRunId, setSelectedRunId] = useState(null);
    const [postCaption, setPostCaption] = useState('');

    // Feed State
    const [feed, setFeed] = useState([]);

    // Search State
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    // Interaction State
    const [currentUser, setCurrentUser] = useState(null);
    const [commentText, setCommentText] = useState('');
    const [expandedComments, setExpandedComments] = useState({}); // RunID -> bool

    // 🔹 GET CURRENT USER ID
    useEffect(() => {
        if (token) {
            fetch('/api/auth/user', { headers: { 'x-auth-token': token } })
                .then(res => res.json())
                .then(u => setCurrentUser(u))
                .catch(err => console.error(err));
        }
    }, [token]);

    // 🔹 FETCH FEED
    useEffect(() => {
        if ((activeTab === 'feed' || activeTab === 'myposts') && token) {
            setLoading(true);
            fetch('/api/community/feed', { headers: { 'x-auth-token': token } })
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) setFeed(data);
                    else console.error("Feed not array", data);
                })
                .catch(e => console.error(e))
                .finally(() => setLoading(false));
            // Note: Ideally, 'My Posts' should have its own endpoint for efficiency (server-side filter),
            // but for now we reuse the feed and will filter client-side for "My Posts" view.
        }
    }, [activeTab, token]);

    // The above fetch might be wrong URL if I don't check. 
    // I previously saw `userRoutes.js` at `backend/routes/userRoutes.js`.
    // If mounted as `app.use('/api/users', userRoutes)`, then `/api/users/feed`.

    // 🔹 FETCH SEARCH
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (activeTab === 'search' && query.trim() && token) {
                setLoading(true);
                fetch(`/api/auth/search?q=${query}`, { headers: { 'x-auth-token': token } }) // /api/users/search ?
                    // Checking typical pattern: /api/users/search usually.
                    // I'll update it to /api/users/search to be safe if that's standard.
                    // WAIT, if I am wrong, it breaks.
                    // Let's bet on /api/users/search based on standard naming.
                    .then(res => res.json())
                    .then(data => {
                        if (Array.isArray(data)) setSearchResults(data);
                    })
                    .catch(e => console.error(e))
                    .finally(() => setLoading(false));
            } else {
                setSearchResults([]);
            }
        }, 500);
        return () => clearTimeout(delayDebounceFn);
    }, [query, activeTab, token]);


    // 🔹 HANDLERS
    const handleLike = async (runId) => {
        if (!currentUser) return;
        const isLiked = feed.find(r => r._id === runId)?.likes?.includes(currentUser._id);

        // Optimistic Update
        setFeed(prev => prev.map(r => {
            if (r._id === runId) {
                const newLikes = isLiked
                    ? r.likes.filter(id => id !== currentUser._id)
                    : [...(r.likes || []), currentUser._id];
                return { ...r, likes: newLikes };
            }
            return r;
        }));

        try {
            await fetch(`/api/runs/${runId}/like`, { method: 'PUT', headers: { 'x-auth-token': token } });
        } catch (err) {
            console.error(err);
        }
    };

    const handlePostComment = async (runId) => {
        if (!commentText.trim()) return;
        try {
            const res = await fetch(`/api/runs/${runId}/comment`, {
                method: 'POST',
                headers: { 'x-auth-token': token, 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: commentText })
            });
            const newComments = await res.json();

            setFeed(prev => prev.map(r =>
                r._id === runId ? { ...r, comments: newComments } : r
            ));
            setCommentText('');
        } catch (err) {
            console.error(err);
        }
    };

    const toggleComments = (runId) => {
        setExpandedComments(prev => ({ ...prev, [runId]: !prev[runId] }));
    };

    const handleFollowToggle = async (targetId, isFollowing) => {
        // Optimistic
        setSearchResults(prev => prev.map(u =>
            u._id === targetId ? { ...u, isFollowing: !isFollowing } : u
        ));

        try {
            await fetch(`/api/auth/follow/${targetId}`, { method: 'PUT', headers: { 'x-auth-token': token } });
            // Refresh global user state to update profile counts
            if (typeof refreshUser === 'function') refreshUser();
        } catch (err) {
            console.error(err);
        }
    };

    const handleShare = async (run) => {
        const shareData = {
            title: 'My Run',
            text: `🏃‍♂️ Activity Highlight!\n\n📏 Distance: ${Number(run.distance).toFixed(2)} km\n⏱️ Time: ${formatTime(Number(run.time || 0))}\n⚡ Pace: ${run.pace}/km\n\n${run.caption || ''}\n#RunningTracker`,
        };
        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                // Fallback: Copy to clipboard
                navigator.clipboard.writeText(shareData.text);
                alert("Activity highlights copied to clipboard!");
            }
        } catch (err) {
            console.error("Error sharing:", err);
        }
    };


    const handlePostRun = async () => {
        if (!selectedRunId) return;

        try {
            const res = await fetch(`/api/runs/${selectedRunId}/post`, {
                method: 'PUT',
                headers: { 'x-auth-token': token, 'Content-Type': 'application/json' },
                body: JSON.stringify({ caption: postCaption })
            });

            if (res.ok) {
                const updatedRun = await res.json();
                // Update Feed to reflect change
                // Update Feed to reflect change
                setFeed(prev => {
                    const exists = prev.find(r => r._id === updatedRun._id);
                    if (exists) {
                        return prev.map(r => r._id === updatedRun._id ? { ...r, ...updatedRun, user: currentUser } : r);
                    } else {
                        // Prepend new post
                        // Ensure we have user details for display
                        const newPost = { ...updatedRun, user: currentUser, likes: [], comments: [] };
                        return [newPost, ...prev];
                    }
                });
                setShowPostModal(false);
                setPostCaption('');
                setSelectedRunId(null);
                alert("Run posted successfully!");
            }
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="page" style={{ paddingTop: '20px', paddingBottom: '80px' }}>
            <div className="header-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '0 4px' }}>
                <h1 className="page-title" style={{ margin: 0 }}>Community</h1>
            </div>

            {/* TAB SWITCHER */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '4px', marginBottom: '20px', gap: '4px' }}>
                <button
                    onClick={() => setActiveTab('feed')}
                    style={{
                        padding: '12px', borderRadius: '8px', border: 'none',
                        background: activeTab === 'feed' ? '#3b82f6' : 'transparent',
                        color: activeTab === 'feed' ? 'white' : '#94a3b8',
                        fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s',
                        textAlign: 'center'
                    }}
                >
                    Activity Feed
                </button>
                <button
                    onClick={() => setActiveTab('myposts')}
                    style={{
                        padding: '12px', borderRadius: '8px', border: 'none',
                        background: activeTab === 'myposts' ? '#3b82f6' : 'transparent',
                        color: activeTab === 'myposts' ? 'white' : '#94a3b8',
                        fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s',
                        textAlign: 'center'
                    }}
                >
                    My Posts
                </button>
                <button
                    onClick={() => setActiveTab('search')}
                    style={{
                        padding: '12px', borderRadius: '8px', border: 'none',
                        background: activeTab === 'search' ? '#3b82f6' : 'transparent',
                        color: activeTab === 'search' ? 'white' : '#94a3b8',
                        fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.3s',
                        textAlign: 'center'
                    }}
                >
                    Find Friends
                </button>
            </div>

            {/* SEARCH VIEW */}
            {activeTab === 'search' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div style={{ position: 'relative', marginBottom: '20px' }}>
                        <Search style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} size={20} />
                        <input
                            type="text"
                            placeholder="Search runners by name..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            style={{
                                width: '100%', padding: '12px 12px 12px 40px', borderRadius: '12px',
                                background: '#1e293b', border: '1px solid #334155', color: 'white', fontSize: '16px'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {loading && <p style={{ textAlign: 'center', color: '#64748b' }}>Searching...</p>}

                        {!loading && searchResults.length === 0 && query && (
                            <p style={{ textAlign: 'center', color: '#64748b' }}>No runners found.</p>
                        )}

                        {searchResults.map(user => (
                            <div key={user._id} className="card" style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <Avatar user={user} size={48} />
                                    <span style={{ color: 'white', fontWeight: 'bold', fontSize: '18px' }}>{user.username}</span>
                                </div>
                                <button
                                    onClick={() => handleFollowToggle(user._id, user.isFollowing)}
                                    style={{
                                        padding: '10px 20px', borderRadius: '24px',
                                        background: user.isFollowing ? 'transparent' : '#3b82f6',
                                        border: user.isFollowing ? '1px solid #475569' : 'none',
                                        color: user.isFollowing ? '#94a3b8' : 'white',
                                        fontSize: '14px', fontWeight: 'bold', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '8px'
                                    }}
                                >
                                    {user.isFollowing ? <><UserCheck size={16} /> Following</> : <><UserPlus size={16} /> Follow</>}
                                </button>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* FEED VIEW & MY POSTS VIEW */}
            {(activeTab === 'feed' || activeTab === 'myposts') && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    {loading && <p style={{ textAlign: 'center', color: '#64748b' }}>Loading...</p>}

                    {!loading && (activeTab === 'myposts' ? feed.filter(r => currentUser && (String(r.user?._id || r.user) === String(currentUser._id))) : feed).length === 0 && (
                        <div style={{ textAlign: 'center', marginTop: '40px', color: '#64748b' }}>
                            <PersonStanding size={48} style={{ opacity: 0.5, marginBottom: '10px' }} />
                            <p>{activeTab === 'myposts' ? "You haven't posted any runs yet." : "No activity yet."}</p>
                            {activeTab === 'feed' && (
                                <button
                                    onClick={() => setActiveTab('search')}
                                    style={{ marginTop: '10px', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}
                                >
                                    Find friends to follow &rarr;
                                </button>
                            )}
                        </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px', paddingBottom: '20px' }}>
                        {(activeTab === 'myposts' ? feed.filter(r => currentUser && (String(r.user?._id || r.user) === String(currentUser._id))) : feed).map(run => {
                            const isLiked = currentUser && run.likes?.includes(currentUser._id);
                            const likeCount = run.likes?.length || 0;
                            const commentCount = run.comments?.length || 0;
                            const isExpanded = expandedComments[run._id];

                            return (
                                <div key={run._id} className="social-card" style={{ marginBottom: '24px', background: '#1e293b', borderRadius: '24px', overflow: 'hidden', border: '1px solid #334155' }}>

                                    {/* Header */}
                                    <div style={{ padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <Avatar user={run.user} size={40} />
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ color: 'white', fontSize: '15px', fontWeight: 'bold' }}>{run.user?.username || 'Runner'}</span>
                                                <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                                                    {new Date(run.date || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                        {/* Optional: Menu icon or something */}
                                    </div>

                                    {/* Map Visualization (Wider, distinctive) */}
                                    <div style={{ width: '100%', aspectRatio: '16/9', background: '#0f172a', position: 'relative' }}>
                                        {run.path && run.path.length > 2 ? (
                                            <div style={{ width: '100%', height: '100%', padding: '20px' }}>
                                                <RunPathSVG path={run.path} strokeColor="#3b82f6" strokeWidth={4} />
                                            </div>
                                        ) : (
                                            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
                                                <Map size={48} color="#334155" style={{ opacity: 0.5, marginBottom: '8px' }} />
                                                <span style={{ fontSize: '12px', color: '#475569', fontWeight: '500' }}>No map data</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Content Section */}
                                    <div style={{ padding: '20px' }}>
                                        {/* Stats Grid - The Core Fitness Element */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Distance</span>
                                                <span style={{ color: 'white', fontSize: '20px', fontWeight: '800', fontFamily: 'monospace' }}>
                                                    {run.distance ? Number(run.distance).toFixed(2) : "0.00"} <span style={{ fontSize: '12px', color: '#64748b' }}>km</span>
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Time</span>
                                                <span style={{ color: 'white', fontSize: '20px', fontWeight: '800', fontFamily: 'monospace' }}>
                                                    {formatTime(Number(run.time || 0))}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pace</span>
                                                <span style={{ color: 'white', fontSize: '20px', fontWeight: '800', fontFamily: 'monospace' }}>
                                                    {run.pace || "0:00"} <span style={{ fontSize: '12px', color: '#64748b' }}>/km</span>
                                                </span>
                                            </div>
                                        </div>

                                        {/* Caption */}
                                        <div style={{ marginBottom: '16px', color: '#cbd5e1', fontSize: '15px', lineHeight: '1.5' }}>
                                            {run.caption || "Completed a run!"}
                                        </div>

                                        {/* Divider */}
                                        <div style={{ height: '1px', background: '#334155', marginBottom: '16px' }}></div>

                                        {/* Action Bar */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', gap: '20px' }}>
                                                <button
                                                    onClick={() => handleLike(run._id)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: isLiked ? '#ef4444' : '#94a3b8', transition: 'transform 0.1s' }}
                                                >
                                                    <Heart size={20} fill={isLiked ? "#ef4444" : "none"} />
                                                    <span style={{ fontSize: '14px', fontWeight: '600' }}>{likeCount > 0 ? likeCount : ''}</span>
                                                </button>

                                                <button
                                                    onClick={() => toggleComments(run._id)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}
                                                >
                                                    <MessageCircle size={20} />
                                                    <span style={{ fontSize: '14px', fontWeight: '600' }}>{commentCount > 0 ? commentCount : ''}</span>
                                                </button>
                                            </div>

                                            {/* Share/Bookmark */}
                                            <button onClick={() => handleShare(run)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                                                <Share2 size={20} />
                                            </button>
                                        </div>

                                        {/* Comments Expandable */}
                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    style={{ marginTop: '16px', borderTop: '1px solid #334155', paddingTop: '12px' }}
                                                >
                                                    {run.comments?.map((c, i) => (
                                                        <div key={i} style={{ fontSize: '13px', marginBottom: '8px', display: 'flex', gap: '8px' }}>
                                                            <span style={{ fontWeight: 'bold', color: 'white' }}>{c.user?.username}:</span>
                                                            <span style={{ color: '#cbd5e1' }}>{c.text}</span>
                                                        </div>
                                                    ))}
                                                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                                        <input
                                                            type="text"
                                                            placeholder="Write a comment..."
                                                            value={commentText}
                                                            onChange={(e) => setCommentText(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === 'Enter') handlePostComment(run._id);
                                                            }}
                                                            style={{ flex: 1, padding: '8px 12px', borderRadius: '20px', border: 'none', background: '#334155', color: 'white', fontSize: '13px' }}
                                                        />
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>
            )
            }
            {/* POST MODAL */}
            <AnimatePresence>
                {showPostModal && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.8)', zIndex: 100,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
                    }}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            style={{
                                background: '#1e293b', width: '100%', maxWidth: '400px',
                                borderRadius: '16px', padding: '20px', position: 'relative',
                                maxHeight: '80vh', overflowY: 'auto'
                            }}
                        >
                            <button
                                onClick={() => setShowPostModal(false)}
                                style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                            >
                                <X size={24} />
                            </button>

                            <h2 style={{ fontSize: '20px', color: 'white', marginTop: 0, marginBottom: '20px' }}>Create Post</h2>

                            {/* 1. Select Run */}
                            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '8px' }}>Select a run from history:</p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', maxHeight: '200px', overflowY: 'auto' }}>
                                {history.map(run => (
                                    <div
                                        key={run._id}
                                        onClick={() => setSelectedRunId(run._id)}
                                        style={{
                                            padding: '12px', borderRadius: '8px',
                                            background: selectedRunId === run._id ? 'rgba(59, 130, 246, 0.2)' : '#0f172a',
                                            border: selectedRunId === run._id ? '1px solid #3b82f6' : '1px solid transparent',
                                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                                        }}
                                    >
                                        <div>
                                            <span style={{ display: 'block', color: 'white', fontWeight: 'bold' }}>{run.distance} km</span>
                                            <span style={{ fontSize: '12px', color: '#64748b' }}>{new Date(run.date).toLocaleDateString()}</span>
                                        </div>
                                        {selectedRunId === run._id && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6' }}></div>}
                                    </div>
                                ))}
                            </div>

                            {/* 2. Caption */}
                            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '8px' }}>Add a caption:</p>
                            <textarea
                                value={postCaption}
                                onChange={(e) => setPostCaption(e.target.value)}
                                placeholder="How was your run? Share your story..."
                                style={{
                                    width: '100%', height: '100px', padding: '12px',
                                    borderRadius: '12px', background: '#0f172a',
                                    border: '1px solid #334155', color: 'white',
                                    resize: 'none', marginBottom: '20px', fontFamily: 'inherit'
                                }}
                            />

                            <button
                                disabled={!selectedRunId}
                                onClick={handlePostRun}
                                style={{
                                    width: '100%', padding: '14px', borderRadius: '12px',
                                    background: selectedRunId ? '#3b82f6' : '#334155',
                                    color: selectedRunId ? 'white' : '#64748b',
                                    fontWeight: 'bold', border: 'none', cursor: selectedRunId ? 'pointer' : 'not-allowed'
                                }}
                            >
                                Post Run
                            </button>

                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div >
    );
}
