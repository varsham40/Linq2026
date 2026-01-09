'use client';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Club } from '@/types';

export default function CollegeAdminDashboard() {
    const { user } = useAuth();
    const [stats, setStats] = useState({ activeClubs: 0, approvals: 0 });
    const [clubs, setClubs] = useState<Club[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        const fetchData = async () => {
            try {
                // Fetch clubs created by this college (Assuming college-wide view or similar)
                // For MVP, if we don't have college filtering yet, we might list all clubs or just mock
                // Let's list actual clubs in 'clubs' collection
                const clubsRef = collection(db, 'clubs');
                // const q = query(clubsRef, where('collegeId', '==', user.homeCollegeId)); // Optimization for later

                const snap = await getDocs(clubsRef);
                const loadedClubs = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Club[];
                setClubs(loadedClubs);
                setStats({ activeClubs: loadedClubs.length, approvals: 2 }); // Mock approvals
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]);

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#09090b', color: '#fff', fontFamily: 'var(--font-inter)' }}>
            <Navbar />
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', paddingTop: '140px', paddingBottom: '80px' }}>

                {/* Header */}
                <div style={{ marginBottom: '40px' }}>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '10px' }}>College Admin Portal</h1>
                    <p style={{ opacity: 0.6, fontSize: '1.1rem' }}>Manage clubs, approve events, and view institutional reports.</p>
                </div>

                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '60px' }}>

                    {/* Stat Card 1 */}
                    <div style={{ padding: '24px', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#3b82f6', fontWeight: 'bold', marginBottom: '8px' }}>Active Clubs</div>
                        <div style={{ fontSize: '3rem', fontWeight: '800', lineHeight: '1' }}>{stats.activeClubs}</div>
                    </div>

                    {/* Stat Card 2 */}
                    <div style={{ padding: '24px', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#f59e0b', fontWeight: 'bold', marginBottom: '8px' }}>Pending Approvals</div>
                        <div style={{ fontSize: '3rem', fontWeight: '800', lineHeight: '1' }}>{stats.approvals}</div>
                    </div>

                    {/* Action Card */}
                    <Link href="/dashboard/college-admin/add-club" style={{ padding: '24px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', borderRadius: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', boxShadow: '0 10px 30px -10px rgba(59, 130, 246, 0.5)', transition: 'transform 0.2s' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>+</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Add New Club</div>
                        <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>Register an entity</div>
                    </Link>
                </div>

                {/* Clubs List */}
                <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '24px' }}>Registered Clubs</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                    {clubs.map(club => (
                        <div key={club.id} style={{ background: '#121214', padding: '24px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#222', overflow: 'hidden' }}>
                                    {club.logoURL ? <img src={club.logoURL} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>🏫</div>}
                                </div>
                                <div>
                                    <h4 style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>{club.name}</h4>
                                    <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>{club.collegeId === 'Global_College' ? 'CMRIT' : club.collegeId}</p>
                                </div>
                            </div>
                            <div style={{ fontSize: '0.9rem', opacity: 0.7, lineHeight: '1.6', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                {club.description || 'No description provided.'}
                            </div>
                        </div>
                    ))}
                </div>

            </div>
        </div>
    );
}
