import { MapContainer, TileLayer, Polyline, Marker, useMap } from "react-leaflet";
import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Custom Marker Icons ensuring valid L.divIcon usage
const createIcon = (color) =>
    L.divIcon({
        className: "custom-marker",
        html: `<div style="
      background-color: ${color};
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 0 4px rgba(0,0,0,0.4);
    "></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
    });

const startIcon = createIcon("#22c55e"); // Green
const endIcon = createIcon("#ef4444");   // Red

function FitBounds({ path }) {
    const map = useMap();
    useEffect(() => {
        if (path && path.length > 0) {
            const bounds = path.map((p) => [p.lat, p.lng]);
            map.fitBounds(bounds, { padding: [30, 30] });
        }
    }, [path, map]);
    return null;
}

export default function StaticMap({ path }) {
    if (!path || path.length === 0) return <div className="no-map">No Map Data</div>;

    const startPoint = [path[0].lat, path[0].lng];
    const endPoint = [path[path.length - 1].lat, path[path.length - 1].lng];

    return (
        <div style={{ height: "100%", width: "100%", borderRadius: "12px", overflow: "hidden" }}>
            <MapContainer
                center={startPoint}
                zoom={13}
                scrollWheelZoom={false}
                dragging={false}
                zoomControl={false}
                doubleClickZoom={false}
                attributionControl={false}
                style={{ height: "100%", width: "100%" }}
            >
                <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                />

                {/* Path Line (Blue) */}
                <Polyline
                    positions={path.map((p) => [p.lat, p.lng])}
                    color="#3b82f6"
                    weight={5}
                    opacity={1}
                    lineCap="round"
                    lineJoin="round"
                />

                {/* Start Marker */}
                <Marker position={startPoint} icon={startIcon} />

                {/* End Marker (only if different from start to avoid overlap on 0 distance) */}
                {path.length > 1 && <Marker position={endPoint} icon={endIcon} />}

                <FitBounds path={path} />
            </MapContainer>
        </div>
    );
}
