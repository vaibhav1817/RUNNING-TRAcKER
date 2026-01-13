import { useState, useCallback, useEffect } from "react";
import { useRun } from "../context/RunProvider";
import { Settings, Bell, Heart, Lock, User, Medal, ChevronRight, X, Download, Trash2, Save, Edit2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Cropper from 'react-easy-crop';
import { getCroppedImg } from "../utils/canvasUtils";
import Avatar from "../components/Avatar";

export default function Profile() {
    const { history, userSettings, updateSettings, logout, deleteAccount, loadingUser, clearData, fetchTrash, restoreRun, permanentlyDeleteRun, refreshUser } = useRun();
    const [modalOpen, setModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('profile');
    const [trashRuns, setTrashRuns] = useState([]);

    const [showFollowModal, setShowFollowModal] = useState(null); // 'followers' | 'following'
    const [newShoeName, setNewShoeName] = useState('');
    const [newShoeTarget, setNewShoeTarget] = useState(800);

    // Refresh user data on mount to ensure counts are accurate
    useEffect(() => {
        if (refreshUser) refreshUser();
    }, []);

    // Cropping State
    const [cropSrc, setCropSrc] = useState(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const showCroppedImage = async () => {
        try {
            const croppedImage = await getCroppedImg(cropSrc, croppedAreaPixels);
            updateSettings({ profilePicture: croppedImage });
            setCropSrc(null); // Close cropper
        } catch (e) {
            console.error(e);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.addEventListener('load', () => setCropSrc(reader.result));
            reader.readAsDataURL(file);
        }
    };

    // Derived Stats
    const totalRuns = history.length;
    const totalDistance = history.reduce((acc, run) => acc + run.distance, 0).toFixed(1);

    // Level Logic
    let level = "Novice Runner";
    let levelColor = "#22c55e"; // Green
    let nextLevel = 50;

    if (totalDistance > 50) { level = "Intermediate Runner"; levelColor = "#3b82f6"; nextLevel = 200; }
    if (totalDistance > 200) { level = "Advanced Runner"; levelColor = "#8b5cf6"; nextLevel = 500; }
    if (totalDistance > 500) { level = "Elite Runner"; levelColor = "#f59e0b"; nextLevel = 1000; }

    const progress = Math.min((totalDistance / nextLevel) * 100, 100);

    const handleExport = () => {
        // Create a print window
        const printWindow = window.open('', '', 'height=800,width=1000');
        if (!printWindow) {
            alert("Please allow popups to generate the report.");
            return;
        }

        // Generate HTML Content
        printWindow.document.write('<html><head><title>Run History Report</title>');
        printWindow.document.write('<style>');
        printWindow.document.write(`
            @media print { @page { size: auto; margin: 20mm; } }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 20px; color: #1e293b; max-width: 1000px; margin: 0 auto; }
            h1 { color: #0f172a; border-bottom: 3px solid #22c55e; padding-bottom: 12px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; }
            .header-meta { font-size: 14px; color: #64748b; font-weight: normal; }
            .summary-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 40px; }
            .card { background: #f1f5f9; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; }
            .card-label { font-size: 13px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600; margin-bottom: 4px; }
            .card-val { font-size: 24px; font-weight: 800; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; font-size: 14px; }
            th { text-align: left; padding: 12px; background: #f8fafc; border-bottom: 2px solid #e2e8f0; color: #475569; font-weight: 600; }
            td { padding: 12px; border-bottom: 1px solid #e2e8f0; color: #334155; }
            tr:last-child td { border-bottom: none; }
            .pace-col { font-family: monospace; font-weight: 600; }
        `);
        printWindow.document.write('</style>');
        printWindow.document.write('</head><body>');

        // Content
        printWindow.document.write(`
            <h1>
                Running Tracker Report
                <span class="header-meta">Generated on ${new Date().toLocaleDateString()}</span>
            </h1>
            <p style="margin-bottom: 30px; font-size: 16px;">
                Runner Profile: <strong>${userSettings?.name || 'Runner'}</strong>
            </p>
            <div class="summary-cards">
                <div class="card">
                    <div class="card-label">Total Runs</div>
                    <div class="card-val">${totalRuns}</div>
                </div>
                <div class="card">
                    <div class="card-label">Total Distance</div>
                    <div class="card-val">${totalDistance} km</div>
                </div>
                <div class="card">
                    <div class="card-label">Current Level</div>
                    <div class="card-val" style="color: ${levelColor}">${level}</div>
                </div>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Distance</th>
                        <th>Time</th>
                        <th>Avg Pace</th>
                        <th>Calories</th>
                    </tr>
                </thead>
                <tbody>
        `);

        // Rows
        history.slice().reverse().forEach(run => {
            const mins = Math.floor(run.time / 60);
            const secs = run.time % 60;
            const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
            printWindow.document.write(`
                <tr>
                    <td>${run.date.split(',')[0]}</td>
                    <td><strong>${run.distance} km</strong></td>
                    <td>${timeStr}</td>
                    <td class="pace-col">${run.pace} /km</td>
                    <td>${run.calories} kcal</td>
                </tr>
            `);
        });

        printWindow.document.write(`
                </tbody>
            </table>
            <div style="margin-top: 50px; text-align: center; color: #94a3b8; font-size: 12px;">
                End of Report • Keep Running!
            </div>
        </body></html>`);

        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 250);
    };

    return (
        <div className="page" style={{ justifyContent: 'flex-start', paddingTop: '20px', position: 'relative' }}>
            <div className="header-section">
                <h1 className="page-title">Profile</h1>
            </div>

            <button
                onClick={() => { setActiveTab('menu'); setModalOpen(true); }}
                style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    background: 'none',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    padding: '8px',
                    zIndex: 20
                }}
            >
                <Settings size={28} />
            </button>

            {/* Profile Card */}
            <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <div
                    onClick={() => document.getElementById('profile-upload').click()}
                    style={{
                        position: 'relative',
                        width: '80px', height: '80px',
                        borderRadius: '24px', // Squircle
                        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: '16px',
                        border: `3px solid ${levelColor}`,
                        cursor: 'pointer',
                        overflow: 'hidden'
                    }}
                >
                    {loadingUser ? (
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid rgba(255,255,255,0.3)', borderTop: '3px solid white', animation: 'spin 1s linear infinite' }}></div>
                    ) : userSettings?.profilePicture ? (
                        <img
                            src={userSettings.profilePicture}
                            alt="Profile"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                    ) : (
                        <User size={40} color={levelColor} />
                    )}

                    {/* Edit Overlay (on hover or always subtly visible) */}
                    <div style={{
                        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, hover: { opacity: 1 }
                    }}>
                        <Edit2 size={24} color="white" />
                    </div>

                    {/* Hidden File Input */}
                    <input
                        id="profile-upload"
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                    />
                </div>

                <h2 style={{ fontSize: '24px', margin: '0 0 4px 0', color: 'white' }}>{userSettings?.name || 'Runner'}</h2>

                {/* Social Counts */}
                <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginBottom: '12px' }}>
                    <button
                        onClick={() => setShowFollowModal('followers')}
                        style={{ textAlign: 'center', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                        <span style={{ color: 'white', fontWeight: 'bold', fontSize: '18px', display: 'block' }}>{userSettings?.followers?.length || 0}</span>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>Followers</span>
                    </button>
                    <button
                        onClick={() => setShowFollowModal('following')}
                        style={{ textAlign: 'center', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                        <span style={{ color: 'white', fontWeight: 'bold', fontSize: '18px', display: 'block' }}>{userSettings?.following?.length || 0}</span>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>Following</span>
                    </button>
                </div>

                <p style={{ color: levelColor, fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                    <Medal size={14} /> {level}
                </p>

                {/* Level Progress */}
                <div style={{ width: '100%', marginTop: '20px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                        <span>Level Progress</span>
                        <span>{totalDistance} / {nextLevel} km</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${progress}%`, height: '100%', background: levelColor, borderRadius: '4px', transition: 'width 1s ease-out' }}></div>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', width: '100%', marginTop: '12px' }}>
                <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '28px', fontWeight: '800', color: 'white', lineHeight: 1 }}>{totalDistance}</span>
                    <span style={{ fontSize: '13px', color: '#94a3b8' }}>Total km</span>
                </div>
                <div className="card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '28px', fontWeight: '800', color: 'white', lineHeight: 1 }}>{totalRuns}</span>
                    <span style={{ fontSize: '13px', color: '#94a3b8' }}>Total Runs</span>
                </div>
            </div>

            {/* Gear Tracker Section */}
            <div className="card" style={{ marginTop: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '16px', margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        👟 Gear Tracker
                    </h3>
                    <span style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 'bold' }}>Active</span>
                </div>

                {userSettings?.shoes && userSettings.shoes.length > 0 ? (
                    userSettings.shoes.slice(0, 1).map((shoe, idx) => (
                        <div key={idx}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#cbd5e1', marginBottom: '6px' }}>
                                <span>{shoe.name}</span>
                                <span>{shoe.distance} / {shoe.target} km</span>
                            </div>
                            <div style={{ width: '100%', height: '8px', background: '#334155', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${Math.min((shoe.distance / shoe.target) * 100, 100)}%`, height: '100%', background: shoe.distance > shoe.target ? '#ef4444' : '#3b82f6', borderRadius: '4px' }}></div>
                            </div>
                            {shoe.distance > shoe.target && <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>Mileage limit exceeded! Consider replacing.</p>}
                        </div>
                    ))
                ) : (
                    <div style={{ textAlign: 'center', color: '#64748b', fontSize: '13px', padding: '10px 0' }}>
                        No active shoes tracking.
                        <br />
                        <button
                            onClick={() => { setActiveTab('gear'); setModalOpen(true); }}
                            style={{ fontSize: '12px', color: '#3b82f6', background: 'none', border: 'none', padding: 0, textDecoration: 'underline', cursor: 'pointer' }}
                        >
                            Add shoes in settings
                        </button>
                    </div>
                )}
            </div>

            {/* Account Actions */}
            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                    onClick={async () => {
                        if (window.confirm('Are you sure you want to log out?')) {
                            await logout();
                            window.location.reload();
                        }
                    }}
                    style={{
                        padding: '16px',
                        background: '#1e293b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '16px',
                        fontWeight: '600',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        cursor: 'pointer'
                    }}
                >
                    <Lock size={20} /> Log Out
                </button>

                <button
                    onClick={async () => {
                        if (window.confirm("WARNING: This will PERMANENTLY delete your account and all data. This action cannot be undone. Are you sure?")) {
                            await deleteAccount();
                        }
                    }}
                    style={{
                        padding: '16px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '12px',
                        fontSize: '16px',
                        fontWeight: '600',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        cursor: 'pointer'
                    }}
                >
                    <Trash2 size={20} /> Delete Account
                </button>
            </div>

            {/* Empty Spacer */}
            <div style={{ height: '40px' }}></div>

            {/* CROPPER MODAL */}
            <AnimatePresence>
                {cropSrc && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0, background: 'black', zIndex: 6000,
                            display: 'flex', flexDirection: 'column'
                        }}
                    >
                        <div style={{ flex: 1, position: 'relative' }}>
                            <Cropper
                                image={cropSrc}
                                crop={crop}
                                zoom={zoom}
                                aspect={1} // Square crop
                                onCropChange={setCrop}
                                onZoomChange={setZoom}
                                onCropComplete={onCropComplete}
                            />
                        </div>
                        <div style={{ padding: '20px', background: '#1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, marginRight: '20px' }}>
                                <span style={{ color: 'white', fontSize: '12px' }}>Zoom</span>
                                <input
                                    type="range"
                                    value={zoom}
                                    min={1}
                                    max={3}
                                    step={0.1}
                                    aria-labelledby="Zoom"
                                    onChange={(e) => setZoom(e.target.value)}
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <button onClick={() => setCropSrc(null)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid white', background: 'transparent', color: 'white' }}>Cancel</button>
                                <button onClick={showCroppedImage} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: 'white', fontWeight: 'bold' }}>Save</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* SETTINGS MODAL */}
            <AnimatePresence>
                {modalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 5000,
                            display: 'flex', alignItems: 'end', justifyContent: 'center'
                        }}
                        onClick={() => setModalOpen(false)}
                    >
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            style={{
                                width: '100%', maxWidth: '500px', height: '60vh', background: '#1e293b',
                                borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: '24px',
                                display: 'flex', flexDirection: 'column'
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                {activeTab !== 'menu' ? (
                                    <button onClick={() => setActiveTab('menu')} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                        <ChevronRight size={24} style={{ transform: 'rotate(180deg)' }} /> Back
                                    </button>
                                ) : <div style={{ width: 24 }}></div>}

                                <h2 style={{ margin: 0, fontSize: '20px', color: 'white' }}>{activeTab === 'menu' ? 'Settings' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h2>

                                <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><X /></button>
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto' }}>

                                {/* MAIN MENU LIST */}
                                {activeTab === 'menu' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {[
                                            { id: 'profile', icon: <User size={20} />, label: 'Edit Profile' },
                                            { id: 'gear', icon: <span style={{ fontSize: '18px' }}>👟</span>, label: 'Manage Gear' },
                                            { id: 'notifications', icon: <Bell size={20} />, label: 'Notifications' },
                                            { id: 'data', icon: <Heart size={20} />, label: 'Report & Export' },
                                            { id: 'privacy', icon: <Lock size={20} />, label: 'Privacy & Data' },
                                        ].map((item) => (
                                            <div
                                                key={item.id}
                                                onClick={() => setActiveTab(item.id)}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '16px', padding: '16px',
                                                    background: '#0f172a', borderRadius: '12px',
                                                    cursor: 'pointer', border: '1px solid #334155'
                                                }}
                                            >
                                                <span style={{ color: '#94a3b8' }}>{item.icon}</span>
                                                <span style={{ flex: 1, fontSize: '15px', color: 'white', fontWeight: '500' }}>{item.label}</span>
                                                <ChevronRight size={16} color="#475569" />
                                            </div>
                                        ))}

                                        <div
                                            onClick={async () => {
                                                if (window.confirm('Are you sure you want to log out?')) {
                                                    await logout();
                                                    window.location.reload();
                                                }
                                            }}
                                            style={{
                                                marginTop: '20px',
                                                display: 'flex', alignItems: 'center', gap: '16px', padding: '16px',
                                                cursor: 'pointer',
                                                background: 'rgba(239, 68, 68, 0.1)',
                                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                                borderRadius: '12px'
                                            }}
                                        >
                                            <span style={{ color: '#ef4444' }}><Lock size={20} /></span>
                                            <span style={{ flex: 1, fontSize: '15px', fontWeight: 'bold', color: '#ef4444' }}>Log Out</span>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'profile' && userSettings && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        <label>
                                            <span style={{ fontSize: '14px', color: '#94a3b8', display: 'block', marginBottom: '8px' }}>Display Name</span>
                                            <input
                                                type="text"
                                                value={userSettings.name}
                                                onChange={(e) => updateSettings({ name: e.target.value })}
                                                style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#0f172a', border: '1px solid #334155', color: 'white', fontSize: '16px' }}
                                            />
                                        </label>

                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                            <label>
                                                <span style={{ fontSize: '14px', color: '#94a3b8', display: 'block', marginBottom: '8px' }}>Height (cm)</span>
                                                <input
                                                    type="number"
                                                    value={userSettings.height || ''}
                                                    onChange={(e) => updateSettings({ height: Number(e.target.value) })}
                                                    style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#0f172a', border: '1px solid #334155', color: 'white', fontSize: '16px' }}
                                                />
                                            </label>
                                            <label>
                                                <span style={{ fontSize: '14px', color: '#94a3b8', display: 'block', marginBottom: '8px' }}>Weight (kg)</span>
                                                <input
                                                    type="number"
                                                    value={userSettings.weight}
                                                    onChange={(e) => updateSettings({ weight: Number(e.target.value) })}
                                                    style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#0f172a', border: '1px solid #334155', color: 'white', fontSize: '16px' }}
                                                />
                                            </label>
                                        </div>

                                        <label>
                                            <span style={{ fontSize: '14px', color: '#94a3b8', display: 'block', marginBottom: '8px' }}>Date of Birth</span>
                                            <input
                                                type="date"
                                                value={userSettings.dob || ''}
                                                onChange={(e) => updateSettings({ dob: e.target.value })}
                                                style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#0f172a', border: '1px solid #334155', color: 'white', fontSize: '16px' }}
                                            />
                                        </label>

                                        <label>
                                            <span style={{ fontSize: '14px', color: '#94a3b8', display: 'block', marginBottom: '8px' }}>Gender</span>
                                            <select
                                                value={userSettings.gender || 'Prefer not to say'}
                                                onChange={(e) => updateSettings({ gender: e.target.value })}
                                                style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#0f172a', border: '1px solid #334155', color: 'white', fontSize: '16px' }}
                                            >
                                                <option value="Male">Male</option>
                                                <option value="Female">Female</option>
                                                <option value="Non-binary">Non-binary</option>
                                                <option value="Prefer not to say">Prefer not to say</option>
                                            </select>
                                        </label>

                                        {/* Save Button (Visual only since persistence is strict/instant, but gives user feedback) */}
                                        <button
                                            onClick={() => setModalOpen(false)}
                                            style={{
                                                marginTop: '16px',
                                                padding: '16px',
                                                background: '#22c55e',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '12px',
                                                fontWeight: 'bold',
                                                fontSize: '16px',
                                                cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                            }}
                                        >
                                            <Save size={20} /> Save Profile
                                        </button>
                                    </div>
                                )}

                                {activeTab === 'gear' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        <h3 style={{ color: 'white', margin: 0, fontSize: '18px' }}>My Shoe Rotation</h3>

                                        {/* List */}
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            {userSettings?.shoes?.map((shoe, idx) => (
                                                <div key={idx} style={{ background: '#0f172a', padding: '12px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <div style={{ color: 'white', fontWeight: 'bold' }}>{shoe.name}</div>
                                                        <div style={{ color: '#94a3b8', fontSize: '12px' }}>{shoe.distance} / {shoe.target} km</div>
                                                        {shoe.active && <span style={{ color: '#22c55e', fontSize: '10px', background: 'rgba(34,197,94,0.1)', padding: '2px 6px', borderRadius: '4px' }}>ACTIVE</span>}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '8px' }}>
                                                        {!shoe.active && (
                                                            <button
                                                                onClick={() => {
                                                                    // Set this one active, others inactive (if single active logic) usually people rotate.
                                                                    // Let's assume single active for tracking simplicity for now, or multi active?
                                                                    // Simple: Set this active.
                                                                    const newShoes = userSettings.shoes.map((s, i) => i === idx ? { ...s, active: true } : { ...s, active: false });
                                                                    updateSettings({ shoes: newShoes });
                                                                }}
                                                                style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #3b82f6', color: '#3b82f6', background: 'none', cursor: 'pointer', fontSize: '12px' }}>
                                                                Select
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => {
                                                                const newShoes = userSettings.shoes.filter((_, i) => i !== idx);
                                                                updateSettings({ shoes: newShoes });
                                                            }}
                                                            style={{ padding: '6px', borderRadius: '8px', border: 'none', color: '#ef4444', background: 'rgba(239,68,68,0.1)', cursor: 'pointer' }}>
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                            {(!userSettings?.shoes || userSettings.shoes.length === 0) && <p style={{ color: '#64748b', fontSize: '14px', textAlign: 'center' }}>No shoes added yet.</p>}
                                        </div>

                                        {/* Add New */}
                                        <div style={{ borderTop: '1px solid #334155', paddingTop: '20px' }}>
                                            <h4 style={{ color: '#cbd5e1', margin: '0 0 12px 0', fontSize: '14px' }}>Add New Pair</h4>
                                            <input
                                                type="text"
                                                placeholder="Model Name (e.g. Nike Pegasus)"
                                                value={newShoeName}
                                                onChange={e => setNewShoeName(e.target.value)}
                                                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#0f172a', border: '1px solid #334155', color: 'white', marginBottom: '12px' }}
                                            />
                                            <div style={{ display: 'flex', gap: '12px' }}>
                                                <input
                                                    type="number"
                                                    placeholder="Target km"
                                                    value={newShoeTarget}
                                                    onChange={e => setNewShoeTarget(Number(e.target.value))}
                                                    style={{ flex: 1, padding: '12px', borderRadius: '8px', background: '#0f172a', border: '1px solid #334155', color: 'white' }}
                                                />
                                                <button
                                                    onClick={() => {
                                                        if (!newShoeName) return;
                                                        const newShoe = { name: newShoeName, target: newShoeTarget, distance: 0, active: true }; // Auto active if new?
                                                        // If it's the first shoe, make it active.
                                                        // Or just add it.
                                                        const currentShoes = userSettings.shoes || [];
                                                        // Deactivate others if we want auto-switch? Let's just append.
                                                        updateSettings({ shoes: [...currentShoes, newShoe] });
                                                        setNewShoeName('');
                                                    }}
                                                    style={{ padding: '0 24px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                                                    Add
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'notifications' && (
                                    <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '40px' }}>
                                        <Bell size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                                        <p>Push notifications are not supported in this web demo.</p>
                                    </div>
                                )}

                                {activeTab === 'data' && (
                                    <div>
                                        <div onClick={handleExport} className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', marginBottom: '16px' }}>
                                            <Download size={24} color="#3b82f6" />
                                            <div>
                                                <h4 style={{ margin: 0, color: 'white' }}>Generate PDF Report</h4>
                                                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>Save your run history as a professional PDF document</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'privacy' && (
                                    <div>
                                        <div onClick={clearData} className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', border: '1px solid rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.05)' }}>
                                            <Trash2 size={24} color="#ef4444" />
                                            <div>
                                                <h4 style={{ margin: 0, color: '#ef4444' }}>Clear All Data</h4>
                                                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>Permanently delete all runs and settings</p>
                                            </div>
                                        </div>

                                        <div
                                            onClick={() => {
                                                setActiveTab('trash');
                                                fetchTrash().then(setTrashRuns);
                                            }}
                                            className="card"
                                            style={{ marginTop: '16px', padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', border: '1px solid #334155' }}
                                        >
                                            <Trash2 size={24} color="#94a3b8" />
                                            <div>
                                                <h4 style={{ margin: 0, color: 'white' }}>Recently Deleted</h4>
                                                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>Recover deleted runs</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'trash' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {trashRuns.length === 0 && (
                                            <p style={{ textAlign: 'center', color: '#64748b' }}>Trash bin is empty.</p>
                                        )}
                                        {trashRuns.map(run => (
                                            <div key={run._id} className="card" style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <div style={{ color: 'white', fontWeight: 'bold' }}>{run.distance} km</div>
                                                    <div style={{ fontSize: '12px', color: '#64748b' }}>{new Date(run.date).toLocaleDateString('en-US')}</div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button
                                                        onClick={async () => {
                                                            await restoreRun(run._id);
                                                            setTrashRuns(prev => prev.filter(r => r._id !== run._id));
                                                        }}
                                                        style={{ padding: '6px 12px', borderRadius: '8px', background: '#22c55e', color: 'white', border: 'none', cursor: 'pointer', fontSize: '12px' }}>
                                                        Restore
                                                    </button>
                                                    <button
                                                        onClick={async () => {
                                                            if (window.confirm("Permanently delete this run?")) {
                                                                await permanentlyDeleteRun(run._id);
                                                                setTrashRuns(prev => prev.filter(r => r._id !== run._id));
                                                            }
                                                        }}
                                                        style={{ padding: '6px 12px', borderRadius: '8px', background: 'rgba(239,68,68,0.2)', color: '#ef4444', border: 'none', cursor: 'pointer', fontSize: '12px' }}>
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                        </motion.div>
                    </motion.div>
                )
                }
            </AnimatePresence >
            {/* FOLLOW LIST MODAL */}
            <AnimatePresence>
                {showFollowModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={{
                            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 6000,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
                        }}
                        onClick={() => setShowFollowModal(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            style={{
                                width: '100%', maxWidth: '360px', maxHeight: '60vh',
                                background: '#1e293b', borderRadius: '16px', overflow: 'hidden',
                                display: 'flex', flexDirection: 'column'
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div style={{ padding: '16px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={{ margin: 0, color: 'white', fontSize: '16px' }}>
                                    {showFollowModal === 'followers' ? 'Followers' : 'Following'}
                                </h3>
                                <button onClick={() => setShowFollowModal(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}><X size={20} /></button>
                            </div>

                            <div style={{ overflowY: 'auto', padding: '16px' }}>
                                {(userSettings?.[showFollowModal] && userSettings[showFollowModal].length > 0) ? (
                                    userSettings[showFollowModal].map((u, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                            <Avatar user={u} size={40} />
                                            <span style={{ color: 'white', fontWeight: 'bold' }}>{u.username}</span>
                                        </div>
                                    ))
                                ) : (
                                    <p style={{ textAlign: 'center', color: '#64748b', fontSize: '14px' }}>list is empty.</p>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
}
