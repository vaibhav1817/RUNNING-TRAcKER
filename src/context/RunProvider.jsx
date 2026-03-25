import { createContext, useContext, useEffect, useRef, useState } from "react";

// ============================================================
// 🧮 KALMAN GPS FILTER
// Based on the algorithm used in professional GPS tracking apps
// (Same approach as the popular android-gps-kalman library)
//
// How it works:
//   - Maintains a position estimate (lat, lng) with associated
//     uncertainty (variance, in metres²).
//   - Each new GPS fix is blended with the existing estimate.
//   - The Kalman Gain (K) decides how much to trust the new fix
//     vs the prediction:
//       K = variance / (variance + measurementVariance)
//   - Good fix (low accuracy number) → high K → trust the GPS.
//   - Poor fix (high accuracy number) → low K → keep old estimate.
//   - Over time (while waiting for next fix) the uncertainty grows
//     at a rate of Q²·Δt (process noise), where Q = 3 m/s models
//     a runner's typical acceleration between GPS updates.
// ============================================================
class KalmanGPSFilter {
  constructor(processNoiseMetresPerSecond = 3) {
    this.Q = processNoiseMetresPerSecond; // process noise (m/s)
    this.variance = -1;                   // -1 = not yet initialised
    this.lat = 0;
    this.lng = 0;
    this.timestampMs = 0;
  }

  /** Feed a new raw GPS reading. Returns { lat, lng } of filtered position. */
  process(lat, lng, accuracyMetres, timestampMs) {
    // GPS accuracy must be at least 1 m to avoid divide-by-zero
    const accuracy = Math.max(accuracyMetres, 1);

    if (this.variance < 0) {
      // First reading — initialise filter state directly
      this.lat = lat;
      this.lng = lng;
      this.variance = accuracy * accuracy;
      this.timestampMs = timestampMs;
    } else {
      // ── PREDICT step ──────────────────────────────────────────
      // Time since last update (seconds)
      const dtMs = timestampMs - this.timestampMs;
      if (dtMs > 0) {
        // Inflate variance by process noise over elapsed time
        // (runner may have moved unpredictably since last fix)
        this.variance += (dtMs / 1000) * this.Q * this.Q;
        this.timestampMs = timestampMs;
      }

      // ── UPDATE step ───────────────────────────────────────────
      // Kalman Gain: how much do we trust the new measurement?
      //   K = 0 → ignore new fix, keep prediction
      //   K = 1 → trust new fix completely
      const measurementVariance = accuracy * accuracy;
      const K = this.variance / (this.variance + measurementVariance);

      // Blend old estimate with new measurement
      this.lat += K * (lat - this.lat);
      this.lng += K * (lng - this.lng);

      // Shrink variance — we are now more certain
      this.variance = (1 - K) * this.variance;
    }

    return { lat: this.lat, lng: this.lng };
  }

  /** Reset to uninitialised state (call on run start / resume). */
  reset() {
    this.variance = -1;
  }
}

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

  // ✅ Timestamp-based timer refs — prevents screen-off drift
  const runStartTimestampRef = useRef(null); // epoch ms when run started / resumed
  const accumulatedTimeRef = useRef(0);      // seconds already accrued before latest resume
  const timeRef = useRef(time);

  const distanceRef = useRef(distance);
  const caloriesRef = useRef(calories);
  const statusRef = useRef(status);
  const lastSpeedsRef = useRef([]); // 🔹 Smoothing Buffer for Pace

  // 🧮 Kalman Filter instance — persistent across GPS callbacks
  const kalmanRef = useRef(new KalmanGPSFilter(3)); // Q=3 m/s tuned for running

  // Keep refs in sync
  useEffect(() => { timeRef.current = time; }, [time]);
  useEffect(() => { distanceRef.current = distance; }, [distance]);
  useEffect(() => { caloriesRef.current = calories; }, [calories]);
  useEffect(() => { statusRef.current = status; }, [status]);

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
        .then(data => {
          // Ensure data is an array before setting history
          if (Array.isArray(data)) {
            setHistory(data);
          } else {
            console.error("Invalid runs data received:", data);
            setHistory([]);
          }
        })
        .catch(err => {
          console.error("Failed to fetch runs:", err);
          setHistory([]);
        });

      // Fetch User
      fetchUser();
    } else {
      setHistory([]);
      setUser(null);
      setLoadingUser(false);
    }
  }, [token]);


  // ✅ TIMESTAMP-BASED TIMER — works even when screen is off
  useEffect(() => {
    if (status === "running") {
      // NOTE: runStartTimestampRef is set BEFORE setStatus('running') is called
      // inside startRun/resumeRun. Do NOT overwrite it here.
      // We only start the polling interval.
      intervalRef.current = setInterval(() => {
        if (runStartTimestampRef.current) {
          const elapsed = Math.floor((Date.now() - runStartTimestampRef.current) / 1000);
          setTime(accumulatedTimeRef.current + elapsed);
        }
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [status]);

  // ✅ Page Visibility API — recalculate time accurately after screen comes back on
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && statusRef.current === "running") {
        // Recalculate accurately using timestamps
        const elapsed = Math.floor((Date.now() - runStartTimestampRef.current) / 1000);
        setTime(accumulatedTimeRef.current + elapsed);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // 🔹 GEOLOCATION LOGIC — always watching, only accumulates when running
  const startGeoWatch = () => {
    if (!navigator.geolocation) return;

    // Clear any previous watch
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, speed, accuracy } = position.coords;

        // Hard reject truly awful readings (indoor / basement / no signal)
        if (accuracy > 50) return;

        // ── 🧮 KALMAN FILTER: smooth the raw GPS coordinate ──────
        // This eliminates the random zig-zag "GPS drift" that causes
        // positional methods to over-count distance.
        const filtered = kalmanRef.current.process(
          latitude,
          longitude,
          accuracy,
          position.timestamp
        );
        // Use filtered pos for distance/route; raw pos still shown on map
        // for real-time marker accuracy (raw is fine for display)
        const rawPoint      = { lat: latitude,      lng: longitude,      time: position.timestamp, accuracy };
        const filteredPoint = { lat: filtered.lat,  lng: filtered.lng,   time: position.timestamp, accuracy };

        // Show raw location on map (feels more responsive)
        setLocation(rawPoint);

        // ✅ Only accumulate data when actively running
        if (statusRef.current !== "running") {
          // Keep last location updated so resume doesn't produce a jump
          lastLocationRef.current = filteredPoint;
          return;
        }

        const now = position.timestamp;
        let timeDelta = 0;
        if (lastLocationRef.current) {
          timeDelta = (now - lastLocationRef.current.time) / 1000; // seconds
        }

        // ── SPEED SOURCE ─────────────────────────────────────────
        // Priority: OS Doppler speed (most accurate) → positional fallback
        let realSpeed = speed;
        if (realSpeed === null || realSpeed < 0) {
          // Fallback: derive from filtered positions (zig-zag already removed)
          if (lastLocationRef.current && timeDelta > 0) {
            const dist = calculateDistance(
              lastLocationRef.current.lat, lastLocationRef.current.lng,
              filtered.lat, filtered.lng
            );
            realSpeed = (dist * 1000) / timeDelta;
          } else {
            realSpeed = 0;
          }
        }

        // Standing-still threshold: 0.5 m/s (~1.8 km/h)
        if (realSpeed < 0.5) realSpeed = 0;

        // Sanity cap: fastest human ~12 m/s (Bolt-level); cap at 12
        if (realSpeed > 12) realSpeed = 0; // GPS glitch

        // ── PACE (Exponential Moving Average) ────────────────────
        if (realSpeed > 0.5) {
          const rawPaceMinKm = (1000 / realSpeed) / 60;
          const clampedPace  = Math.min(Math.max(rawPaceMinKm, 2), 20);
          const prevSmoothed = lastSpeedsRef.current[0] || clampedPace;
          const alpha        = 0.3;
          const newSmoothed  = clampedPace * alpha + prevSmoothed * (1 - alpha);
          lastSpeedsRef.current = [newSmoothed];
          setCurrentPace(newSmoothed);
        } else {
          setCurrentPace(0);
        }

        // ── DISTANCE & CALORIES ───────────────────────────────────
        if (realSpeed > 0 && timeDelta > 0 && timeDelta < 60) {
          // Speed-×-time integration on Doppler speed is the gold standard;
          // filtered positions used as fallback so zig-zag is already removed
          const distIncrementKm = (realSpeed * timeDelta) / 1000;

          // Sanity guard: single stride can't be > 150 m
          if (distIncrementKm < 0.15) {
            setDistance(d => {
              const newDist = d + distIncrementKm;
              if (Math.floor(newDist) > lastKmRef.current) {
                lastKmRef.current = Math.floor(newDist);
                const avgPace = timeRef.current > 0
                  ? (timeRef.current / 60 / newDist).toFixed(0)
                  : 0;
                speak(`Distance ${lastKmRef.current} kilometers. Pace ${avgPace}.`);
              }
              return newDist;
            });

            // ── CALORIES (Compendium of Physical Activities MET) ──
            const kph = realSpeed * 3.6;
            let met;
            if      (kph < 4)  met = 3.5;  // Walk
            else if (kph < 6)  met = 6.0;  // Brisk walk / slow jog
            else if (kph < 8)  met = 8.3;  // Jog (8 km/h = 8.3 MET)
            else if (kph < 10) met = 9.8;  // Run
            else if (kph < 12) met = 11.0; // Fast run
            else if (kph < 14) met = 11.8; // Very fast run
            else               met = 14.5; // Sprint (>14 km/h)

            const userWeight = userSettings.weight || 70;
            const hours      = timeDelta / 3600;
            setCalories(c => c + (met * userWeight * hours));

            // Route path uses FILTERED point for clean map drawing
            setRoutePath(prev => [...prev, filteredPoint]);
          }
        }

        // Store filtered point as last reference
        lastLocationRef.current = filteredPoint;
      },
      (error) => console.error("GPS Error:", error),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
  };

  // Start geo watch on mount and keep it alive
  useEffect(() => {
    startGeoWatch();
    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [userSettings.weight]); // Re-watch if weight changes (for calorie accuracy)

  // 🔹 LOCAL STORAGE PERSISTENCE
  useEffect(() => {
    localStorage.setItem("time", time);
    localStorage.setItem("distance", distance);
    localStorage.setItem("calories", calories);
    localStorage.setItem("status", status);
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

      // ✅ Reset accumulated time before starting fresh
      accumulatedTimeRef.current = 0;
      runStartTimestampRef.current = Date.now();
      lastKmRef.current = 0;
      lastSpeedsRef.current = [];
      lastLocationRef.current = null; // Reset so first point doesn't create huge jump

      // 🧮 Reset Kalman filter — fresh uncertainty for a new run
      kalmanRef.current.reset();

      setTime(0);
      setDistance(0);
      setCalories(0);
      setRoutePath([]);
      setStatus('running');
      setIsStarting(false);

      // Ensure geo watch is active
      startGeoWatch();
    }, 3000);
  };

  const pauseRun = () => {
    speak("Workout paused.");
    clearInterval(intervalRef.current);

    // ✅ Save accumulated time at pause, keep GPS watching (just don't accumulate)
    const elapsed = Math.floor((Date.now() - runStartTimestampRef.current) / 1000);
    accumulatedTimeRef.current = accumulatedTimeRef.current + elapsed;

    setStatus("paused");
    // ✅ Do NOT clear geo watch — keep location updated so resume is smooth
  };

  const resumeRun = () => {
    speak("Resuming workout.");

    // ✅ Reset the start timestamp for this segment
    runStartTimestampRef.current = Date.now();

    // ✅ Reset lastLocation ref so we don't get a big jump from paused position
    lastLocationRef.current = null;

    // 🧮 Reset Kalman filter on resume — stale variance from pause would skew
    // the first few post-resume GPS updates
    kalmanRef.current.reset();

    setStatus("running");
  };

  const stopRun = () => {
    speak("Workout finished. Great job.");
    clearInterval(intervalRef.current);

    // ✅ Use statusRef (not stale `status` closure) to correctly determine
    // whether the run was active or already paused when Stop was pressed
    let finalTime = accumulatedTimeRef.current;
    if (statusRef.current === 'running' && runStartTimestampRef.current) {
      const elapsed = Math.floor((Date.now() - runStartTimestampRef.current) / 1000);
      finalTime += elapsed;
    }

    // Capture current values before resetting
    const finalDistance = distanceRef.current;
    const finalCalories = caloriesRef.current;

    // 🔹 FORMAT PACE (MM:SS format)
    const formatPace = (t, d) => {
      if (!t || !d || d < 0.01) return "0:00";
      const totalMinutes = t / 60 / d;
      const mins = Math.floor(totalMinutes);
      const secs = Math.round((totalMinutes - mins) * 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const newRun = {
      time: finalTime,
      distance: finalDistance,
      pace: formatPace(finalTime, finalDistance),
      calories: Math.round(finalCalories),
      date: new Date(),
      path: routePath
    };

    console.log("Saving run:", newRun); // DEBUG

    // ✅ Reset refs
    accumulatedTimeRef.current = 0;
    runStartTimestampRef.current = null;
    lastKmRef.current = 0;
    lastSpeedsRef.current = [];
    lastLocationRef.current = null;

    // Reset state
    setTime(0);
    setDistance(0);
    setCalories(0);
    setRoutePath([]);
    setStatus("idle");

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
                distance: Number((currentDist + finalDistance).toFixed(2))
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
