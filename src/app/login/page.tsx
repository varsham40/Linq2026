'use client';

import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const { signInWithGoogle, signInWithEmail } = useAuth();
    const router = useRouter();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleEmailLogin = async () => {
        if (!email || !password) {
            setError("Please enter both email and password.");
            return;
        }
        setLoading(true);
        setError('');

        try {
            await signInWithEmail(email, password);
            router.push('/');
        } catch (err: any) {
            console.error(err);
            setError("Invalid email or password.");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            await signInWithGoogle();
            router.push('/');
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="auth-page">
            {/* Background Effects */}
            <div style={{
                position: 'absolute', top: '20%', left: '50%', transform: 'translate(-50%, -50%)',
                width: '600px', height: '600px', background: 'var(--primary)', opacity: 0.1,
                filter: 'blur(100px)', borderRadius: '50%', zIndex: -1
            }} />

            <div className="glass-panel auth-card">
                <div style={{ marginBottom: '1.5rem' }}>
                    <h1 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Welcome Back</h1>
                    <p style={{ opacity: 0.6 }}>Sign in to manage your college events</p>
                </div>

                <button
                    onClick={handleGoogleLogin}
                    className="btn"
                    style={{ width: '100%', background: 'white', color: 'black', marginBottom: '1.5rem', gap: '0.8rem' }}
                >
                    {/* Google Logo SVG */}
                    <svg width="20" height="20" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Sign in with Google
                </button>

                <div style={{ position: 'relative', margin: '1.5rem 0', opacity: 0.5 }}>
                    <hr style={{ borderColor: 'var(--glass-border)' }} />
                    <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#18181b', padding: '0 10px', fontSize: '0.8rem' }}>OR CONTINUE WITH</span>
                </div>

                {error && <div style={{ color: '#f87171', fontSize: '0.9rem', marginBottom: '1rem', background: 'rgba(248,113,113,0.1)', padding: '0.5rem', borderRadius: '8px' }}>{error}</div>}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <input
                        type="email"
                        placeholder="Email address"
                        className="input-fld"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        className="input-fld"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                        onClick={handleEmailLogin}
                        disabled={loading}
                        className="btn btn-primary w-full"
                    >
                        {loading ? 'Signing In...' : 'Sign In'}
                    </button>
                </div>

                <p style={{ marginTop: '1.5rem', fontSize: '0.9rem', opacity: 0.6 }}>
                    Don't have an account? <Link href="/signup" style={{ color: 'var(--primary)' }}>Sign up</Link>
                </p>
            </div>
        </div>
    );
}
