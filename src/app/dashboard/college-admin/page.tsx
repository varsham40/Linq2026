'use client';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Club } from '@/types';
import { Building, Users, Calendar, Plus, Home, Eye, Menu, X } from 'lucide-react';

export default function CollegeAdminDashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState({ activeClubs: 0, totalEvents: 0, totalStudents: 0 });
    const [clubs, setClubs] = useState<Club[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('HOME');
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    useEffect(() => {
        if (!user) return;
        const fetchData = async () => {
            try {
                // Fetch clubs
                const clubsRef = collection(db, 'clubs');
                const snap = await getDocs(clubsRef);
                const loadedClubs = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Club[];
                setClubs(loadedClubs);

                // Fetch total events
                const eventsRef = collection(db, 'events');
                const eventsSnap = await getDocs(eventsRef);
                const totalEvents = eventsSnap.docs.length;

                // Fetch total users (students)
                const usersRef = collection(db, 'users');
                const usersSnap = await getDocs(usersRef);
                const totalStudents = usersSnap.docs.length;

                setStats({ activeClubs: loadedClubs.length, totalEvents, totalStudents });
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    if (loading) return <div className="min-h-screen grid place-items-center" style={{ backgroundColor: 'var(--bg)', color: 'var(--fg)' }}>Loading...</div>;

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', color: 'var(--fg)', fontFamily: 'var(--font-inter)', transition: 'background-color 0.3s ease, color 0.3s ease' }}>
            <Navbar />
            <main className="dashboard-layout" style={{ maxWidth: '1600px', margin: '0 auto', padding: '100px 24px 80px', display: 'flex', gap: '32px' }}>

                {isMobileSidebarOpen && (
                    <div className="sidebar-overlay" onClick={() => setIsMobileSidebarOpen(false)}></div>
                )}

                {/* VERTICAL SIDEBAR */}
                <div className={`dashboard-sidebar ${isMobileSidebarOpen ? 'open' : ''}`}>
                    <div className="mobile-only" style={{ alignSelf: 'flex-end', marginBottom: '20px', cursor: 'pointer', padding: '8px' }} onClick={() => setIsMobileSidebarOpen(false)}>
                        <X size={24} color="var(--text-muted)" />
                    </div>
                    {[
                        { id: 'HOME', label: 'Overview', icon: Home },
                    ].map(nav => (
                        <button
                            key={nav.id}
                            className={activeTab === nav.id ? 'active' : ''}
                            onClick={() => { setActiveTab(nav.id); setIsMobileSidebarOpen(false); }}
                            title={nav.label}
                        >
                            <nav.icon size={24} />
                            <span className="mobile-only">{nav.label}</span>
                        </button>
                    ))}
                </div>

                {/* MAIN CONTENT AREA */}
                <div className="dashboard-content" style={{ flex: 1 }}>

                    <button className="mobile-sidebar-hamburger" onClick={() => setIsMobileSidebarOpen(true)}>
                        <Menu size={20} /> <span>Menu</span>
                    </button>

                    {/* Header */}
                    <div style={{ marginBottom: '40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', fontFamily: 'var(--font-outfit)', marginBottom: '8px', color: 'var(--fg)' }}>College Admin Portal</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '600px' }}>Manage clubs, track events, and view institutional reports.</p>
                    </div>

                    {activeTab === 'HOME' && (
                        <>
                            {/* Stats Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '60px' }}>
                                {/* Stat Card 1 */}
                                <div style={{ padding: '24px', background: 'var(--card-bg)', borderRadius: '20px', border: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column', transition: 'all 0.2s' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', fontWeight: 'bold', marginBottom: '16px' }}>
                                        <Building size={20} />
                                        <span style={{ fontSize: '0.85rem', textTransform: 'uppercase' }}>Active Clubs</span>
                                    </div>
                                    <div style={{ fontSize: '3rem', fontWeight: '800', lineHeight: '1' }}>{stats.activeClubs}</div>
                                </div>

                                {/* Stat Card 2 */}
                                <div style={{ padding: '24px', background: 'var(--card-bg)', borderRadius: '20px', border: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column', transition: 'all 0.2s' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 'bold', marginBottom: '16px' }}>
                                        <Calendar size={20} />
                                        <span style={{ fontSize: '0.85rem', textTransform: 'uppercase' }}>Events Hosted</span>
                                    </div>
                                    <div style={{ fontSize: '3rem', fontWeight: '800', lineHeight: '1' }}>{stats.totalEvents}</div>
                                </div>

                                {/* Stat Card 3 */}
                                <div style={{ padding: '24px', background: 'var(--card-bg)', borderRadius: '20px', border: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column', transition: 'all 0.2s' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', fontWeight: 'bold', marginBottom: '16px' }}>
                                        <Users size={20} />
                                        <span style={{ fontSize: '0.85rem', textTransform: 'uppercase' }}>Total Students</span>
                                    </div>
                                    <div style={{ fontSize: '3rem', fontWeight: '800', lineHeight: '1' }}>{stats.totalStudents}</div>
                                </div>

                                {/* Action Card */}
                                <Link href="/dashboard/college-admin/add-club" style={{ padding: '24px', background: 'var(--primary)', color: '#fff', borderRadius: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', textDecoration: 'none', boxShadow: '0 10px 30px -10px rgba(192, 132, 252, 0.5)', transition: 'transform 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                                    <Plus size={40} style={{ marginBottom: '8px' }} />
                                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Add New Club</div>
                                    <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>Register a new entity</div>
                                </Link>
                            </div>

                            {/* Clubs List */}
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '24px', color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Building size={24} color="var(--primary)" /> Registered Clubs
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                                {clubs.length === 0 && <div style={{ color: 'var(--text-muted)' }}>No clubs registered yet.</div>}
                                {clubs.map(club => (
                                    <div key={club.id} style={{ background: 'var(--card-bg)', padding: '24px', borderRadius: '20px', border: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s, box-shadow 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.1)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                                            <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--hover-bg)', overflow: 'hidden', border: '2px solid var(--card-border)', flexShrink: 0 }}>
                                                {club.logoURL ? <img src={club.logoURL} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>🏫</div>}
                                            </div>
                                            <div>
                                                <h4 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--fg)' }}>{club.name}</h4>
                                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{club.collegeId === 'Global_College' ? 'CMRIT' : club.collegeId}</p>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.6', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1, marginBottom: '20px' }}>
                                            {club.description || 'No description provided.'}
                                        </div>
                                        <Link href={`/clubs/${club.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', background: 'var(--input-bg)', color: 'var(--primary)', border: '1px solid var(--card-border)', borderRadius: '12px', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 'bold', textAlign: 'center', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'} onMouseLeave={(e) => e.currentTarget.style.background = 'var(--input-bg)'}>
                                            <Eye size={16} /> View Profile
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
