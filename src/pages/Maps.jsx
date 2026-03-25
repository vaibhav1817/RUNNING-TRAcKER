import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import { useEffect, useState } from "react";
import { useRun } from "../context/RunProvider";
import { formatTime } from "../utils/formatTime";
import { Play, Pause, Square, Navigation, Layers } from "lucide-react";
import "leaflet/dist/leaflet.css";

// ============================================================
// 🧮 CATMULL-ROM SPLINE — Smooth curve interpolation
//
// GPS updates every 1-3 seconds, leaving large gaps between
// points. Straight lines between these points look angular
// on corners. This algorithm generates numSegments smooth
// intermediate points between each pair of GPS fixes,
// producing a curve that passes THROUGH every measured point.
//
// Same technique used by Strava for route display.
// ============================================================
const catmullRomToPoints = (points, numSegments = 8) => {
    if (points.length < 2) return points.map(p => [p.lat, p.lng]);
    // For 2-3 points, not enough context for spline — just return raw
    if (points.length < 4) return points.map(p => [p.lat, p.lng]);

    const result = [];

    for (let i = 0; i < points.length - 1; i++) {
        // Clamp endpoints: duplicate first/last point as phantom control points
        const p0 = points[Math.max(0, i - 1)];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[Math.min(points.length - 1, i + 2)];

        for (let t = 0; t < numSegments; t++) {
            const s  = t / numSegments;
            const s2 = s * s;
            const s3 = s2 * s;

            // Catmull-Rom matrix formula (alpha = 0.5)
            const lat = 0.5 * (
                (2 * p1.lat) +
                (-p0.lat + p2.lat) * s +
                (2 * p0.lat - 5 * p1.lat + 4 * p2.lat - p3.lat) * s2 +
                (-p0.lat + 3 * p1.lat - 3 * p2.lat + p3.lat) * s3
            );
            const lng = 0.5 * (
                (2 * p1.lng) +
                (-p0.lng + p2.lng) * s +
                (2 * p0.lng - 5 * p1.lng + 4 * p2.lng - p3.lng) * s2 +
                (-p0.lng + 3 * p1.lng - 3 * p2.lng + p3.lng) * s3
            );

            result.push([lat, lng]);
        }
    }

    // Always include the final GPS point exactly
    const last = points[points.length - 1];
    result.push([last.lat, last.lng]);

    return result;
};

// 🔹 Fix for default Leaflet marker icons wanting 404s
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

// 🔹 Component to Auto-Center Map on User
function RecenterController({ location }) {
    const map = useMap();
    const [userInteracted, setUserInteracted] = useState(false);

    // Auto-center unless user interacted
    useEffect(() => {
        if (location && !userInteracted) {
            map.setView([location.lat, location.lng], map.getZoom(), { animate: true });
        }
    }, [location, userInteracted, map]);

    // Detect manual drag
    useEffect(() => {
        const onDrag = () => setUserInteracted(true);
        map.on("dragstart", onDrag);
        // Mobile specific touch events
        map.on("touchstart", onDrag);
        return () => {
            map.off("dragstart", onDrag);
            map.off("touchstart", onDrag);
        };
    }, [map]);

    return (
        <button
            onClick={(e) => {
                e.stopPropagation(); // prevent map click
                setUserInteracted(false);
                if (location) {
                    map.flyTo([location.lat, location.lng], 18, { animate: true, duration: 1.5 });
                }
            }}
            style={{
                position: 'absolute',
                bottom: '110px', // Adjusted to not overlap with bottom nav
                right: '20px',
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                zIndex: 1000,
                color: '#1c1c1e',
                border: 'none',
                cursor: 'pointer'
            }}
        >
            <Navigation size={20} fill={!userInteracted ? "#1c1c1e" : "none"} />
        </button>
    );
}

// 🔹 Map Layer Switcher
function LayerSwitcher({ currentStyle, setStyle }) {
    const [isOpen, setIsOpen] = useState(false);
    const styles = [
        { id: 'dark', label: 'Dark Mode' },
        { id: 'light', label: 'Light Mode' },
        { id: 'satellite', label: 'Satellite' },
    ];

    return (
        <div style={{ position: 'absolute', top: '100px', right: '20px', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'end' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '44px', height: '44px', borderRadius: '50%',
                    backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                }}
            >
                <Layers size={20} />
            </button>

            {isOpen && (
                <div style={{
                    marginTop: '10px',
                    backgroundColor: '#1e293b',
                    borderRadius: '12px',
                    padding: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    border: '1px solid rgba(255,255,255,0.1)'
                }}>
                    {styles.map(style => (
                        <button
                            key={style.id}
                            onClick={() => { setStyle(style.id); setIsOpen(false); }}
                            style={{
                                background: currentStyle === style.id ? '#3b82f6' : 'transparent',
                                border: 'none',
                                color: 'white',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                textAlign: 'left',
                                fontSize: '14px',
                                fontWeight: currentStyle === style.id ? '600' : '400'
                            }}
                        >
                            {style.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default function Maps() {
    const {
        location,
        routePath,
        status,
        time,
        distance,
        ghostSettings, // Access ghost settings
        currentPace, // Access instant pace
        startRun,
        pauseRun,
        resumeRun,
        stopRun
    } = useRun();

    // Calculate Ghost Position
    const getGhostPosition = () => {
        if (!ghostSettings || !routePath || routePath.length < 2) return null;

        const targetPace = ghostSettings.targetPace; // min/km
        const ghostDistanceKm = (time / 60) / targetPace; // km

        // If ghost hasn't started or user hasn't moved enough
        if (ghostDistanceKm <= 0) return routePath[0];

        // If ghost is ahead of user's TOTAL distance, we clamp it to the last known point 
        // (because we don't know the future path). 
        // In a real app, we'd Project the point forward, but clamping is safer for now.
        // OR: If we really want to show them ahead, we could extrapolate the last bearing.
        // For now, let's just trace the user's path.

        let covered = 0;
        for (let i = 0; i < routePath.length - 1; i++) {
            const p1 = routePath[i];
            const p2 = routePath[i + 1];

            // Calc segment distance
            const R = 6371;
            const dLat = (p2.lat - p1.lat) * (Math.PI / 180);
            const dLon = (p2.lng - p1.lng) * (Math.PI / 180);
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(p1.lat * (Math.PI / 180)) * Math.cos(p2.lat * (Math.PI / 180)) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const segDist = R * c;

            if (covered + segDist >= ghostDistanceKm) {
                // Ghost is on this segment
                const remaining = ghostDistanceKm - covered;
                const ratio = remaining / segDist;

                return {
                    lat: p1.lat + (p2.lat - p1.lat) * ratio,
                    lng: p1.lng + (p2.lng - p1.lng) * ratio
                };
            }
            covered += segDist;
        }

        // If ghost traveled further than the user has ran (Ghost is winning!)
        // We return the USER's last position (Ghost is right on your heels/ahead of you on the path you just made)
        return routePath[routePath.length - 1];
    };

    const ghostPos = getGhostPosition();

    // Map Style State (Default: Dark)
    const [mapStyle, setMapStyle] = useState('dark');

    // Helper to calculate pace — returns MM:SS string
    const calculatePace = () => {
        let paceMinKm = 0;

        if (status === 'running' && currentPace > 0) {
            paceMinKm = currentPace;
        } else if (distance > 0.01 && time > 0) {
            paceMinKm = (time / 60) / distance; // average pace in min/km
        }

        if (paceMinKm <= 0 || paceMinKm > 30) return "–:––";

        const mins = Math.floor(paceMinKm);
        const secs = Math.round((paceMinKm - mins) * 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Initial center (Default to a placeholder if no location yet)
    const initialCenter = [37.7749, -122.4194]; // San Francisco
    const center = location ? [location.lat, location.lng] : initialCenter;

    // Get Tile URL based on style
    const getTileLayer = () => {
        switch (mapStyle) {
            case 'light':
                return {
                    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                };
            case 'satellite':
                return {
                    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
                    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                };
            case 'dark':
            default:
                return {
                    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                };
        }
    };

    const tileInfo = getTileLayer();

    return (
        <div className="page" style={{ padding: 0, position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, overflow: 'hidden' }}>

            {/* 🔹 MAP CONTAINER */}
            <MapContainer
                center={center}
                zoom={16}
                style={{ width: "100%", height: "100%" }}
                zoomControl={false}
            >
                <TileLayer
                    attribution={tileInfo.attribution}
                    url={tileInfo.url}
                />

                {/* User Live Location Marker (Pulsing Dot) */}
                {location ? (
                    <Marker
                        position={[location.lat, location.lng]}
                        zIndexOffset={1000} // Force on top
                        icon={L.divIcon({
                            className: "user-location-marker",
                            html: `<div class="gps-puck"></div>`,
                            iconSize: [20, 20],
                            iconAnchor: [10, 10]
                        })}
                    />
                ) : (
                    // Optional: Show a default marker or nothing, but the overlay will handle the UI
                    null
                )}

                {/* Start Marker (Fixed at initial point) */}
                {routePath.length > 0 && (
                    <Marker
                        position={[routePath[0].lat, routePath[0].lng]}
                        zIndexOffset={900}
                        icon={L.divIcon({
                            className: "start-marker",
                            html: `<div style="background-color: #22c55e; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
                            iconSize: [14, 14],
                            iconAnchor: [7, 7]
                        })}
                    />
                )}

                {/* Ghost Marker (Only in Ghost Mode) */}
                {ghostPos && (
                    <Marker
                        position={[ghostPos.lat, ghostPos.lng]}
                        zIndexOffset={999}
                        icon={L.divIcon({
                            className: "ghost-marker",
                            // Glowing Red Dot with Opacity
                            html: `<div style="
                                background-color: rgba(239, 68, 68, 0.9); 
                                width: 20px; height: 20px; 
                                border-radius: 50%; 
                                border: 2px solid white; 
                                box-shadow: 0 0 15px rgba(239, 68, 68, 0.8);
                                display: flex; align-items: center; justify-content: center;
                                color: white; font-size: 10px; font-weight: bold;
                            ">G</div>`,
                            iconSize: [20, 20],
                            iconAnchor: [10, 10]
                        })}
                    />
                )}

                {/* Stop Marker (Red Dot) - Shows only when PAUSED or IDLE (if run exists) */}
                {routePath.length > 1 && (status === 'paused' || status === 'idle') && (
                    <Marker
                        position={[routePath[routePath.length - 1].lat, routePath[routePath.length - 1].lng]}
                        zIndexOffset={950}
                        icon={L.divIcon({
                            className: "stop-marker",
                            html: `<div style="background-color: #ef4444; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
                            iconSize: [14, 14],
                            iconAnchor: [7, 7]
                        })}
                    />
                )}

                {/* Run Path — Smooth Catmull-Rom Spline */}
                {routePath.length > 1 && (() => {
                    // Adaptive segmentation: reduce segments for long runs to maintain perf
                    // ≤100 pts → 10 segs/pt | ≤300 → 7 | >300 → 5
                    const segs = routePath.length <= 100 ? 10
                                : routePath.length <= 300 ? 7
                                : 5;
                    const smoothed = catmullRomToPoints(routePath, segs);

                    return (
                        <>
                            {/* Glow / halo layer (slightly wider, lower opacity) */}
                            <Polyline
                                positions={smoothed}
                                color="#3b82f6"
                                weight={10}
                                opacity={0.25}
                                smoothFactor={0}
                                lineCap="round"
                                lineJoin="round"
                            />
                            {/* Main solid line */}
                            <Polyline
                                positions={smoothed}
                                color="#60a5fa"
                                weight={4}
                                opacity={0.95}
                                smoothFactor={0}
                                lineCap="round"
                                lineJoin="round"
                            />
                        </>
                    );
                })()}

                {/* Controller (Auto Recenter + Button) */}
                <RecenterController location={location} />
            </MapContainer>

            {/* 🔹 WAITING FOR GPS OVERLAY */}
            {!location && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'rgba(0,0,0,0.8)',
                    color: 'white',
                    padding: '16px 24px',
                    borderRadius: '12px',
                    zIndex: 2000,
                    textAlign: 'center',
                    pointerEvents: 'none'
                }}>
                    <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>Searching for GPS...</div>
                    <div style={{ fontSize: '12px', opacity: 0.7 }}>Ensure location is enabled</div>
                </div>
            )}

            {/* 🔹 LAYER SWITCHER */}
            <LayerSwitcher currentStyle={mapStyle} setStyle={setMapStyle} />

            {/* 🔹 GPS SIGNAL INDICATOR */}
            <div style={{
                position: 'absolute',
                top: '60px', // Above Layer Switcher
                right: '20px',
                zIndex: 1000,
                background: 'rgba(28, 28, 30, 0.85)',
                backdropFilter: 'blur(10px)',
                padding: '8px 12px',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)'
            }}>
                <div style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    background: (!location) ? 'grey' : (location.accuracy && location.accuracy < 20) ? '#22c55e' : '#f59e0b',
                    boxShadow: (!location) ? 'none' : (location.accuracy && location.accuracy < 20) ? '0 0 8px #22c55e' : 'none',
                    animation: (!location) ? 'blink 1s infinite' : 'none'
                }}></div>
                <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold' }}>
                    {(!location) ? "GPS SEARCH" : (location.accuracy && location.accuracy < 20) ? "LOCKED" : "WEAK"}
                </span>
            </div>

            {/* 🔹 OVERLAY: STATS CARD */}
            <div style={{
                position: 'absolute',
                top: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '90%',
                maxWidth: '400px',
                backgroundColor: 'rgba(28, 28, 30, 0.85)',
                backdropFilter: 'blur(10px)',
                borderRadius: '20px',
                padding: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                color: 'white',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                zIndex: 1000
            }}>
                <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '12px', opacity: 0.7, display: 'block', letterSpacing: '0.5px' }}>TIME</span>
                    <span style={{ fontSize: '24px', fontWeight: '700', fontFamily: 'system-ui, sans-serif', fontVariantNumeric: 'tabular-nums' }}>{formatTime(time)}</span>
                </div>
                <div style={{ width: '1px', height: '30px', background: 'rgba(255,255,255,0.2)' }}></div>
                <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '12px', opacity: 0.7, display: 'block', letterSpacing: '0.5px' }}>KM</span>
                    <span style={{ fontSize: '24px', fontWeight: '700', fontFamily: 'system-ui, sans-serif', fontVariantNumeric: 'tabular-nums' }}>{Number(distance).toFixed(2)}</span>
                </div>
                <div style={{ width: '1px', height: '30px', background: 'rgba(255,255,255,0.2)' }}></div>
                <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '12px', opacity: 0.7, display: 'block', letterSpacing: '0.5px' }}>MIN/KM</span>
                    <span style={{ fontSize: '24px', fontWeight: '700', fontFamily: 'system-ui, sans-serif', fontVariantNumeric: 'tabular-nums' }}>{calculatePace()}</span>
                </div>
            </div>

            {/* 🔹 OVERLAY: CONTROLS */}
            <div style={{
                position: 'absolute',
                bottom: '110px', // Matches recenter button height roughly
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: '20px',
                zIndex: 1000
            }}>
                {status === 'idle' && (
                    <button onClick={startRun} className="btn-primary" style={{
                        width: '64px', height: '64px', borderRadius: '50%',
                        backgroundColor: '#22c55e',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 15px rgba(34, 197, 94, 0.4)',
                        border: 'none', cursor: 'pointer', margin: 0
                    }}>
                        <Play size={32} fill="white" color="white" />
                    </button>
                )}

                {status === 'running' && (
                    <button onClick={pauseRun} className="btn-primary" style={{
                        width: '64px', height: '64px', borderRadius: '50%',
                        backgroundColor: '#FF9F0A',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 15px rgba(255, 159, 10, 0.4)',
                        border: 'none', cursor: 'pointer', margin: 0
                    }}>
                        <Pause size={32} fill="white" color="white" />
                    </button>
                )}

                {status === 'paused' && (
                    <>
                        <button onClick={resumeRun} className="btn-primary" style={{
                            width: '64px', height: '64px', borderRadius: '50%',
                            backgroundColor: '#3b82f6',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
                            border: 'none', cursor: 'pointer', margin: 0
                        }}>
                            <Play size={32} fill="white" color="white" />
                        </button>
                        <button onClick={stopRun} className="btn-primary" style={{
                            width: '64px', height: '64px', borderRadius: '50%',
                            backgroundColor: '#ef4444',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)',
                            border: 'none', cursor: 'pointer', margin: 0
                        }}>
                            <Square size={24} fill="white" color="white" />
                        </button>
                    </>
                )}
            </div>

        </div>
    );
}
