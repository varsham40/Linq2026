'use client';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';
import { collection, getDocs, doc, setDoc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Event, Club } from '@/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { downloadCertificatePDF } from '@/lib/certificate-utils';

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

export default function StudentDashboard() {
    const { user } = useAuth();
    const router = useRouter();
    const [events, setEvents] = useState<Event[]>([]);
    const [clubs, setClubs] = useState<Record<string, Club>>({});
    const [filter, setFilter] = useState<'ALL' | 'COLLEGE' | 'GLOBAL'>('ALL');
    const [loading, setLoading] = useState(true);
    const [registering, setRegistering] = useState<string | null>(null);
    const [userHomeCollegeId, setUserHomeCollegeId] = useState<string | null>(null);

    const [myRegistrations, setMyRegistrations] = useState<Set<string>>(new Set());
    const [myCertificates, setMyCertificates] = useState<Map<string, any>>(new Map()); // eventId -> certData

    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            const eventsRef = collection(db, 'events');
            const snap = await getDocs(eventsRef);
            let fetchedEvents = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Event[];

            // Fetch User Profile for Home College ID
            const profileSnap = await getDoc(doc(db, 'users', user.uid));
            if (profileSnap.exists()) {
                setUserHomeCollegeId(profileSnap.data().homeCollegeId || null);
            }

            const now = Date.now();
            fetchedEvents = fetchedEvents.filter(e => e.endTime > now);
            fetchedEvents.sort((a, b) => a.startTime - b.startTime);
            setEvents(fetchedEvents);

            // Fetch Clubs for metadata
            // Optimization: In real app, fetch only needed IDs or use index.
            // For hackathon, fetching all 'clubs' collection is fine if small.
            // If hierarchical, we might struggle. Let's assume root 'clubs' as decided earlier.
            try {
                const clubsRef = collection(db, 'clubs');
                const clubsSnap = await getDocs(clubsRef);
                const clubsMap: Record<string, Club> = {};
                clubsSnap.forEach(doc => {
                    clubsMap[doc.id] = { id: doc.id, ...doc.data() } as Club;
                });
                setClubs(clubsMap);
            } catch (e) {
                console.warn("Could not fetch clubs metadata", e);
            }

            // Fetch registrations
            const userRegsRef = collection(db, `users/${user.uid}/registrations`);
            const userRegsSnap = await getDocs(userRegsRef);
            const regSet = new Set(userRegsSnap.docs.map(d => d.id));

            setMyRegistrations(regSet);

            // Fetch user certificates
            const certsRef = collection(db, `users/${user.uid}/certificates`);
            const certsSnap = await getDocs(certsRef);
            const certMap = new Map();
            certsSnap.docs.forEach(doc => {
                const data = doc.data();
                certMap.set(data.eventId, { id: doc.id, ...data });
            });
            setMyCertificates(certMap);

            setLoading(false);
        };
        fetchData();
    }, [user]);

    const handleRegister = async (event: Event) => {
        if (!user || registering) return;
        setRegistering(event.id);

        try {
            // Fetch user profile to get college ID
            const userProfileSnap = await getDoc(doc(db, 'users', user.uid));
            const userCollegeId = userProfileSnap.exists() ? userProfileSnap.data().homeCollegeId : 'Unknown';

            const eventRegRef = doc(db, `events/${event.id}/registrations/${user.uid}`);
            await setDoc(eventRegRef, {
                userId: user.uid,
                userName: user.displayName,
                userEmail: user.email,
                userCollegeId: userCollegeId || 'Unknown',
                registeredAt: Date.now(),
                attended: false
            });

            const userRegRef = doc(db, `users/${user.uid}/registrations/${event.id}`);
            await setDoc(userRegRef, { eventId: event.id, eventTitle: event.title, eventDate: event.startTime, registeredAt: Date.now() });

            const eventRef = doc(db, 'events', event.id);
            await updateDoc(eventRef, { attendeeCount: increment(1) });

            setMyRegistrations(prev => new Set(prev).add(event.id));
        } catch (e) {
            console.error("Registration failed", e);
            alert("Failed to register.");
        } finally {
            setRegistering(null);
        }
    };

    const handleDownloadCert = (eventId: string) => {
        const cert = myCertificates.get(eventId);
        if (cert) {
            downloadCertificatePDF(cert);
        }
    };

    const filteredEvents = events.filter(e => {
        if (filter === 'ALL') return true;
        if (filter === 'GLOBAL') return e.scope === 'GLOBAL';
        if (filter === 'COLLEGE') {
            const uCollege = (userHomeCollegeId || '').toLowerCase().trim();
            const eCollege = (e.collegeId || '').toLowerCase().trim();

            // Special alias for this hackathon context
            if ((uCollege === 'cmrit' && eCollege === 'global_college') ||
                (uCollege === 'global_college' && eCollege === 'cmrit')) {
                return true;
            }

            return uCollege && eCollege && uCollege === eCollege;
        }
        return true;
    });

    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '40px', height: '40px', border: '4px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#09090b', color: '#fff', fontFamily: 'var(--font-inter)' }}>
            <Navbar />

            <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 24px', paddingTop: '140px', paddingBottom: '80px' }}>

                {/* Header */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '60px', alignItems: 'flex-start' }}>
                    <div>
                        <h1 style={{ fontSize: '3rem', fontWeight: '800', lineHeight: '1.1', marginBottom: '10px', background: 'linear-gradient(to right, #fff, #aaa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            Discover Events
                        </h1>
                        <p style={{ opacity: 0.6, fontSize: '1.1rem', maxWidth: '600px' }}>
                            Explore hackathons, workshops, and meetups happening in your campus and beyond.
                        </p>
                    </div>

                    {/* Filters */}
                    <div style={{ display: 'flex', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        {[
                            { id: 'ALL', label: 'All Events' },
                            { id: 'GLOBAL', label: 'Global' },
                            { id: 'COLLEGE', label: 'My College' },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setFilter(tab.id as any)}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    fontSize: '0.9rem',
                                    fontWeight: '600',
                                    cursor: 'pointer',
                                    background: filter === tab.id ? '#3b82f6' : 'transparent',
                                    color: filter === tab.id ? '#fff' : 'rgba(255,255,255,0.6)',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '30px' }}>
                    {filteredEvents.map(event => {
                        const isRegistered = myRegistrations.has(event.id);
                        const imageSrc = event.posterURL || getRandomImage(event.id);
                        const date = new Date(event.startTime);
                        const club = clubs[event.clubId];
                        const clubName = club ? club.name : 'Unknown Club';
                        const collegeName = club ? club.collegeId : 'College Event';

                        return (
                            <div key={event.id} style={{
                                background: '#121214',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '24px',
                                overflow: 'hidden',
                                display: 'flex',
                                flexDirection: 'column',
                                transition: 'transform 0.2s',
                                cursor: 'default'
                            }}>

                                {/* Image */}
                                <div style={{ height: '200px', position: 'relative', overflow: 'hidden', backgroundColor: '#222' }}>
                                    {/* Use standard img with referrer policy fix */}
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={imageSrc}
                                        alt={event.title}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        referrerPolicy="no-referrer"
                                        onError={(e) => {
                                            // Fallback if image fails
                                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87';
                                        }}
                                    />
                                    <div style={{ position: 'absolute', top: '12px', right: '12px', padding: '4px 10px', borderRadius: '20px', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.2)', textTransform: 'uppercase' }}>
                                        {event.scope === 'GLOBAL' ? 'Global' : 'College'}
                                    </div>
                                    {event.status === 'ENDED' && (
                                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(239, 68, 68, 0.9)', color: '#fff', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)' }}>
                                            EVENT ENDED
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>

                                    {/* Club & College Info */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            {clubName}
                                        </span>
                                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                                            {collegeName === 'Global_College' ? 'CMRIT' : collegeName}
                                        </span>
                                    </div>

                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '12px', lineHeight: '1.4' }}>
                                        {event.title}
                                    </h3>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', fontSize: '0.9rem', opacity: 0.7 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span>📅</span>
                                            <span>{date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' })} • {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span>📍</span>
                                            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.venue}</span>
                                        </div>
                                    </div>

                                    <p style={{ fontSize: '0.9rem', opacity: 0.6, lineHeight: '1.6', marginBottom: '24px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                        {event.description}
                                    </p>

                                    <div style={{ marginTop: 'auto' }}>
                                        {isRegistered ? (
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <div style={{ flex: 1, padding: '12px', background: 'rgba(16, 185, 129, 0.1)', color: '#34d399', borderRadius: '12px', textAlign: 'center', fontSize: '0.9rem', fontWeight: 'bold', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                                    ✓ Registered
                                                </div>
                                                <Link href={`/tickets/${event.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '1.2rem', transition: 'background 0.2s' }}>
                                                    🎟️
                                                </Link>
                                                {myCertificates.has(event.id) && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDownloadCert(event.id); }}
                                                        style={{ padding: '0 12px', background: 'rgba(234, 179, 8, 0.2)', border: '1px solid rgba(234, 179, 8, 0.4)', color: '#facc15', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                        title="Download Certificate"
                                                    >
                                                        🏆
                                                    </button>
                                                )}
                                                {/* Feedback Button for Attended & Ended Events */}
                                                {event.status === 'ENDED' && myCertificates.has(event.id) && (
                                                    <Link
                                                        href={`/events/${event.id}/feedback`}
                                                        style={{ padding: '0 12px', background: 'rgba(59, 130, 246, 0.2)', border: '1px solid rgba(59, 130, 246, 0.4)', color: '#60a5fa', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                        title="Give Feedback"
                                                    >
                                                        💬
                                                    </Link>
                                                )}
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handleRegister(event)}
                                                disabled={!!registering || event.status === 'ENDED'}
                                                style={{
                                                    width: '100%',
                                                    padding: '14px',
                                                    background: event.status === 'ENDED' ? '#3f3f46' : (registering === event.id ? '#555' : '#3b82f6'),
                                                    color: event.status === 'ENDED' ? '#a1a1aa' : '#fff',
                                                    border: 'none',
                                                    borderRadius: '12px',
                                                    fontSize: '1rem',
                                                    fontWeight: 'bold',
                                                    cursor: (registering === event.id || event.status === 'ENDED') ? 'not-allowed' : 'pointer',
                                                    boxShadow: event.status === 'ENDED' ? 'none' : '0 4px 14px 0 rgba(59, 130, 246, 0.39)',
                                                    transition: 'transform 0.1s'
                                                }}
                                            >
                                                {event.status === 'ENDED' ? 'Event Ended' : (registering === event.id ? 'Processing...' : 'Register Now')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {filteredEvents.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '60px', opacity: 0.5 }}>
                        <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🌪️</div>
                        <h3>No events found matching filters</h3>
                    </div>
                )}
            </main>
        </div>
    );
}
