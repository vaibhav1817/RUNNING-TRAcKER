import React, { useMemo } from 'react';

export default function RunPathSVG({ path, width = "100%", height = "100%", strokeColor = "#3b82f6", strokeWidth = 3 }) {
    // If no path or not enough points, return a placeholder
    if (!path || path.length < 2) {
        return (
            <div style={{ width, height, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>No Map Data</span>
            </div>
        );
    }

    const svgPath = useMemo(() => {
        // 1. Calculate Bounding Box
        let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
        path.forEach(p => {
            if (p.lat < minLat) minLat = p.lat;
            if (p.lat > maxLat) maxLat = p.lat;
            if (p.lng < minLng) minLng = p.lng;
            if (p.lng > maxLng) maxLng = p.lng;
        });

        // Add padding (5%)
        const latRange = maxLat - minLat || 0.001;
        const lngRange = maxLng - minLng || 0.001;
        const padding = 0.05;

        // 2. Convert Points to SVG Coordinates (0,0 to 100,100)
        // SVG Y runs top-down, Latitude runs bottom-up. So we invert Y.

        const points = path.map(p => {
            const x = ((p.lng - minLng) / lngRange) * 100; // 0 to 100
            const y = 100 - ((p.lat - minLat) / latRange) * 100; // 100 to 0 (invert)
            return `${x},${y}`;
        }).join(" ");

        return points;
    }, [path]);

    return (
        <svg
            viewBox="-10 -10 120 120" // Add padding in viewBox (-5 to 105)
            width={width}
            height={height}
            preserveAspectRatio="xMidYMid meet"
            style={{ overflow: 'visible' }} // Allow stroke to breathe
        >
            {/* Shadow line for depth */}
            <polyline
                points={svgPath}
                fill="none"
                stroke="rgba(0,0,0,0.5)"
                strokeWidth={strokeWidth + 2}
                strokeLinecap="round"
                strokeLinejoin="round"
                transform="translate(1, 1)"
            />
            {/* Main line */}
            <polyline
                points={svgPath}
                fill="none"
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* Start Dot */}
            {/* <circle cx={path[0].lng...} ... /> (Complex to map back, skipping for simplicity unless needed) */}
        </svg>
    );
}
