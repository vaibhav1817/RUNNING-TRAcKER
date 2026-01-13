import { createContext, useContext, useEffect, useRef, useState } from "react";

const RunContext = createContext();

export const RunProvider = ({ children }) => {
  // 🔹 STATE (with persistence)
  const [time, setTime] = useState(() => Number(localStorage.getItem("time")) || 0);
  const [distance, setDistance] = useState(
    () => Number(localStorage.getItem("distance")) || 0
  );
  const [calories, setCalories] = useState(
    () => Number(localStorage.getItem("calories")) || 0
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
  // 🔹 API: FETCH HISTORY & USER DATA
  const fetchUser = () => {
    if (!token) return;
    setLoadingUser(true);
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
            ...userData.profile,
            followers: userData.followers, // detailed list
            following: userData.following  // detailed list
          }));
        }
        if (userData.activePlan) setActivePlan(userData.activePlan);
      })
      .catch(err => console.error("Failed to fetch user:", err))
      .finally(() => setLoadingUser(false));
  };

  useEffect(() => {
    if (token) {
      // Fetch Runs
      fetch('/api/runs', { headers: { 'x-auth-token': token } })
        .then(res => res.json())
        .then(data => setHistory(data))
        .catch(err => console.error("Failed to fetch runs:", err));

      // Fetch User
      fetchUser();
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

  // 🔹 GEOLOCATION LOGIC (Professional Tracking)
  useEffect(() => {
    if (navigator.geolocation) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, speed, accuracy } = position.coords;
          // 1. Filter Noise
          if (accuracy > 25) return; // Ignore poor GPS signals (>25m accuracy)

          const newPoint = { lat: latitude, lng: longitude, time: position.timestamp, accuracy };
          setLocation(newPoint);

          if (status === "running") {
            const now = position.timestamp;
            let timeDelta = 0;
            if (lastLocationRef.current) {
              timeDelta = (now - lastLocationRef.current.time) / 1000; // seconds
            }

            // 2. Determine Real Speed (m/s)
            // OS-provided 'speed' is Doppler-based and usually best. Fallback to positional delta.
            let realSpeed = speed;
            if (realSpeed === null || realSpeed < 0) {
              // Fallback if OS doesn't provide speed
              if (lastLocationRef.current && timeDelta > 0) {
                const dist = calculateDistance(lastLocationRef.current.lat, lastLocationRef.current.lng, latitude, longitude);
                realSpeed = (dist * 1000) / timeDelta;
              } else {
                realSpeed = 0;
              }
            }

            // 3. Auto-Pause / Stop Detection (Threshold: 0.8 m/s ~= 2.8 km/h)
            if (realSpeed < 0.8) {
              realSpeed = 0; // Treat as stopped/standing
            }

            // 4. Smooth Pace (Exponential Moving Average)
            // Alpha = 0.2 means new data has 20% weight (smooths out jumps)
            if (realSpeed > 0.1) {
              const rawPaceMinKm = (1000 / realSpeed) / 60;
              // Clamp outrageous values (e.g. GPS glitch saying you ran at 100mph)
              const clampedPace = Math.min(Math.max(rawPaceMinKm, 2), 30);

              // EMA Filter
              /* 
                 currentPace is in state, but we need a Ref for the smoothing algo 
                 to avoid dependency loops in useEffect.
                 We'll use lastSpeedsRef to store the 'SmoothedPace' purely.
              */
              const prevSmoothed = lastSpeedsRef.current[0] || clampedPace;
              const alpha = 0.3;
              const newSmoothed = (clampedPace * alpha) + (prevSmoothed * (1 - alpha));

              lastSpeedsRef.current = [newSmoothed]; // Store single smoothed value
              setCurrentPace(newSmoothed);
            } else {
              setCurrentPace(0);
            }

            // 5. Accumulate Distance & Calories
            if (realSpeed > 0 && timeDelta > 0 && timeDelta < 30) { // Limit huge time jumps
              // Distance = Speed * Time (Integration) is often smoother than summing zig-zags
              const distIncrementKm = (realSpeed * timeDelta) / 1000;

              setDistance(d => {
                const newDist = d + distIncrementKm;
                // Audio Feedback
                if (Math.floor(newDist) > lastKmRef.current) {
                  lastKmRef.current = Math.floor(newDist);
                  const avgPace = timeRef.current > 0 ? (timeRef.current / 60 / newDist).toFixed(0) : 0;
                  speak(`Distance ${lastKmRef.current} kilometers. Pace ${avgPace}.`);
                }
                return newDist;
              });

              // Calories (MET Formula)
              const kph = realSpeed * 3.6;
              let met = 2.0; // Rest
              if (kph < 4) met = 3.5; // Walk
              else if (kph < 8) met = 7.0; // Jog
              else if (kph < 11) met = 9.8; // Run
              else if (kph < 14) met = 11.5; // Fast Run
              else met = 13.5; // Sprint

              const userWeight = userSettings.weight || 70;
              const hours = timeDelta / 3600;
              const calsBurned = met * userWeight * hours;

              setCalories(c => c + calsBurned);

              setRoutePath(prev => [...prev, newPoint]);
            }

            lastLocationRef.current = newPoint;
          } else {
            // Not running: just update ref to prevent huge jump on resume
            lastLocationRef.current = newPoint;
          }
        },
        (error) => console.error("GPS Error:", error),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );
    }
    return () => { if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current); };
  }, [status, userSettings.weight]);

  // 🔹 LOCAL STORAGE PERSISTENCE
  useEffect(() => {
    localStorage.setItem("time", time);
    localStorage.setItem("distance", distance);
    localStorage.setItem("calories", calories);
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
      setCalories(0);
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
      calories: Math.round(calories),
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
    setCalories(0);
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
        calories,
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
        deleteAccount,
        restoreRun,
        permanentlyDeleteRun,
        fetchTrash,
        refreshUser: fetchUser
      }}
    >
      {children}
    </RunContext.Provider >
  );
};

export const useRun = () => useContext(RunContext);
