import { X, Calendar, Clock, Ruler, Zap, Flame } from "lucide-react";
import StaticMap from "./StaticMap";
import { formatTime } from "../utils/formatTime";

export default function RunDetails({ run, onClose, onDelete }) {
    if (!run) return null;

    return (
        <div className="modal-overlay" style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'end', // Sheet style on mobile
            justifyContent: 'center',
            animation: 'fadeIn 0.2s ease-out'
        }} onClick={onClose}>

            <div className="modal-content" style={{
                width: '100%',
                maxWidth: '500px',
                height: '85vh',
                backgroundColor: '#1e293b',
                borderTopLeftRadius: '24px',
                borderTopRightRadius: '24px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                animation: 'slideUp 0.3s ease-out'
            }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div>
                        <h2 style={{ fontSize: '20px', margin: 0 }}>Run Details</h2>
                        <span style={{ fontSize: '14px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                            <Calendar size={14} /> {new Date(run.date || Date.now()).toLocaleDateString()}
                        </span>
                    </div>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', padding: '8px', borderRadius: '50%', width: 'auto', border: 'none', cursor: 'pointer', color: 'white' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Map Section */}
                <div style={{ height: '300px', width: '100%', backgroundColor: '#0f172a', borderRadius: '16px', marginBottom: '24px', overflow: 'hidden' }}>
                    {run.path && run.path.length > 0 ? (
                        <StaticMap path={run.path} />
                    ) : (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                            No Map Data Available
                        </div>
                    )}
                </div>

                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="detail-stat">
                        <span className="label"><Ruler size={16} /> Distance</span>
                        <span className="value">{Number(run.distance || 0).toFixed(2)} <small>km</small></span>
                    </div>
                    <div className="detail-stat">
                        <span className="label"><Clock size={16} /> Time</span>
                        <span className="value">{formatTime(run.time || 0)}</span>
                    </div>
                    <div className="detail-stat">
                        <span className="label"><Zap size={16} /> Avg Pace</span>
                        <span className="value">{run.pace || "0.00"} <small>/km</small></span>
                    </div>
                    <div className="detail-stat">
                        <span className="label"><Flame size={16} /> Calories</span>
                        <span className="value">{run.calories || 0} <small>kcal</small></span>
                    </div>
                </div>

                {/* Pace Chart */}
                {run.path && run.path.length > 50 && (
                    <div style={{ marginTop: '24px' }}>
                        <h3 style={{ fontSize: '16px', color: '#e2e8f0', marginBottom: '12px' }}>Pace Analysis</h3>
                        <div style={{
                            background: '#334155', borderRadius: '16px', padding: '16px',
                            height: '150px', display: 'flex', alignItems: 'flex-end', position: 'relative', overflow: 'hidden'
                        }}>
                            {(() => {
                                // 1. Sample Data Points (Smoothed)
                                const points = [];
                                const SMOOTH_WINDOW = 5;
                                let maxPace = 0;
                                let minPace = 30; // Cap

                                for (let i = SMOOTH_WINDOW; i < run.path.length; i += 5) {
                                    // Calculate avg speed over window
                                    const p1 = run.path[i - SMOOTH_WINDOW];
                                    const p2 = run.path[i];

                                    // Raw dist
                                    // (Re-using logic from Splits - simplified dist here for perf)
                                    const R = 6371;
                                    const dLat = (p2.lat - p1.lat) * Math.PI / 180;
                                    const dLon = (p2.lng - p1.lng) * Math.PI / 180;
                                    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
                                    const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); // km

                                    const t = (p2.time - p1.time) / 1000 / 60; // mins

                                    if (d > 0.005) {
                                        let pace = t / d; // min/km
                                        if (pace > 30) pace = 30; // Cap outliers
                                        if (pace < 2) pace = 2;   // Cap outliers
                                        points.push(pace);
                                        if (pace > maxPace) maxPace = pace;
                                        if (pace < minPace) minPace = pace;
                                    }
                                }

                                if (points.length < 5) return <span style={{ color: '#64748b' }}>Not enough data</span>;

                                // 2. Normalize for Graph
                                // Y-Axis: Inverted (Faster is Higher visually usually? Or Lower pace value is higher up?)
                                // Let's make Faster (Lower Pace Value) -> Higher Y
                                // Height = 100%

                                const range = maxPace - minPace || 1;
                                const widthStep = 100 / (points.length - 1);

                                // Generate SVG Path
                                const pathD = points.map((p, i) => {
                                    const x = i * widthStep;
                                    // Normalize: (p - min) / range * 100
                                    // We want minPace (Fastest) at TOP (0% y - wait SVG 0 is top)
                                    // So minPace -> 10% Height
                                    // maxPace -> 90% Height
                                    const normalized = (p - minPace) / range;
                                    const y = 10 + (normalized * 80); // 10% to 90%
                                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                                }).join(' ');

                                return (
                                    <svg width="100%" height="100%" viewBox={`0 0 100 100`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                                        {/* Gradient Fill */}
                                        <defs>
                                            <linearGradient id="paceGradient" x1="0" x2="0" y1="0" y2="1">
                                                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.5" />
                                                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                                            </linearGradient>
                                        </defs>

                                        {/* Grid Lines */}
                                        <line x1="0" y1="10" x2="100" y2="10" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" strokeDasharray="2" />
                                        <line x1="0" y1="90" x2="100" y2="90" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" strokeDasharray="2" />

                                        {/* The Line */}
                                        <path d={pathD} fill="none" stroke="#60a5fa" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />

                                        {/* Labels (Min/Max Pace) */}
                                        {/* Note: In SVG text scaling is tricky with preserveAspectRatio=none. Using HTML overlay might be safer but let's try purely visual line first. */}
                                    </svg>
                                );
                            })()}

                            {/* Labels Overlay */}
                            <div style={{ position: 'absolute', top: 4, right: 8, fontSize: '10px', color: '#60a5fa', fontWeight: 'bold' }}>FAST</div>
                            <div style={{ position: 'absolute', bottom: 4, right: 8, fontSize: '10px', color: '#94a3b8' }}>SLOW</div>
                        </div>
                    </div>
                )}

                {/* Splits Section */}
                {run.path && run.path.length > 20 && (
                    <div style={{ marginTop: '24px' }}>
                        <h3 style={{ fontSize: '16px', color: '#e2e8f0', marginBottom: '12px' }}>Splits</h3>
                        <div style={{ background: '#334155', borderRadius: '12px', overflow: 'hidden' }}>
                            {(() => {
                                const splits = [];
                                let currentSplitDist = 0;
                                let currentSplitTime = 0;
                                let lastPt = run.path[0];
                                let splitIndex = 1;
                                let accumulatedDist = 0;

                                // Haversine Helper
                                const getDist = (pt1, pt2) => {
                                    const R = 6371;
                                    const dLat = (pt2.lat - pt1.lat) * Math.PI / 180;
                                    const dLon = (pt2.lng - pt1.lng) * Math.PI / 180;
                                    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                                        Math.cos(pt1.lat * Math.PI / 180) * Math.cos(pt2.lat * Math.PI / 180) *
                                        Math.sin(dLon / 2) * Math.sin(dLon / 2);
                                    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                                };

                                for (let i = 1; i < run.path.length; i++) {
                                    const pt = run.path[i];
                                    const d = getDist(lastPt, pt);
                                    const t = (pt.time - lastPt.time) / 1000; // seconds

                                    currentSplitDist += d;
                                    accumulatedDist += d;
                                    currentSplitTime += t;

                                    if (accumulatedDist >= splitIndex) {
                                        const pace = (currentSplitTime / 60) / currentSplitDist;
                                        const mins = Math.floor(pace);
                                        const secs = Math.round((pace - mins) * 60);
                                        splits.push({ km: splitIndex, pace: `${mins}:${secs.toString().padStart(2, '0')}` });

                                        splitIndex++;
                                        currentSplitDist = 0;
                                        currentSplitTime = 0;
                                    }
                                    lastPt = pt;
                                }

                                if (splits.length === 0) return <div style={{ padding: '16px', color: '#94a3b8', fontSize: '13px' }}>Run too short or GPS data insufficient for splits.</div>;

                                return splits.map((split) => (
                                    <div key={split.km} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <span style={{ color: '#94a3b8', fontSize: '14px' }}>KM {split.km}</span>
                                        <span style={{ color: 'white', fontWeight: 'bold' }}>{split.pace}</span>
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>
                )}

                {/* Delete Button */}
                {/* Action Buttons */}
                <div style={{ marginTop: 'auto', paddingTop: '24px', display: 'flex', gap: '12px' }}>
                    <button
                        disabled={run.isPosted}
                        onClick={() => {
                            const caption = window.prompt("Add a caption to your post (optional):");
                            if (caption === null) return; // User cancelled

                            fetch(`/api/runs/${run._id}/post`, {
                                method: 'PUT',
                                headers: { 'x-auth-token': localStorage.getItem('token'), 'Content-Type': 'application/json' },
                                body: JSON.stringify({ caption: caption })
                            }).then(res => {
                                if (res.ok) {
                                    alert("Posted!");
                                    onClose();
                                }
                            });
                        }}
                        style={{
                            flex: 1,
                            padding: '16px',
                            backgroundColor: run.isPosted ? 'rgba(59, 130, 246, 0.2)' : '#3b82f6',
                            color: run.isPosted ? '#94a3b8' : 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontWeight: '600',
                            cursor: run.isPosted ? 'default' : 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                        }}
                    >
                        {run.isPosted ? "Posted" : "Post Run"}
                    </button>
                    <button
                        onClick={() => {
                            if (window.confirm('Are you sure you want to delete this run?')) {
                                onDelete(run._id);
                                onClose();
                            }
                        }}
                        style={{
                            flex: 1,
                            padding: '16px',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                        }}
                    >
                        Delete Run
                    </button>
                </div>

                <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .detail-stat {
            background: #334155;
            padding: 16px;
            border-radius: 16px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .detail-stat .label {
            color: #94a3b8;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .detail-stat .value {
            font-size: 24px;
            font-weight: 700;
            color: white;
            font-family: system-ui, sans-serif;
            font-variant-numeric: tabular-nums;
        }
        .detail-stat .value small {
            font-size: 14px;
            font-weight: 500;
            color: #94a3b8;
        }
      `}</style>
            </div>
        </div>
    );
}
