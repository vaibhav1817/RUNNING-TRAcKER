import { useState, useMemo, useEffect } from "react";
import { useRun } from "../context/RunProvider";
import { formatTime } from "../utils/formatTime";
import { Timer, Play, Pause, Square, Zap, Volume2, VolumeX } from "lucide-react";
import { motion } from "framer-motion";
import QuoteWidget from "../components/QuoteWidget";
import WeatherWidget from "../components/WeatherWidget";

function HeroRing({ percentage, label, value, subValue, extraInfo, children }) {
  const radius = 160;
  const stroke = 12;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: radius * 2, height: radius * 2, margin: '0 auto' }}>
      <svg
        height={radius * 2}
        width={radius * 2}
        style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}
      >
        {/* Background Ring */}
        <circle
          stroke="#1e293b"
          strokeWidth={stroke}
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        {/* Progress Ring */}
        <motion.circle
          stroke="url(#gradient)"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          style={{ strokeDasharray: circumference + ' ' + circumference }}
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>

      {/* Content Inside Ring */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px'
      }}>
        <span style={{ fontSize: '14px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>{label}</span>
        <span style={{ fontSize: '56px', fontWeight: '800', lineHeight: '1', fontVariantNumeric: 'tabular-nums' }}>{value}</span>
        <span style={{ fontSize: '18px', color: '#64748b' }}>{subValue}</span>

        {/* Extra Stats (Pace/Calories) */}
        {extraInfo && (
          <div style={{ display: 'flex', gap: '16px', marginTop: '8px', opacity: 0.8 }}>
            {extraInfo}
          </div>
        )}

        {children}
      </div>
    </div>
  );
}

export default function Home() {
  const {
    status,
    time,
    distance,
    history,
    startRun,
    pauseRun,
    resumeRun,
    stopRun,
    activePlan,
    ghostSettings,
    currentPace, // New Instant Pace
    fetchBestRun,
    location,
    voiceEnabled,
    setVoiceEnabled,
    isStarting // <--- New State
  } = useRun();

  const [challengeMode, setChallengeMode] = useState(false);
  const [bestRunData, setBestRunData] = useState(null);

  // Date for greeting
  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // Current Week Calculation for Home
  const currentWeek = activePlan ? Math.min(Math.floor((new Date() - new Date(activePlan.startDate)) / (7 * 24 * 60 * 60 * 1000)) + 1, parseInt(activePlan.duration)) : 1;

  // Live Metrics Calculation
  // Use currentPace if available and running, otherwise fallback to average or 0
  const displayPace = (status === 'running' && currentPace > 0) ? currentPace.toFixed(2) : ((distance > 0 ? (time / 60 / distance).toFixed(2) : "0.00"));

  const runCalories = Math.floor(distance * 60); // Approx 60 kcal/km

  // GHOST CALCULATIONS (Async Fetch)
  useEffect(() => {
    if (challengeMode) {
      if (!bestRunData && typeof fetchBestRun === 'function') { // Only fetch if not already loaded and function exists
        fetchBestRun().then(run => {
          if (run) setBestRunData(run);
        });
      }
    } else {
      setBestRunData(null); // Clear best run data when challenge mode is off
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challengeMode]);

  const bestPace = bestRunData ? parseFloat(bestRunData.pace).toFixed(2) : null;

  // Countdown Logic
  const [localCount, setLocalCount] = useState("");
  useEffect(() => {
    if (isStarting) {
      setLocalCount("3");
      const t1 = setTimeout(() => setLocalCount("2"), 1000);
      const t2 = setTimeout(() => setLocalCount("1"), 2000);
      // t3 not strictly needed as isStarting becomes false
      return () => { clearTimeout(t1); clearTimeout(t2); }; // Cleanup
    }
  }, [isStarting]);

  const handleStart = () => {
    if (challengeMode && bestRunData) {
      startRun({ ghostPace: parseFloat(bestRunData.pace) });
    } else {
      startRun();
    }
  };

  // Difference vs Ghost (in km)
  // Logic: Ghost distance = time (mins) / pace. Real distance is 'distance'.
  const ghostDiff = useMemo(() => {
    if (!ghostSettings || !time) return 0;
    const ghostDist = (time / 60) / ghostSettings.targetPace;
    return distance - ghostDist;
  }, [ghostSettings, time, distance]);

  return (
    <div className="page home-page" style={{ justifyContent: 'flex-start', paddingTop: '40px' }}>

      {/* Header */}
      <div style={{ width: '100%', marginBottom: '20px', paddingLeft: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="greeting" style={{ fontSize: '28px', marginBottom: '4px' }}>
            {new Date().getHours() < 12 ? "Good Morning" : new Date().getHours() < 18 ? "Good Afternoon" : "Good Evening"}
          </h1>
          <p className="date" style={{ fontSize: '16px', opacity: 0.6 }}>{dateString}</p>
        </div>
        <WeatherWidget />
      </div>

      {/* MOTIVATIONAL QUOTE */}
      <QuoteWidget />

      {/* ACTIVE PLAN WIDGET (Only if plan exists & idle) */}
      {activePlan && status === 'idle' && (
        <div className="card" style={{ width: '100%', padding: '20px', marginBottom: '40px', background: 'linear-gradient(to right, #1e293b, #0f172a)', borderLeft: `4px solid ${activePlan.color}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: activePlan.color, textTransform: 'uppercase', letterSpacing: '1px' }}>
              Active Plan • Week {currentWeek}
            </span>
            <span style={{ fontSize: '12px', color: '#64748b' }}>{parseInt(activePlan.duration)} Weeks Total</span>
          </div>

          <h3 style={{ fontSize: '20px', margin: '0 0 8px 0', color: 'white' }}>{activePlan.title}</h3>
          <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0, marginBottom: '16px' }}>Next Session: Long Run (12 km)</p>

          <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${(currentWeek / parseInt(activePlan.duration)) * 100}%`, height: '100%', background: activePlan.color, borderRadius: '3px' }}></div>
          </div>
        </div>
      )}

      {/* HERO SECTION */}
      <div style={{ marginBottom: '50px', position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* Voice Toggle (Right - Like Quote Author) */}
        <button
          onClick={() => setVoiceEnabled(!voiceEnabled)}
          style={{
            position: 'absolute',
            top: '0px', // Sit at the very top of the Hero Section container (effectively below Quote)
            right: '20px', // Aligned Right
            background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%',
            width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: voiceEnabled ? '#22c55e' : '#64748b',
            backdropFilter: 'blur(5px)',
            zIndex: 10,
            transform: 'translateY(-50%)' // Pull it up slightly to bridge the gap
          }}
        >
          {voiceEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>
        {status === 'idle' || isStarting ? (
          <>
            <HeroRing
              percentage={100} // Full ring for aesthetic
              label={isStarting ? "STARTING IN" : (challengeMode ? "RACE VS BEST" : "START")}
              value={isStarting ? localCount : (challengeMode && bestPace ? `${bestPace} /km` : "RUN")}
              subValue={isStarting ? "GET READY" : (challengeMode ? "BEAT YOUR RECORD" : "GOAL: 5 KM")}
            >
              {!isStarting && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  animate={{
                    scale: [1, 1.05, 1],
                    boxShadow: [
                      challengeMode ? '0 0 20px rgba(239, 68, 68, 0.4)' : '0 0 20px rgba(34, 197, 94, 0.4)',
                      challengeMode ? '0 0 40px rgba(239, 68, 68, 0.7)' : '0 0 40px rgba(34, 197, 94, 0.7)',
                      challengeMode ? '0 0 20px rgba(239, 68, 68, 0.4)' : '0 0 20px rgba(34, 197, 94, 0.4)'
                    ]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  onClick={handleStart}
                  style={{
                    marginTop: '16px',
                    width: '80px', height: '80px', // Bigger start button
                    borderRadius: '50%',
                    background: challengeMode
                      ? 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' // Red Gradient
                      : 'linear-gradient(135deg, #4ade80 0%, #16a34a 100%)', // Neon Green Gradient
                    border: '4px solid rgba(255,255,255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  {challengeMode ? <Zap size={36} fill="white" style={{ marginLeft: '2px' }} /> : <Play size={36} fill="white" style={{ marginLeft: '4px' }} />}
                </motion.button>
              )}
            </HeroRing>

            {/* Mode Toggle (Hidden while starting) */}
            {!isStarting && (
              <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setChallengeMode(!challengeMode)}
                  style={{
                    background: challengeMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.05)',
                    border: challengeMode ? '1px solid #ef4444' : '1px solid rgba(255,255,255,0.1)',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    color: challengeMode ? '#ef4444' : '#94a3b8',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    display: 'flex', alignItems: 'center', gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <Zap size={14} />
                  {challengeMode ? "DISABLE GHOST MODE" : "ENABLE GHOST MODE"}
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Running State Ring (Metrics Only) */}
            <HeroRing
              percentage={(time % 60) / 60 * 100}
              label={status === 'paused' ? 'PAUSED' : 'RUNNING'}
              value={formatTime(time)}
              subValue={`${distance.toFixed(2)} km`}
              extraInfo={
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>PACE</span>
                    <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{displayPace}</span>
                  </div>
                  <div style={{ width: '1px', background: 'rgba(255,255,255,0.2)' }}></div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>CAL</span>
                    <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{runCalories}</span>
                  </div>

                  {/* GHOST STATS */}
                  {ghostSettings && (
                    <div style={{ position: 'absolute', bottom: '-70px', width: '200px', background: 'rgba(0,0,0,0.5)', padding: '10px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>VS BEST:</span>
                      <span style={{ fontSize: '14px', fontWeight: 'bold', color: ghostDiff >= 0 ? '#22c55e' : '#ef4444' }}>
                        {ghostDiff >= 0 ? '+' : ''}{ghostDiff.toFixed(2)} km
                      </span>
                    </div>
                  )}
                </>
              }
            />

            {/* Controls Below Ring */}
            <div style={{ display: 'flex', gap: '24px', marginTop: '40px' }}>
              {status === 'running' ? (
                <>
                  <button onClick={pauseRun} style={{
                    width: '72px', height: '72px', borderRadius: '50%',
                    background: '#facc15', border: 'none', color: 'black',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', boxShadow: '0 4px 20px rgba(250, 204, 21, 0.3)'
                  }}>
                    <Pause size={32} fill="black" />
                  </button>
                  <button onClick={stopRun} style={{
                    width: '72px', height: '72px', borderRadius: '50%',
                    background: '#ef4444', border: 'none', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', boxShadow: '0 4px 20px rgba(239, 68, 68, 0.3)'
                  }}>
                    <Square size={28} fill="white" />
                  </button>
                </>
              ) : (
                <>
                  <button onClick={resumeRun} style={{
                    width: '72px', height: '72px', borderRadius: '50%',
                    background: '#38bdf8', border: 'none', color: 'black',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', boxShadow: '0 4px 20px rgba(56, 189, 248, 0.3)'
                  }}>
                    <Play size={32} fill="black" />
                  </button>
                  <button onClick={stopRun} style={{
                    width: '72px', height: '72px', borderRadius: '50%',
                    background: '#ef4444', border: 'none', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', boxShadow: '0 4px 20px rgba(239, 68, 68, 0.3)'
                  }}>
                    <Square size={28} fill="white" />
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>

    </div >
  );
}
