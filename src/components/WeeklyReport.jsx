import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
    Legend
} from "recharts";
import { useRun } from "../context/RunProvider";

export default function WeeklyReport() {
    const { history } = useRun();

    // 1. Generate last 7 days (dates)
    const getLast7Days = () => {
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            days.push(d.toLocaleDateString("en-US", { weekday: 'short' })); // e.g., "Mon"
        }
        return days;
    };

    const weekDays = getLast7Days();

    // 2. Aggregate history data
    const safeHistory = Array.isArray(history) ? history : [];
    const chartData = weekDays.map((dayLabel) => {
        // Find runs for this day
        // Note: dayLabel is "Mon", "Tue" etc.
        // We need to match it against run.date, which is an ISO string or Date object
        const run = safeHistory.find(h => {
            if (!h.date) return false;
            const runDay = new Date(h.date).toLocaleDateString("en-US", { weekday: 'short' });
            return runDay === dayLabel;
        });

        return {
            day: dayLabel,
            distance: run ? run.distance : 0,
            calories: run ? run.calories : 0,
            pace: run ? parseFloat(run.pace) || 0 : 0
        };
    });

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div style={{ background: '#1e293b', padding: '8px', borderRadius: '8px', border: '1px solid #334155' }}>
                    <p style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{label}</p>
                    <p style={{ color: payload[0].color, fontWeight: 'bold' }}>
                        {payload[0].value} {payload[0].name === 'distance' ? 'km' : 'min/km'}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="card" style={{ padding: '20px', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
            <h3 style={{ marginBottom: "20px", display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.2rem' }}>📊</span> Weekly Analysis
            </h3>

            {/* 1. Distance Volume (Bar Chart) - Best for visualizing accumulation */}
            <div style={{ marginBottom: '32px' }}>
                <h4 style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '12px' }}>Distance (Volume)</h4>
                <div style={{ height: '200px', width: '100%', minWidth: '280px' }}>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                            <XAxis
                                dataKey="day"
                                tick={{ fill: '#94a3b8', fontSize: 12 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                            <Bar
                                dataKey="distance"
                                fill="url(#barGradient)"
                                radius={[4, 4, 0, 0]}
                                barSize={20}
                            />
                            <defs>
                                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#22c55e" stopOpacity={1} />
                                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0.6} />
                                </linearGradient>
                            </defs>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* 2. Pace Trends (Line Chart) - Best for visualizing performance intensity */}
            <div>
                <h4 style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '12px' }}>Avg Pace (Consistency)</h4>
                <div style={{ height: '200px', width: '100%', minWidth: '280px' }}>
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                            <XAxis
                                dataKey="day"
                                tick={{ fill: '#94a3b8', fontSize: 12 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Line
                                type="monotone"
                                dataKey="pace"
                                stroke="#38bdf8"
                                strokeWidth={3}
                                dot={{ fill: '#38bdf8', r: 4, strokeWidth: 0 }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
