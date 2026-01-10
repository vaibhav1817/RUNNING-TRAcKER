import { useState, useEffect } from "react";
import { CloudSun, Sun, CloudRain, Wind, Snowflake, Cloud } from "lucide-react";
import { useRun } from "../context/RunProvider";

export default function WeatherWidget() {
    const { location } = useRun();
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (location) {
            fetchWeather(location.lat, location.lng);
        } else {
            // Fallback: Use IP-based Geolocation for immediate approximate weather
            fetch('https://ipapi.co/json/')
                .then(res => res.json())
                .then(data => {
                    if (data.latitude && data.longitude) {
                        fetchWeather(data.latitude, data.longitude);
                    }
                })
                .catch(err => {
                    console.error("IP Location failed", err);
                    // Absolute fallback if everything fails
                    fetchWeather(51.5074, -0.1278); // London
                });
        }
    }, [location]);

    const fetchWeather = async (lat, lng) => {
        try {
            if (!weather) setLoading(true); // Show loading initially

            const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,wind_speed_10m`);
            const data = await res.json();

            if (data.current) {
                setWeather({
                    temp: Math.round(data.current.temperature_2m),
                    code: data.current.weather_code,
                    wind: data.current.wind_speed_10m
                });
            }
        } catch (e) {
            console.error("Weather fetch failed", e);
        } finally {
            setLoading(false);
        }
    };

    const getWeatherIcon = (code) => {
        if (code === 0) return <Sun size={18} color="#facc15" />;
        if (code >= 1 && code <= 3) return <CloudSun size={18} color="#cbd5e1" />;
        if (code >= 51 && code <= 67) return <CloudRain size={18} color="#60a5fa" />; // Rain
        if (code >= 71 && code <= 77) return <Snowflake size={18} color="#e2e8f0" />; // Snow
        if (code >= 95) return <Wind size={18} color="#818cf8" />; // Storm
        return <Cloud size={18} color="#94a3b8" />;
    };

    const getWeatherText = (code) => {
        if (code === 0) return "Clear Sky";
        if (code >= 1 && code <= 3) return "Partly Cloudy";
        if (code >= 51 && code <= 67) return "Rainy";
        if (code >= 71 && code <= 77) return "Snowy";
        if (code >= 95) return "Stormy";
        return "Cloudy";
    };

    if (!weather) {
        return (
            <div style={styles.container}>
                <span style={{ fontSize: '12px', color: '#cbd5e1' }}>
                    Loading Weather...
                </span>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            {getWeatherIcon(weather.code)}
            <span style={{ fontSize: '14px', color: 'white', fontWeight: 'bold' }}>{weather.temp}°C</span>
            <div style={{ width: '1px', height: '12px', background: 'rgba(255,255,255,0.3)' }}></div>
            <span style={{ fontSize: '12px', color: '#cbd5e1' }}>{getWeatherText(weather.code)}</span>
        </div>
    );
}

const styles = {
    container: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(255, 255, 255, 0.1)',
        padding: '6px 12px',
        borderRadius: '20px',
        backdropFilter: 'blur(5px)',
        minHeight: '32px'
    }
};
