import { useState } from "react";
import { ChevronRight, CheckCircle, Circle, MapPin, Trophy, Calendar, Zap, ArrowRight, X, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRun } from "../context/RunProvider";

const PLANS = [
    {
        id: '5k-beginner',
        title: 'Couch to 5K',
        duration: '8 Weeks',
        level: 'Beginner',
        color: '#22c55e',
        image: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
        desc: 'Build endurance gradually with walk/run intervals.'
    },
    {
        id: '10k-intermediate',
        title: '10K Builder',
        duration: '10 Weeks',
        level: 'Intermediate',
        color: '#3b82f6',
        image: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        desc: 'Increase mileage and introduce tempo runs.'
    },
    {
        id: 'half-marathon',
        title: 'Half Marathon',
        duration: '12 Weeks',
        level: 'Advanced',
        color: '#8b5cf6',
        image: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
        desc: 'Rigorous training for the 21.1 km distance.'
    }
];

const SCHEDULE = [
    { day: 'Mon', type: 'Rest Day', distance: '-', status: 'done' },
    { day: 'Tue', type: 'Easy Run', distance: '5 km', status: 'done' },
    { day: 'Wed', type: 'Intervals', distance: '4 km', status: 'missed' },
    { day: 'Thu', type: 'Tempo Run', distance: '7 km', status: 'upcoming' },
    { day: 'Fri', type: 'Rest Day', distance: '-', status: 'upcoming' },
    { day: 'Sat', type: 'Long Run', distance: '12 km', status: 'upcoming', highlight: true },
    { day: 'Sun', type: 'Recovery', distance: '3 km', status: 'upcoming' },
];

export default function Plan() {
    const { activePlan, joinPlan, leavePlan } = useRun();
    const [previewPlan, setPreviewPlan] = useState(null);

    // Helper to calculate current week
    const currentWeek = activePlan ? Math.min(Math.floor((new Date() - new Date(activePlan.startDate)) / (7 * 24 * 60 * 60 * 1000)) + 1, parseInt(activePlan.duration)) : 1;

    // CONFIRM QUIT HANDLER
    const handleQuit = () => {
        if (window.confirm("Are you sure you want to quit this plan? All progress will be lost.")) {
            leavePlan();
        }
    };

    // DASHBOARD VIEW
    if (activePlan) {
        return (
            <div className="page" style={{ justifyContent: 'flex-start', paddingTop: '20px', paddingBottom: '90px' }}>
                <div className="header-section">
                    <h1 className="page-title">Active Plan</h1>
                </div>

                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* Active Plan Header */}
                    <div className="card" style={{ padding: '24px', background: activePlan.image, borderRadius: '24px', position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'relative', zIndex: 2 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                <div>
                                    <span style={{ fontSize: '12px', fontWeight: 'bold', background: 'rgba(0,0,0,0.3)', padding: '4px 8px', borderRadius: '8px', color: 'white' }}>
                                        WEEK {currentWeek} / {parseInt(activePlan.duration)}
                                    </span>
                                    <h2 style={{ fontSize: '28px', color: 'white', margin: '12px 0 4px 0' }}>{activePlan.title}</h2>
                                    <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px' }}>Consistency is key. Keep it up!</p>
                                </div>
                                <Trophy size={48} color="rgba(255,255,255,0.2)" />
                            </div>

                            {/* Progress Bar */}
                            <div style={{ marginTop: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'rgba(255,255,255,0.8)', marginBottom: '6px' }}>
                                    <span>Progress</span>
                                    <span>{Math.round((currentWeek / parseInt(activePlan.duration)) * 100)}%</span>
                                </div>
                                <div style={{ width: '100%', height: '6px', background: 'rgba(0,0,0,0.2)', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ width: `${(currentWeek / parseInt(activePlan.duration)) * 100}%`, height: '100%', background: 'white', borderRadius: '3px' }}></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Schedule */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#e2e8f0' }}>This Week</h3>
                            <button onClick={handleQuit} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '14px', cursor: 'pointer', fontWeight: '600' }}>Quit Plan</button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {SCHEDULE.map((item, index) => (
                                <div key={index} style={{
                                    display: 'grid',
                                    gridTemplateColumns: '40px 1fr auto',
                                    alignItems: 'center',
                                    padding: '16px',
                                    background: item.highlight ? 'linear-gradient(to right, #1e293b, #0f172a)' : '#1e293b',
                                    borderRadius: '16px',
                                    border: item.highlight ? `1px solid ${activePlan.color}` : '1px solid rgba(255,255,255,0.05)',
                                    opacity: 1
                                }}>
                                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#64748b' }}>{item.day}</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <span style={{ fontSize: '15px', fontWeight: '600', color: 'white' }}>{item.type}</span>
                                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>{item.distance}</span>
                                    </div>
                                    <div>
                                        <Circle size={20} color="#475569" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // GALLERY & PREVIEW VIEW
    return (
        <div className="page" style={{ justifyContent: 'flex-start', paddingTop: '20px', paddingBottom: '90px' }}>
            <div className="header-section">
                <h1 className="page-title">Training Plans</h1>
            </div>

            {/* PREVIEW MODAL */}
            <AnimatePresence>
                {previewPlan && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 50, display: 'flex', alignItems: 'end', justifyContent: 'center' }}
                        onClick={() => setPreviewPlan(null)}
                    >
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            style={{ width: '100%', maxWidth: '500px', background: '#1e293b', padding: '24px', borderTopLeftRadius: '24px', borderTopRightRadius: '24px' }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <span style={{ fontSize: '12px', fontWeight: 'bold', color: previewPlan.color, textTransform: 'uppercase', letterSpacing: '1px' }}>{previewPlan.duration} • {previewPlan.level}</span>
                                <button onClick={() => setPreviewPlan(null)} style={{ background: 'none', border: 'none', color: 'white' }}><X /></button>
                            </div>

                            <h2 style={{ fontSize: '28px', color: 'white', margin: '0 0 12px 0' }}>{previewPlan.title}</h2>
                            <p style={{ color: '#94a3b8', fontSize: '16px', lineHeight: '1.5', marginBottom: '24px' }}>{previewPlan.desc}</p>

                            <button
                                onClick={() => { joinPlan(previewPlan); setPreviewPlan(null); }}
                                style={{
                                    width: '100%', padding: '16px', borderRadius: '16px', border: 'none',
                                    background: previewPlan.color, color: 'white', fontSize: '18px', fontWeight: 'bold',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer'
                                }}
                            >
                                <Play fill="currentColor" size={20} /> Start Training Plan
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* GALLERY LIST */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
                <div className="card" style={{ padding: '20px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                    <h3 style={{ fontSize: '18px', marginBottom: '8px', color: '#fff' }}>Find your next goal</h3>
                    <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: '1.5' }}>
                        Select a training plan tailored to your fitness level and distance goals.
                    </p>
                </div>

                <div style={{ display: 'grid', gap: '16px' }}>
                    {PLANS.map((plan) => (
                        <motion.div
                            key={plan.id}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setPreviewPlan(plan)}
                            className="card"
                            style={{
                                padding: '0',
                                overflow: 'hidden',
                                border: 'none',
                                cursor: 'pointer',
                                position: 'relative'
                            }}
                        >
                            <div style={{ height: '80px', background: plan.image, padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <div style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)', letterSpacing: '1px' }}>
                                        {plan.duration} • {plan.level}
                                    </div>
                                    <h2 style={{ fontSize: '20px', color: 'white', margin: '4px 0 0 0' }}>{plan.title}</h2>
                                </div>
                                <ArrowRight color="white" size={24} />
                            </div>
                            <div style={{ padding: '16px', background: '#1e293b' }}>
                                <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>{plan.desc}</p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
