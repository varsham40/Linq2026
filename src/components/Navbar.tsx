'use client';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

export default function Navbar() {
    const { user, logout } = useAuth();
    const router = useRouter();

    const handleProtectedClick = (e: React.MouseEvent, path: string) => {
        e.preventDefault();
        if (!user) {
            router.push('/login');
        } else {
            router.push(path);
        }
    };

    return (
        <nav className="navbar">
            <div className="container">
                <div className="glass-panel navbar-content">
                    {/* Logo */}
                    <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontFamily: 'var(--font-outfit)', fontSize: '1.5rem', fontWeight: 'bold' }}>
                            linq
                        </span>
                        <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', background: 'rgba(255,255,255,0.1)' }}>
                            BETA
                        </span>
                    </Link>

                    {/* Desktop Nav */}
                    <div style={{ display: 'flex', gap: '2rem' }} className="hidden-mobile">
                        <Link href="/" style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                            Home
                        </Link>

                        <a href="/dashboard" onClick={(e) => handleProtectedClick(e, '/dashboard')} style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                            Dashboard
                        </a>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {!user ? (
                            <>
                                <Link href="/login" style={{ fontSize: '0.9rem' }}>
                                    Log in
                                </Link>
                                <Link href="/signup" className="btn btn-primary" style={{ padding: '0.5rem 1.2rem', fontSize: '0.9rem' }}>
                                    Get Started
                                </Link>
                            </>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                {/* Profile Link */}
                                <Link href="/profile" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.1)', padding: '0.3rem 0.8rem', paddingRight: '1rem', borderRadius: '50px', transition: 'background 0.2s', border: '1px solid var(--glass-border)' }}>
                                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(to bottom right, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                        {user.displayName?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                    <span style={{ fontSize: '0.9rem' }}>{user.displayName?.split(' ')[0]}</span>
                                </Link>

                                <button onClick={() => logout()} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.8rem', opacity: 0.8 }}>
                                    Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
