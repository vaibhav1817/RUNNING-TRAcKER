import { useState } from 'react';
import { useRun } from '../../context/RunProvider';
import { useNavigate } from 'react-router-dom';
import Loader from '../../components/Loader';
import bgImage from './login background.jpg';
import { Eye, EyeOff } from 'lucide-react';

export default function Login() {
    const [isRegister, setIsRegister] = useState(false);
    const [formData, setFormData] = useState({ username: '', email: '', password: '' });
    const { login, register } = useRun();
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            if (isRegister) {
                await register(formData);
            } else {
                await login(formData.email, formData.password);
            }
            navigate('/'); // Go to home on success
        } catch (err) {
            setError(err.message || 'Authentication failed');
            setLoading(false);
        }
    };

    return (
        <div className="page" style={{
            minHeight: '100dvh',
            width: '100%',
            display: 'flex',
            flexDirection: 'column', // Ensure decent layout if keyboard opens
            justifyContent: 'center',
            alignItems: 'center',
            padding: '20px',
            // Background Image with Dark Overlay
            backgroundImage: `linear-gradient(rgba(2, 6, 23, 0.7), rgba(2, 6, 23, 0.8)), url(${bgImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center center',
            backgroundRepeat: 'no-repeat'
        }}>
            <div className="card" style={{
                maxWidth: '400px', width: '100%', padding: '32px',
                background: 'rgba(255, 255, 255, 0.05)', // Extremely transparent
                backdropFilter: 'blur(10px)', // Glass effect
                border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
                <h2 style={{ textAlign: 'center', marginBottom: '24px', color: 'white' }}>
                    {isRegister ? 'Create Account' : 'Welcome Back'}
                </h2>

                {error && <div style={{ background: '#ef4444', color: 'white', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', textAlign: 'center', whiteSpace: 'pre-wrap' }}>{error}</div>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {isRegister && (
                        <div>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#94a3b8', fontSize: '14px' }}>Name</label>
                            <input
                                type="text"
                                value={formData.username}
                                onChange={e => setFormData({ ...formData, username: e.target.value })}
                                required
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: 'white', fontSize: '16px' }}
                            />
                        </div>
                    )}

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#94a3b8', fontSize: '14px' }}>Email</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                            required
                            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: 'white', fontSize: '16px' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', color: '#94a3b8', fontSize: '14px' }}>Password</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? "text" : "password"}
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                required
                                style={{ width: '100%', padding: '12px', paddingRight: '40px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: 'white', fontSize: '16px' }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                        {!isRegister && (
                            <div style={{ textAlign: 'right', marginTop: '8px' }}>
                                <button
                                    type="button"
                                    onClick={() => navigate('/forgot-password')}
                                    style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '12px', cursor: 'pointer' }}
                                >
                                    Forgot Password?
                                </button>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary"
                        style={{ marginTop: '16px', background: '#3b82f6', color: 'white', padding: '14px', borderRadius: '8px', fontWeight: 'bold', display: 'flex', justifyContent: 'center', cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.7 : 1 }}
                    >
                        {loading ? <Loader /> : (isRegister ? 'Sign Up' : 'Log In')}
                    </button>
                </form>

                <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: '#94a3b8' }}>
                    {isRegister ? 'Already have an account? ' : "Don't have an account? "}
                    <button
                        onClick={() => setIsRegister(!isRegister)}
                        style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 0, fontSize: '14px', fontWeight: 'bold' }}
                    >
                        {isRegister ? 'Log In' : 'Sign Up'}
                    </button>
                </div>
            </div>
        </div>
    );
}
