import { createContext, useContext, useEffect, useRef, useState } from "react";

const RunContext = createContext();

export const RunProvider = ({ children }) => {
  // 🔹 STATE (with persistence)
  const [time, setTime] = useState(() => Number(localStorage.getItem("time")) || 0);
  const [distance, setDistance] = useState(
    () => Number(localStorage.getItem("distance")) || 0
  );
  const [status, setStatus] = useState(
    () => localStorage.getItem("status") || "idle"
  );
  const [history, setHistory] = useState([]);
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [user, setUser] = useState(null);

  // 🔹 USER SETTINGS (Name, Weight, etc.)
  const [userSettings, setUserSettings] = useState(() => {
    const saved = localStorage.getItem("userSettings");
    return saved ? JSON.parse(saved) : {
      name: "Runner",
      weight: 70,
      height: 175,
      dob: "2000-01-01",
      gender: "Prefer not to say"
    };
  });

  // 🔹 TRAINING PLAN STATE
  const [activePlan, setActivePlan] = useState(() => {
    const saved = localStorage.getItem("activePlan");
    return saved ? JSON.parse(saved) : null;
  });

  // 🔹 LOCATION STATE
  const [location, setLocation] = useState(null);
  const [routePath, setRoutePath] = useState([]);
  const [currentPace, setCurrentPace] = useState(0); // in min/km (instant pace)

  // 🔹 GHOST RUNNER STATE
  const [ghostSettings, setGhostSettings] = useState(null); // { targetPace: seconds/km, label: 'Best 5k' }

  // 🔹 COUNTDOWN STATE
  const [isStarting, setIsStarting] = useState(false); // Countdown state

  const intervalRef = useRef(null);
  const watchIdRef = useRef(null);
  const lastLocationRef = useRef(null);
  const lastKmRef = useRef(0);
  const timeRef = useRef(0); // Ref for accessing time inside callbacks
  const lastSpeedsRef = useRef([]); // 🔹 Smoothing Buffer for Pace

  // Sync ref with state
  useEffect(() => {
    timeRef.current = time;
  }, [time]);

  // 🔹 VOICE SETTINGS
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    return localStorage.getItem("voiceEnabled") !== "false"; // Default true
  });

  // 🔹 VOICE ASSISTANT HELPER
  const speak = (text) => {
    if (!voiceEnabled) return; // 🔇 Mute check

    if ('speechSynthesis' in window) {
      // Cancel previous speech to avoid queue buildup
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  // 🔹 HELPER: Calculate Distance between two coords (Haversine Formula) in km
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  const [loadingUser, setLoadingUser] = useState(true);

  // 🔹 API: FETCH HISTORY & USER DATA
  useEffect(() => {
    if (token) {
      // Fetch Runs
      fetch('/api/runs', { headers: { 'x-auth-token': token } })
        .then(res => res.json())
        .then(data => setHistory(data))
        .catch(err => console.error("Failed to fetch runs:", err));

      // Fetch User Data
      fetch('/api/auth/user', { headers: { 'x-auth-token': token } })
        .then(res => res.json())
        .then(userData => {
          console.log('Fetched User Data:', userData); // DEBUG
          setUser(userData);
          // Sync local settings with cloud profile
          if (userData.profile) {
            setUserSettings(prev => ({
              ...prev,
              name: userData.username, // Map username to name
              ...userData.profile
            }));
          }
          if (userData.activePlan) setActivePlan(userData.activePlan);
        })
        .catch(err => console.error("Failed to fetch user:", err))
        .finally(() => setLoadingUser(false));
    } else {
      setHistory([]);
      setUser(null);
      setLoadingUser(false);
    }
  }, [token]);


  // 🔹 TIMER LOGIC
  useEffect(() => {
    if (status === "running") {
      intervalRef.current = setInterval(() => {
        setTime((t) => t + 1);
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [status]);

  // 🔹 GEOLOCATION LOGIC (Always Watch)
  useEffect(() => {
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, speed, accuracy } = position.coords;
          const newPoint = { lat: latitude, lng: longitude, time: position.timestamp, accuracy };

          setLocation(newPoint);

          // Only record path and distance if running
          if (status === "running") {
            // Speed Calculation (Instant Pace)
            let calculatedSpeed = speed; // m/s from GPS (often null)

            // Fallback: Calculate Speed manually if GPS speed is null
            if ((calculatedSpeed === null || calculatedSpeed === undefined) && lastLocationRef.current) {
              const distKm = calculateDistance(
                lastLocationRef.current.lat, lastLocationRef.current.lng,
                newPoint.lat, newPoint.lng
              );
              const timeDiffSeconds = (newPoint.time - lastLocationRef.current.time) / 1000;

              if (timeDiffSeconds > 0) {
                calculatedSpeed = (distKm * 1000) / timeDiffSeconds; // m/s
              }
            }

            // 🔹 SMOOTHED PACE CALCULATION
            if (calculatedSpeed !== null && calculatedSpeed !== undefined && calculatedSpeed > 0) {
              // Add to buffer (keep last 5 measurements)
              lastSpeedsRef.current = [...lastSpeedsRef.current, calculatedSpeed].slice(-5);

              // Calculate Average Speed
              const avgSpeed = lastSpeedsRef.current.reduce((a, b) => a + b, 0) / lastSpeedsRef.current.length;

              if (avgSpeed > 0.1) { // Threshold lowered to 0.1 m/s (~0.36 km/h) for testing
                const paceMinPerKm = (1000 / avgSpeed) / 60;
                if (paceMinPerKm < 60) {
                  setCurrentPace(paceMinPerKm);
                }
              } else {
                setCurrentPace(0); // Idle
              }
            }

            lastLocationRef.current = newPoint;

            setRoutePath((prevPath) => {
              if (prevPath.length > 0) {
                const lastPoint = prevPath[prevPath.length - 1];
                const distIncrement = calculateDistance(
                  lastPoint.lat,
                  lastPoint.lng,
                  newPoint.lat,
                  newPoint.lng
                );

                // Only add distance if movement is significant
                if (distIncrement > 0.002) {
                  setDistance((d) => {
                    const newDist = +(d + distIncrement).toFixed(2);

                    // 🗣️ AUDIO FEEDBACK: Check for Kilomenter Split
                    if (Math.floor(newDist) > lastKmRef.current) {
                      const splitKm = Math.floor(newDist);
                      lastKmRef.current = splitKm;
                      // Calculate average pace for this run so far using ref
                      const curTime = timeRef.current;
                      const avgPace = curTime > 0 ? (curTime / 60 / newDist).toFixed(0) : 0;
                      speak(`Distance ${splitKm} kilometers. Average pace ${avgPace} minutes per kilometer.`);
                    }

                    return newDist;
                  });
                  return [...prevPath, newPoint];
                }
                return prevPath;
              } else {
                return [...prevPath, newPoint];
              }
            });
          }
        },
        (error) => console.error("Error watching position:", error),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );
    }

    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [status]); // timeRef handles time access

  // 🔹 LOCAL STORAGE PERSISTENCE
  useEffect(() => {
    localStorage.setItem("time", time);
    localStorage.setItem("distance", distance);
    localStorage.setItem("status", status);
    // localStorage.setItem("history", JSON.stringify(history)); // History now in DB
    localStorage.setItem("userSettings", JSON.stringify(userSettings));
    localStorage.setItem("activePlan", JSON.stringify(activePlan));
    localStorage.setItem("voiceEnabled", voiceEnabled);
  }, [time, distance, status, history, userSettings, activePlan, voiceEnabled]);

  // 🔹 CONTROLS
  const startRun = (options = {}) => {
    if (status === 'running' || isStarting) return;

    if (options.ghostPace) {
      setGhostSettings({ targetPace: options.ghostPace, mode: 'ghost' });
    } else {
      setGhostSettings(null);
    }

    // 🔹 COUNTDOWN START
    setIsStarting(true);
    speak("Three");

    setTimeout(() => { speak("Two"); }, 1000);
    setTimeout(() => { speak("One"); }, 2000);

    setTimeout(() => {
      speak("Let's Run!");
      setStatus('running');
      setIsStarting(false);
      // Reset Logic
      setTime(0);
      setDistance(0);
      setRoutePath([]);
      lastKmRef.current = 0;
    }, 3000);
  };

  const pauseRun = () => {
    speak("Workout paused.");
    clearInterval(intervalRef.current);
    if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    setStatus("paused");
  };

  const resumeRun = () => {
    speak("Resuming workout.");
    setStatus("running");
  };

  const stopRun = () => {
    speak("Workout finished. Great job.");
    clearInterval(intervalRef.current);
    if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);

    // 🔹 FORMAT PACE (MM:SS)
    const formatPace = (t, d) => {
      if (!t || !d) return "0:00";
      const totalMinutes = t / 60 / d;
      const mins = Math.floor(totalMinutes);
      const secs = Math.round((totalMinutes - mins) * 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const newRun = {
      time,
      distance,
      pace: formatPace(time, distance),
      calories: Math.round(distance * 60),
      date: new Date(),
      path: routePath
    };

    // Save to Backend
    if (token) {
      fetch('/api/runs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify(newRun)
      })
        .then(async res => {
          const text = await res.text();
          try {
            const data = text ? JSON.parse(text) : {};
            if (!res.ok) {
              const msg = data.message || data.errors?.[0]?.msg || text || "Failed to save run";
              throw new Error(msg);
            }
            return data;
          } catch (e) {
            if (!res.ok) throw new Error(text || "Server Error " + res.status);
            throw e;
          }
        })
        .then(savedRun => {
          setHistory(prev => [savedRun, ...prev]);

          // 👟 UPDATE SHOE MILEAGE
          if (userSettings?.shoes && userSettings.shoes.length > 0) {
            const activeShoeIndex = userSettings.shoes.findIndex(s => s.active);
            if (activeShoeIndex !== -1) {
              const updatedShoes = [...userSettings.shoes];
              const currentDist = updatedShoes[activeShoeIndex].distance || 0;
              updatedShoes[activeShoeIndex] = {
                ...updatedShoes[activeShoeIndex],
                distance: Number((currentDist + distance).toFixed(2))
              };

              // Optimistic + Sync
              updateSettings({ shoes: updatedShoes });

              // Optional: Notify if shoe is worn out
              if (updatedShoes[activeShoeIndex].distance > updatedShoes[activeShoeIndex].target) {
                speak("Your shoes have exceeded their mileage target.");
              }
            }
          }
        })
        .catch(err => {
          console.error("Error saving run:", err);
          alert("Failed to save run: " + err.message);
        });
    } else {
      console.warn("User not logged in, run not saved to cloud.");
    }

    setTime(0);
    setDistance(0);
    setRoutePath([]);
    setStatus("idle");
  };

  const deleteRun = async (id) => {
    // 🧹 Force clean Ghost/Invalid runs immediately
    if (!id) {
      console.warn("Attempting to delete run without ID. Cleaning up local history.");
      setHistory(prev => prev.filter(run => run._id)); // Keep only valid ones
      return;
    }

    try {
      const res = await fetch(`/api/runs/${id}`, {
        method: 'DELETE',
        headers: { 'x-auth-token': token }
      });

      if (res.ok) {
        setHistory((prev) => prev.filter((run) => run._id !== id));
      } else {
        const err = await res.json();
        console.error("Failed to delete run:", res.status, err);
        // If 404, it means it's already gone from DB, so remove locally too
        if (res.status === 404) {
          setHistory((prev) => prev.filter((run) => run._id !== id));
        }
      }
    } catch (err) {
      console.error("Error deleting run:", err);
    }
  };

  const restoreRun = async (id) => {
    try {
      const res = await fetch(`/api/runs/${id}/restore`, {
        method: 'PUT',
        headers: { 'x-auth-token': token }
      });
      if (res.ok) {
        const restoredRun = await res.json();
        setHistory(prev => [restoredRun, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date)));
      }
    } catch (err) {
      console.error("Error restoring run:", err);
    }
  };

  const permanentlyDeleteRun = async (id) => {
    try {
      await fetch(`/api/runs/${id}/permanent`, {
        method: 'DELETE',
        headers: { 'x-auth-token': token }
      });
      // No local state update needed usually as this run is in trash, but if we have trash state...
    } catch (err) {
      console.error("Error permanently deleting run:", err);
    }
  };

  const fetchTrash = async () => {
    try {
      const res = await fetch('/api/runs/history/trash', {
        headers: { 'x-auth-token': token }
      });
      return await res.json();
    } catch (err) {
      console.error("Failed to fetch trash", err);
      return [];
    }
  };

  const fetchBestRun = async () => {
    if (!token) return null;
    try {
      const res = await fetch('/api/runs/best', {
        headers: { 'x-auth-token': token }
      });
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch (e) {
      console.error("Failed to fetch best run", e);
      return null;
    }
  };

  // 🔹 AUTH ACTIONS
  const login = async (email, password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server error: Received non-JSON response");
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');

      localStorage.setItem('token', data.token);
      setToken(data.token);
    } catch (err) {
      console.error("Login Error:", err);
      throw err;
    }
  };

  const register = async ({ username, email, password }) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
      });

      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Server error: Received non-JSON response");
      }

      const data = await res.json();
      if (!res.ok) {
        // Handle Express-Validator errors array
        if (data.errors && Array.isArray(data.errors)) {
          const errorMsg = data.errors.map(e => e.msg).join('\n');
          throw new Error(errorMsg);
        }
        throw new Error(data.message || 'Registration failed');
      }

      localStorage.setItem('token', data.token);
      setToken(data.token);
    } catch (err) {
      console.error("Register Error:", err);
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setHistory([]);
    setUser(null);
  };

  const deleteAccount = async () => {
    try {
      const res = await fetch('/api/auth/delete', {
        method: 'DELETE',
        headers: { 'x-auth-token': token }
      });

      if (res.ok) {
        logout();
        window.location.reload();
      } else {
        const err = await res.json();
        throw new Error(err.message || 'Failed to delete account');
      }
    } catch (err) {
      console.error("Delete Account Error:", err);
      alert("Failed to delete account: " + err.message);
    }
  };

  const updateSettings = (newSettings) => {
    // Optimistic Update
    setUserSettings(prev => ({ ...prev, ...newSettings }));

    // Sync with Cloud
    if (token) {
      fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token
        },
        body: JSON.stringify(newSettings)
      })
        .then(res => res.json())
        .then(data => {
          // Update with confirmed data from server
          setUser(prev => ({
            ...prev,
            username: data.username,
            profile: data.profile
          }));
        })
        .catch(err => console.error("Failed to sync settings:", err));
    }
  };

  const joinPlan = (plan) => {
    const newPlan = { ...plan, startDate: new Date().toISOString(), progress: 0 };
    setActivePlan(newPlan);

    if (token) {
      fetch('/api/auth/plan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({ plan: newPlan })
      }).catch(err => console.error("Failed to sync plan:", err));
    }
  };

  const leavePlan = () => {
    setActivePlan(null);

    if (token) {
      fetch('/api/auth/plan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-auth-token': token },
        body: JSON.stringify({ plan: null })
      }).catch(err => console.error("Failed to sync plan:", err));
    }
  };

  const clearData = async () => {
    if (!window.confirm("WARNING: This will permanently delete ALL your runs and reset your profile settings. Are you sure?")) {
      return;
    }

    try {
      if (token) {
        // Delete Runs
        const res = await fetch('/api/runs', {
          method: 'DELETE',
          headers: { 'x-auth-token': token }
        });

        if (!res.ok) throw new Error("Failed to clear runs");

        // Reset Settings
        const defaultSettings = {
          name: user?.username || "Runner",
          weight: 70,
          height: 175,
          dob: "2000-01-01",
          gender: "Prefer not to say",
          shoes: []
        };

        // We call updateSettings to sync with backend
        updateSettings(defaultSettings);

        setHistory([]);
        alert("All data has been cleared.");
      }
    } catch (err) {
      console.error("Error clearing data:", err);
      alert("Failed to clear data.");
    }
  };

  return (
    <RunContext.Provider
      value={{
        time,
        distance,
        status,
        isStarting, // <--- New State
        history,
        location,
        routePath,
        userSettings,
        activePlan,
        ghostSettings,
        currentPace,
        updateSettings,
        startRun,
        pauseRun,
        resumeRun,
        stopRun,
        deleteRun,
        clearData,
        setToken,
        fetchBestRun,
        voiceEnabled,
        setVoiceEnabled,
        joinPlan,
        leavePlan,
        token,
        loadingUser,
        user,
        login,
        register,
        logout,
        logout,
        deleteAccount,
        restoreRun,
        permanentlyDeleteRun,
        fetchTrash
      }}
    >
      {children}
    </RunContext.Provider >
  );
};

export const useRun = () => useContext(RunContext);
