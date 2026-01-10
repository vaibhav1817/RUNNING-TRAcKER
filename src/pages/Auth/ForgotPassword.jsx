import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Loader from '../../components/Loader';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');

        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.message || 'Request failed');

            setMessage("Password reset link has been sent to your email (Check Server Console).");
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page" style={{ justifyContent: 'center', padding: '20px' }}>
            <div className="card" style={{ maxWidth: '400px', width: '100%', padding: '32px' }}>
                <h2 style={{ textAlign: 'center', marginBottom: '24px', color: 'white' }}>Reset Password</h2>

                {error && <div style={{ background: '#ef4444', color: 'white', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', textAlign: 'center' }}>{error}</div>}
                {message && <div style={{ background: '#22c55e', color: 'white', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', textAlign: 'center' }}>{message}</div>}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#94a3b8', fontSize: '14px' }}>Enter your email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
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
                        {loading ? <Loader /> : 'Send Reset Link'}
                    </button>

                    <button
                        type="button"
                        onClick={() => navigate('/login')}
                        style={{ width: '100%', marginTop: '16px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '14px' }}
                    >
                        Back to Login
                    </button>
                </form>
            </div>
        </div>
    );
}
