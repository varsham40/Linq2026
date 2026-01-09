'use client';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Club, Event } from '@/types';

// Fallback images
const SAMPLE_IMAGES = [
    "https://img.freepik.com/free-vector/cloud-services-isometric-composition-with-small-figures-people-with-computer-screens_1284-30497.jpg?t=st=1767964951~exp=1767968551~hmac=a838f4281bc60e4ece2d61e9552f22de1637384ea5eb3c2d0cd1886d369671af",
    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=800&q=80"
];

const getRandomImage = (id: string) => {
    const sum = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return SAMPLE_IMAGES[sum % SAMPLE_IMAGES.length];
};

export default function ClubAdminDashboard() {
    const { user } = useAuth();
    const router = useRouter();
    const [club, setClub] = useState<Club | null>(null);
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            // 1. Fetch My Club
            // We need to find the club where adminIds contains user.uid
            const clubsRef = collection(db, 'clubs');
            const q = query(clubsRef, where('adminIds', 'array-contains', user.uid));
            const clubSnap = await getDocs(q);

            if (!clubSnap.empty) {
                const c = { id: clubSnap.docs[0].id, ...clubSnap.docs[0].data() } as Club;
                setClub(c);

                // 2. Fetch Events for this club
                const evRef = collection(db, 'events');
                const evQ = query(evRef, where('clubId', '==', c.id));
                const evSnap = await getDocs(evQ);
                const evList = evSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Event[];
                // Sort by newest
                evList.sort((a, b) => b.startTime - a.startTime);
                setEvents(evList);
            }
            setLoading(false);
        };
        fetchData();
    }, [user]);

    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '40px', height: '40px', border: '4px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#09090b', color: '#fff', fontFamily: 'var(--font-inter)' }}>
            <Navbar />

            <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', paddingTop: '140px', paddingBottom: '80px' }}>

                {/* Greeting & Club Info */}
                <div style={{ marginBottom: '40px' }}>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '10px' }}>Club Admin Dashboard</h1>
                    {club ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            {club.logoURL && <img src={club.logoURL} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />}
                            <div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{club.name}</h2>
                                <p style={{ opacity: 0.6 }}>{club.collegeId === 'Global_College' ? 'CMRIT' : club.collegeId}</p>
                            </div>
                        </div>
                    ) : (
                        <div style={{ padding: '20px', background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            You are not assigned to any club yet. Please contact your College Admin.
                        </div>
                    )}
                </div>

                {club && (
                    <>
                        {/* Stats Row */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                            <div style={{ padding: '24px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', fontWeight: 'bold' }}>Events Hosted</div>
                                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginTop: '8px' }}>{events.length}</div>
                            </div>
                            <div style={{ padding: '24px', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', fontWeight: 'bold' }}>Total Registrations</div>
                                <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginTop: '8px' }}>
                                    {events.reduce((acc, e) => acc + (e.attendeeCount || 0), 0)}
                                </div>
                            </div>

                            <Link href="/events/create" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#3b82f6', color: '#fff', borderRadius: '16px', fontWeight: 'bold', fontSize: '1.1rem', boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)', transition: 'transform 0.1s' }}>
                                + Host New Event
                            </Link>
                        </div>

                        {/* Recent Events */}
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '20px' }}>Managed Events</h3>

                        {events.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px', opacity: 0.5, border: '2px dashed rgba(255,255,255,0.1)', borderRadius: '20px' }}>
                                No events hosted yet. Start by creating one!
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '30px' }}>
                                {events.map(event => {
                                    const imageSrc = event.posterURL || getRandomImage(event.id);

                                    return (
                                        <div key={event.id} style={{
                                            background: '#121214',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '24px',
                                            overflow: 'hidden',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            cursor: 'pointer',
                                            transition: 'transform 0.2s',
                                        }} onClick={() => router.push(`/events/${event.id}`)}>

                                            <div style={{ height: '160px', position: 'relative' }}>
                                                <img
                                                    src={imageSrc}
                                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                    referrerPolicy="no-referrer"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = SAMPLE_IMAGES[0];
                                                    }}
                                                />
                                                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)' }}></div>
                                                <div style={{ position: 'absolute', bottom: '16px', left: '16px', right: '16px' }}>
                                                    <h4 style={{ fontSize: '1.2rem', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.title}</h4>
                                                </div>
                                                {event.status === 'ENDED' && (
                                                    <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(239, 68, 68, 0.9)', color: '#fff', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.2)' }}>
                                                        ENDED
                                                    </div>
                                                )}
                                            </div>

                                            <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '0.9rem' }}>
                                                    <span style={{ opacity: 0.6 }}>{new Date(event.startTime).toLocaleDateString()}</span>
                                                    <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>{event.attendeeCount || 0} Registered</span>
                                                </div>

                                                <div style={{ marginTop: 'auto', display: 'flex', gap: '10px' }}>
                                                    <button className="btn" style={{ flex: 1, background: 'rgba(255,255,255,0.05)', fontSize: '0.9rem' }}>
                                                        View Details
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
