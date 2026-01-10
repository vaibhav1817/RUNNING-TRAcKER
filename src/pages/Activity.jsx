import { useState, useMemo } from "react";
import { useRun } from "../context/RunProvider";
import { formatTime } from "../utils/formatTime";
import { Clock, Ruler, ChevronRight, MapPin, Trophy, Zap, Calendar, TrendingUp } from "lucide-react";
import RunDetails from "../components/RunDetails";
import WeeklyReport from "../components/WeeklyReport";

export default function Activity() {
  const { history, deleteRun } = useRun();
  const [selectedRun, setSelectedRun] = useState(null);

  // Calculate Personal Records
  const personalRecords = useMemo(() => {
    if (history.length === 0) return null;

    const distances = history.map(r => Number(r.distance) || 0);
    const longestVal = Math.max(...distances);
    const totalDistance = distances.reduce((acc, curr) => acc + curr, 0);

    // Best Pace (Lowest value is better, filter out 0 or weird values)
    const validPaces = history.map(r => parseFloat(r.pace)).filter(p => !isNaN(p) && p > 0 && p < 30);
    const fastestPaceVal = validPaces.length > 0 ? Math.min(...validPaces) : 0;

    return {
      longestRun: longestVal.toFixed(2),
      totalDistance: totalDistance,
      bestPace: fastestPaceVal.toFixed(2)
    };
  }, [history]);

  return (
    <div className="page" style={{ justifyContent: 'flex-start', paddingTop: '20px', paddingBottom: '80px' }}>
      <div className="header-section">
        <h1 className="page-title">Activity History</h1>
      </div>

      <WeeklyReport />

      {/* Spacer */}
      <div style={{ height: '24px' }}></div>

      {/* PERSONAL RECORDS SECTION */}
      {history.length > 0 && personalRecords && (
        <div style={{ width: '100%', maxWidth: '380px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#e2e8f0', marginBottom: '12px' }}>Achievements</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {/* Longest Run */}
            <div className="card" style={{ padding: '16px', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Trophy size={16} color="#fbbf24" />
                <span style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Longest Run</span>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'white' }}>
                {personalRecords.longestRun} <span style={{ fontSize: '14px', color: '#64748b' }}>km</span>
              </div>
            </div>

            {/* Total Distance (Lifetime) */}
            <div className="card" style={{ padding: '16px', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <TrendingUp size={16} color="#bc6ff1" />
                <span style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Lifetime</span>
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'white' }}>
                {personalRecords.totalDistance.toFixed(0)} <span style={{ fontSize: '14px', color: '#64748b' }}>km</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#e2e8f0', width: '100%', maxWidth: '380px', marginBottom: '12px' }}>Recent Runs</h2>

      <div className="card" style={{ background: 'transparent', boxShadow: 'none', padding: 0 }}>
        {history.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: '40px', opacity: 0.6 }}>
            <div style={{ marginBottom: '16px', fontSize: '48px' }}>🏃</div>
            <p style={{ fontSize: '18px', fontWeight: 'bold' }}>No runs yet</p>
            <p style={{ fontSize: '14px', color: '#94a3b8' }}>Start your first run to see it here!</p>
          </div>
        )}

        <div className="history-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {history.slice().reverse().map((run) => (
            <div
              key={run._id}
              onClick={() => setSelectedRun(run)}
              className="history-item"
              style={{
                backgroundColor: '#1e293b',
                padding: '16px',
                borderRadius: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'transform 0.1s active',
                border: '1px solid rgba(255,255,255,0.05)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {/* Icon / Date Box */}
                <div style={{
                  width: '56px', height: '56px',
                  backgroundColor: '#334155',
                  borderRadius: '14px',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  color: '#94a3b8',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                }}>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{new Date(run.date || Date.now()).toLocaleDateString('en-US', { month: 'short' })}</span>
                  <span style={{ fontSize: '20px', color: 'white', lineHeight: '1' }}>{new Date(run.date || Date.now()).getDate()}</span>
                </div>

                {/* Main Stats */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '18px', fontWeight: '700', color: 'white', letterSpacing: '-0.5px' }}>
                    {(Number(run.distance) || 0).toFixed(2)} km
                  </span>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: '#94a3b8' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} /> {formatTime(run.time || 0)}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Zap size={12} /> {run.pace || "0.00"} /km
                    </span>
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronRight size={18} color="#94a3b8" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Details Modal */}
      {selectedRun && (
        <RunDetails
          run={selectedRun}
          onClose={() => setSelectedRun(null)}
          onDelete={deleteRun}
        />
      )}
    </div>
  );
}
