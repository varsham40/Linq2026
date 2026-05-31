'use client';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useTheme } from '@/lib/theme-context';
import { Sun, Moon } from 'lucide-react';
import NotificationsDropdown from './NotificationsDropdown';

export default function Navbar() {
    const { user, profile, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const { theme, toggleTheme } = useTheme();

    const handleBack = () => {
        router.back();
    };

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
                    {/* Logo & Back Button */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', color: 'var(--fg)' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.9, color: '#818cf8' }}>
                                <circle cx="18" cy="5" r="3"></circle>
                                <circle cx="6" cy="12" r="3"></circle>
                                <circle cx="18" cy="19" r="3"></circle>
                                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                            </svg>
                            <span style={{ fontFamily: 'var(--font-outfit)', fontSize: '1.4rem', fontWeight: 'bold' }}>
                                linq
                            </span>
                        </Link>

                        {pathname !== '/' && (
                            <button
                                onClick={handleBack}
                                style={{
                                    background: 'var(--hover-bg)',
                                    border: '1px solid var(--glass-border)',
                                    color: 'var(--fg)',
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    fontSize: '0.85rem',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px'
                                }}
                            >
                                ← Back
                            </button>
                        )}
                    </div>

                    {/* Desktop Nav */}
                    {user && (
                        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '1.5rem', alignItems: 'center' }} className="hidden-mobile">
                            <Link href="/"
                                style={{ fontSize: '0.95rem', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--fg)', textDecoration: 'none', fontWeight: '600', transition: 'color 0.2s' }}
                                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--fg)'}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg> Home
                            </Link>

                            <a href="/dashboard" onClick={(e) => handleProtectedClick(e, '/dashboard')}
                                style={{ fontSize: '0.95rem', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--fg)', textDecoration: 'none', fontWeight: '600', transition: 'color 0.2s', cursor: 'pointer' }}
                                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--fg)'}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg> Dashboard
                            </a>

                            {profile?.role === 'club_member' && (
                                <a href="/dashboard/student" onClick={(e) => handleProtectedClick(e, '/dashboard/student')}
                                    style={{ fontSize: '0.95rem', opacity: 0.9, display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--fg)', textDecoration: 'none', fontWeight: '600', transition: 'color 0.2s', cursor: 'pointer' }}
                                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'}
                                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--fg)'}
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> Events
                                </a>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {user && <NotificationsDropdown />}
                        
                        <button onClick={toggleTheme} style={{ background: 'var(--hover-bg)', border: '1px solid var(--glass-border)', color: 'var(--fg)', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.2s' }}>
                            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                        </button>

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
                            <>
                                <button onClick={() => logout()} style={{ padding: '8px 20px', background: 'var(--hover-bg)', border: '1px solid var(--glass-border)', color: 'var(--fg)', borderRadius: '24px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600' }}>
                                    Logout
                                </button>

                                {/* Profile Link */}
                                <Link href="/profile" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 'bold' }}>
                                        {user.displayName?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}
