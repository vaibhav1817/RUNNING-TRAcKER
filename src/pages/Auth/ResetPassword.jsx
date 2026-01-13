import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Loader from '../../components/Loader';
import logo from '../../assets/logo.png';

export default function ResetPassword() {
    const { token } = useParams();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword: password })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.message || 'Reset failed');

            setMessage("Password reset successfully! Redirecting...");
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page" style={{ justifyContent: 'center', padding: '20px' }}>
            <div className="card" style={{ maxWidth: '400px', width: '100%', padding: '32px' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
                    <img src={logo} alt="Running Tracker Logo" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
                </div>
                <h2 style={{ textAlign: 'center', marginBottom: '24px', color: 'white' }}>Set New Password</h2>

                {error && <div style={{ background: '#ef4444', color: 'white', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', textAlign: 'center' }}>{error}</div>}
                {message && <div style={{ background: '#22c55e', color: 'white', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', textAlign: 'center' }}>{message}</div>}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#94a3b8', fontSize: '14px' }}>New Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: 'white', fontSize: '16px' }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary"
                        style={{ width: '100%', background: '#3b82f6', color: 'white', padding: '14px', borderRadius: '8px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', cursor: loading ? 'wait' : 'pointer' }}
                    >
                        {loading ? <Loader /> : 'Reset Password'}
                    </button>
                </form>
            </div>
        </div>
    );
}
