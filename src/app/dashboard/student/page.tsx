'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { collection, getDocs, query, where, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Event, Registration, Club, College, Certificate } from '@/types';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { RefreshCw, Calendar, MapPin, Clock, Search, Filter, Trophy, Ticket, Eye, MessageSquare, Download, Building2, School, Sparkles, Menu, X } from 'lucide-react';
import TicketModal from '@/components/TicketModal';
import { generateCertificatePDF } from '@/lib/certificate-generator';

const Icons = {
    Refresh: RefreshCw,
    Calendar,
    MapPin,
    Clock,
    Search,
    Filter,
    Trophy,
    Ticket,
    Eye,
    Message: MessageSquare,
    Download,
    School,
    Building: Building2,
    Sparkles
};

// Curated high-quality event images
const PLACEHOLDER_IMAGES = [
    "https://images.unsplash.com/photo-1504384308090-c54be630cd9f?auto=format&fit=crop&w=800&q=80", // Tech/Dark
    "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80", // Workshop
    "https://images.unsplash.com/photo-1544531586-fde5298cdd40?auto=format&fit=crop&w=800&q=80", // Conference
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80", // Crowd
    "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=800&q=80", // Meeting
    "https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&w=800&q=80", // Hall
    "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80", // Coding
    "https://images.unsplash.com/photo-1475721027760-f75b137d9ca9?auto=format&fit=crop&w=800&q=80"  // Abstract
];

const getEventImage = (event: Event) => {
    if (event.posterURL) return event.posterURL;
    // Deterministic selection based on ID chars
    const index = event.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % PLACEHOLDER_IMAGES.length;
    return PLACEHOLDER_IMAGES[index];
};

interface CardProps {
    event: Event;
    clubName: string;
    collegeName: string;
    registration?: Registration;
    onOpenTicket: () => void;
}

export default function StudentDashboard() {
    const { user, profile } = useAuth(); // profile is UserProfile
    const [loading, setLoading] = useState(true);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    // Data State
    const [events, setEvents] = useState<Event[]>([]);
    const [clubs, setClubs] = useState<Club[]>([]);
    const [colleges, setColleges] = useState<College[]>([]);
    const [myRegistrations, setMyRegistrations] = useState<Registration[]>([]);
    const [certificates, setCertificates] = useState<Certificate[]>([]);

    // UI State
    const [activeTab, setActiveTab] = useState<'DISCOVER' | 'MY_EVENTS' | 'CLUBS' | 'CERTIFICATES'>('DISCOVER');
    const [ticketEvent, setTicketEvent] = useState<Event | null>(null);
    const [ticketReg, setTicketReg] = useState<Registration | null>(null);

    // Filters
    const [selectedCollegeId, setSelectedCollegeId] = useState<string>('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!user) return;

        console.log('[Dashboard] Auth User:', user.uid);
        console.log('[Dashboard] Auth Profile:', profile);

        const fetchData = async () => {
            try {
                // 1. Fetch Colleges
                const colMap = new Map<string, College>();
                try {
                    const collegesRef = collection(db, 'colleges');
                    const colSnap = await getDocs(collegesRef);
                    colSnap.docs.forEach(d => {
                        const data = d.data();
                        colMap.set(d.id, { id: d.id, name: data.name || d.id, ...data } as College);
                    });
                } catch (e) { }

                try {
                    const usersRef = collection(db, 'users');
                    const q = query(usersRef, where('role', '==', 'college_admin'));
                    const adminSnap = await getDocs(q);
                    adminSnap.docs.forEach(d => {
                        const data = d.data();
                        const collegeId = data.homeCollegeId.trim();
                        if (collegeId && !colMap.has(collegeId)) {
                            const name = data.collegeName || collegeId.replace(/_/g, ' ').toUpperCase();
                            colMap.set(collegeId, { id: collegeId, name: name } as College);
                        }
                    });
                } catch (e) { }

                // Deduplicate by name if IDs are different but names match
                const uniqueColleges = Array.from(colMap.values()).reduce((acc: College[], curr) => {
                    const exists = acc.find(c => c.name.toLowerCase() === curr.name.toLowerCase());
                    if (!exists) acc.push(curr);
                    return acc;
                }, []);

                setColleges(uniqueColleges);

                // 2. Fetch Events (Robust Date Normalization)
                const eventsRef = collection(db, 'events');
                const qEvents = query(eventsRef, orderBy('startTime', 'desc'));
                const eventsSnap = await getDocs(qEvents);
                const eventsList = eventsSnap.docs.map(d => {
                    const data = d.data();
                    const normalizeDate = (val: any) => {
                        if (typeof val === 'number') return val;
                        if (val?.seconds) return val.seconds * 1000;
                        if (val?.toDate) return val.toDate().getTime();
                        return Date.now(); // Fallback
                    };
                    return {
                        id: d.id,
                        ...data,
                        startTime: normalizeDate(data.startTime),
                        endTime: normalizeDate(data.endTime)
                    };
                }) as Event[];
                setEvents(eventsList);
                console.log(`[Dashboard] Fetched ${eventsList.length} events`);

                // 3. Fetch Clubs
                const clubsRef = collection(db, 'clubs');
                const clubsSnap = await getDocs(clubsRef);
                const clubsList = clubsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Club[];
                setClubs(clubsList);

                // 4. Fetch My Registrations
                // We must use collection group or iterate? Since registrations are subcollection of events, we iterate events.
                console.log(`[Dashboard] Checking registrations for user ${user.uid}...`);
                const regPromises = eventsList.map(ev =>
                    getDoc(doc(db, `events/${ev.id}/registrations`, user.uid))
                );
                const regSnaps = await Promise.all(regPromises);
                const myRegs = regSnaps.filter(s => s.exists()).map(s => ({ id: s.id, ...s.data() } as Registration));
                console.log(`[Dashboard] Found ${myRegs.length} registrations`);
                setMyRegistrations(myRegs);

                // 5. Fetch Certificates
                try {
                    const certsRef = collection(db, `users/${user.uid}/certificates`);
                    const certsSnap = await getDocs(certsRef);
                    setCertificates(certsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Certificate[]);
                } catch (e) { }

            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user]); // Only depend on user, profile changes allow UI update naturally

    const getClubName = (id: string) => clubs.find(c => c.id === id)?.name || 'Unknown Club';
    const getCollegeName = (id: string) => colleges.find(c => c.id === id)?.name || id;

    const openTicket = (event: Event, reg: Registration) => {
        setTicketEvent(event);
        setTicketReg(reg);
    };

    const passesFilters = (event: Event) => {
        // Enforce College-Only Scoping: Hide if scope is COLLEGE (default) and doesn't match user's home college
        const scope = (event.scope || 'COLLEGE').toUpperCase();

        // DEBUG LOGGING
        if (event.title.includes('HackFest')) {
            console.log(`[FilterDebug] Event: ${event.title}, Scope: ${scope} (raw: ${event.scope}), EventCollege: ${event.collegeId}, UserCollege: ${profile?.homeCollegeId}`);
        }

        if (scope === 'COLLEGE' && event.collegeId !== profile?.homeCollegeId) return false;

        if (searchQuery && !event.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (selectedCollegeId !== 'ALL' && event.collegeId !== selectedCollegeId) return false;
        return true;
    };

    const myEventIds = new Set(myRegistrations.map(r => r.eventId));

    // Discover: Not Registered AND Future AND Not Ended
    const discoverEvents = events.filter(e =>
        !myEventIds.has(e.id) &&
        new Date(e.endTime).getTime() >= Date.now() &&
        e.status !== 'ENDED' &&
        passesFilters(e)
    );

    const liveDiscoverEvents = discoverEvents.filter(e => new Date(e.startTime).getTime() <= Date.now());
    const upcomingDiscoverEvents = discoverEvents.filter(e => new Date(e.startTime).getTime() > Date.now());

    // Upcoming: Registered AND Future AND Not Ended
    const upcomingRegistrations = events.filter(e =>
        myEventIds.has(e.id) &&
        new Date(e.endTime).getTime() > Date.now() &&
        e.status !== 'ENDED' &&
        passesFilters(e)
    );

    // Past: Registered AND (Past OR Ended)
    const pastEvents = events.filter(e =>
        myEventIds.has(e.id) &&
        (new Date(e.endTime).getTime() < Date.now() || e.status === 'ENDED') &&
        passesFilters(e)
    );

    const filteredCertificates = certificates.filter(cert => {
        const event = events.find(e => e.id === cert.eventId);
        if (!event) return false;
        if (searchQuery && !event.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (selectedCollegeId !== 'ALL' && event.collegeId !== selectedCollegeId) return false;
        return true;
    });

    const filteredClubs = clubs.filter(c => {
        if (searchQuery && !c.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        if (selectedCollegeId !== 'ALL' && c.collegeId !== selectedCollegeId && getCollegeName(c.collegeId) !== getCollegeName(selectedCollegeId)) return false;
        return true;
    });

    if (loading) return <div className="min-h-screen bg-zinc-950 grid place-items-center text-white">Loading...</div>;

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
                        { id: 'DISCOVER', label: 'Dash', icon: Icons.Search },
                        { id: 'MY_EVENTS', label: 'Events', icon: Icons.Calendar },
                        { id: 'CLUBS', label: 'Clubs', icon: Icons.Filter },
                        { id: 'CERTIFICATES', label: 'Certs', icon: Icons.Trophy }
                    ].map(nav => (
                        <button
                            key={nav.id}
                            className={activeTab === nav.id ? 'active' : ''}
                            onClick={() => { setActiveTab(nav.id as any); setIsMobileSidebarOpen(false); }}
                            title={nav.label}
                        >
                            <nav.icon size={22} />
                            <span className="mobile-only">{nav.label}</span>
                        </button>
                    ))}
                </div>

                {/* MAIN CONTENT AREA */}
                <div className="dashboard-content" style={{ flex: 1 }}>

                    <button className="mobile-sidebar-hamburger" onClick={() => setIsMobileSidebarOpen(true)}>
                        <Menu size={20} /> <span>Menu</span>
                    </button>

                    {/* Welcome Header - Centered */}
                    <div style={{ marginBottom: '40px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', fontFamily: 'var(--font-outfit)', marginBottom: '8px', color: 'var(--fg)' }}>Welcome back, {user?.displayName?.split(' ')[0] || 'student'}!</h1>
                        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '600px' }}>Explore events, manage your tickets, and download certificates.</p>
                    </div>

                    {/* Filters */}
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '40px', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ flex: 1, maxWidth: '400px', position: 'relative' }}>
                            <Icons.Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                style={{ width: '100%', padding: '14px 14px 14px 44px', background: 'var(--input-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', color: 'var(--fg)', outline: 'none', fontSize: '0.95rem', fontWeight: '500', transition: 'border-color 0.2s' }}
                            />
                        </div>

                        <div style={{ position: 'relative', minWidth: '240px' }}>
                            <Icons.School style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                            <select
                                value={selectedCollegeId}
                                onChange={e => setSelectedCollegeId(e.target.value)}
                                style={{ width: '100%', padding: '14px 14px 14px 44px', background: 'var(--input-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', color: 'var(--fg)', appearance: 'none', cursor: 'pointer', height: '100%', fontSize: '0.95rem', fontWeight: '500', transition: 'border-color 0.2s' }}
                            >
                                <option value="ALL">All Colleges</option>
                                {profile?.homeCollegeId && (
                                    <option value={profile.homeCollegeId}>My Campus ({profile.homeCollegeId})</option>
                                )}
                                {colleges
                                    .filter(c => c.id !== profile?.homeCollegeId && c.name !== profile?.homeCollegeId)
                                    .map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))
                                }
                            </select>
                            <div style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }}>▼</div>
                        </div>
                    </div>

                    {/* Content */}
                    {activeTab === 'DISCOVER' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
                            {discoverEvents.length === 0 && <div style={{ opacity: 0.5, textAlign: 'center', padding: '40px' }}>No upcoming events found.</div>}

                            {liveDiscoverEvents.length > 0 && (
                                <section>
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981' }}>
                                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }}></div>
                                        Live Events
                                    </h2>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                                        {liveDiscoverEvents.map(event => (
                                            <EventCard key={event.id} event={event} clubName={getClubName(event.clubId)} collegeName={getCollegeName(event.collegeId)} registration={undefined} onOpenTicket={() => { }} />
                                        ))}
                                    </div>
                                </section>
                            )}

                            {upcomingDiscoverEvents.length > 0 && (
                                <section>
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--fg)' }}>
                                        <Calendar size={24} color="var(--primary)" /> Upcoming Events
                                    </h2>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                                        {upcomingDiscoverEvents.map(event => (
                                            <EventCard key={event.id} event={event} clubName={getClubName(event.clubId)} collegeName={getCollegeName(event.collegeId)} registration={undefined} onOpenTicket={() => { }} />
                                        ))}
                                    </div>
                                </section>
                            )}
                        </div>
                    )}

                    {activeTab === 'MY_EVENTS' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '60px' }}>
                            <section>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Calendar size={24} color="var(--primary)" /> Upcoming
                                </h2>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                                    {upcomingRegistrations.length === 0 && <div style={{ opacity: 0.8, gridColumn: '1/-1', textAlign: 'center', padding: '40px', border: '1px dashed var(--card-border)', borderRadius: '12px', color: 'var(--text-muted)' }}>No upcoming registered events.</div>}
                                    {upcomingRegistrations.map(event => (
                                        <EventCard key={event.id} event={event} clubName={getClubName(event.clubId)} collegeName={getCollegeName(event.collegeId)} registration={myRegistrations.find(r => r.eventId === event.id)} onOpenTicket={() => openTicket(event, myRegistrations.find(r => r.eventId === event.id)!)} />
                                    ))}
                                </div>
                            </section>
                            <section>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <Clock size={24} color="var(--primary)" /> Past Events
                                </h2>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                                    {pastEvents.length === 0 && <div style={{ opacity: 0.5 }}>No past events.</div>}
                                    {pastEvents.map(event => (
                                        <PastEventCard key={event.id} event={event} profile={profile} registration={myRegistrations.find(r => r.eventId === event.id)} certificate={certificates.find(c => c.eventId === event.id)} clubName={getClubName(event.clubId)} collegeName={getCollegeName(event.collegeId)} onOpenTicket={() => openTicket(event, myRegistrations.find(r => r.eventId === event.id)!)} />
                                    ))}
                                </div>
                            </section>
                        </div>
                    )}

                    {activeTab === 'CLUBS' && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
                            {filteredClubs.length === 0 && <div style={{ opacity: 0.5 }}>No clubs found.</div>}
                            {filteredClubs.map(club => (
                                <div key={club.id} style={{ background: 'var(--card-bg)', padding: '24px', borderRadius: '20px', border: '1px solid var(--card-border)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#27272a', overflow: 'hidden' }}>
                                            <img src={club.logoURL || `https://ui-avatars.com/api/?name=${club.name}&background=random`} style={{ width: '100%', height: '100%' }} />
                                        </div>
                                        <div>
                                            <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{club.name}</h3>
                                            <div style={{ fontSize: '0.8rem', color: '#71717a' }}>{getCollegeName(club.collegeId)}</div>
                                        </div>
                                    </div>
                                    <Link href={`/clubs/${club.id}`} style={{ display: 'block', padding: '10px', background: 'var(--input-bg)', color: 'var(--primary)', border: '1px solid var(--card-border)', borderRadius: '12px', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 'bold', textAlign: 'center', transition: 'background 0.2s' }}>
                                        View Profile
                                    </Link>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'CERTIFICATES' && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                            {filteredCertificates.length === 0 && <div style={{ opacity: 0.5, gridColumn: '1/-1', textAlign: 'center', padding: '40px' }}>No certificates found.</div>}
                            {filteredCertificates.map(cert => {
                                const event = events.find(e => e.id === cert.eventId);
                                const eventTitle = event?.title || cert.eventName || 'Unknown Event';
                                return (
                                    <div key={cert.id} style={{ background: 'var(--card-bg)', padding: '24px', borderRadius: '20px', border: '1px solid var(--card-border)', textAlign: 'center' }}>
                                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(234, 179, 8, 0.1)', color: '#facc15', display: 'grid', placeItems: 'center', margin: '0 auto 16px auto' }}>
                                            <Icons.Trophy size={40} />
                                        </div>
                                        <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{eventTitle}</h3>
                                        <p style={{ fontSize: '0.9rem', color: '#71717a', marginBottom: '24px' }}>{event && getCollegeName(event.collegeId)}</p>
                                        <button onClick={() => { if (event) generateCertificatePDF(cert, event); else window.open(cert.downloadURL, '_blank'); }} style={{ padding: '12px 24px', borderRadius: '50px', background: '#eab308', color: '#000', fontWeight: 'bold', border: 'none', cursor: 'pointer', width: '100%' }}>
                                            Download
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {ticketEvent && ticketReg && <TicketModal event={ticketEvent} reg={ticketReg} onClose={() => { setTicketEvent(null); setTicketReg(null); }} userDisplayName={user?.displayName || 'Student'} />}
                </div>
            </main>
        </div>
    );
}

function EventCard({ event, clubName, collegeName, registration, onOpenTicket }: CardProps) {
    const isEnded = new Date(event.endTime).getTime() < Date.now() || event.status === 'ENDED';
    const imageSrc = getEventImage(event);

    return (
        <div style={{ background: 'var(--card-bg)', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
            <div style={{ height: '180px', background: 'var(--hover-bg)', position: 'relative' }}>
                <img src={imageSrc} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: isEnded ? 'grayscale(100%) opacity(0.5)' : 'none' }} />
                {registration && <div style={{ position: 'absolute', top: '12px', right: '12px', padding: '4px 10px', borderRadius: '20px', background: '#22c55e', fontSize: '0.7rem', fontWeight: 'bold', color: '#fff' }}>✓ REGISTERED</div>}
                {isEnded && <div style={{ position: 'absolute', top: '12px', right: '12px', padding: '4px 12px', borderRadius: '20px', background: 'rgba(239, 68, 68, 0.9)', fontSize: '0.75rem', fontWeight: 'bold', color: '#fff' }}>ENDED</div>}
            </div>
            <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '8px', lineHeight: '1.2' }}>{event.title}</h3>
                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid var(--card-border)' }}>
                    <Link href={`/events/${event.id}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: 'var(--fg)', textDecoration: 'none', background: 'none', border: 'none', cursor: 'pointer' }}><Icons.Eye size={20} /><div style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>Details</div></Link>
                    {registration && <button onClick={onOpenTicket} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', color: 'var(--fg)', background: 'none', border: 'none', cursor: 'pointer' }}><Icons.Ticket size={20} /><div style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>Ticket</div></button>}
                </div>
            </div>
        </div>
    );
}

function PastEventCard({ event, profile, registration, certificate, clubName, collegeName, onOpenTicket }: { event: Event, profile: any, registration?: Registration, certificate?: Certificate, clubName: string, collegeName: string, onOpenTicket: () => void }) {
    const wasAttended = registration?.attended;
    const isManager = (profile?.role === 'club_member' || profile?.role === 'club_admin') && profile?.clubId === event.clubId;
    const isEventEnded = event.status === 'ENDED' || new Date(event.endTime).getTime() < Date.now();
    
    // Only show feedback and memories if they ACTUALLY attended (or have a cert), or if they are a manager
    const canSeeFeedback = wasAttended || !!certificate || isManager;
    const imageSrc = getEventImage(event);
    const hasWallOfLove = (event as any).recapData?.published;

    return (
        <div style={{ background: 'var(--card-bg)', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ height: '180px', background: 'var(--hover-bg)', position: 'relative' }}>
                <img src={imageSrc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', top: '12px', right: '12px', padding: '4px 12px', borderRadius: '20px', background: 'rgba(239, 68, 68, 0.9)', fontSize: '0.75rem', fontWeight: 'bold', color: '#fff' }}>ENDED</div>
            </div>
            <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 'bold', marginBottom: '8px' }}>{event.title}</h3>
                <div style={{ marginTop: 'auto', display: 'flex', gap: '24px', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid var(--card-border)' }}>
                    <Link href={`/events/${event.id}`} style={{ color: 'var(--fg)', textAlign: 'center', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}><Icons.Eye size={20} /><div style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>Details</div></Link>
                    {registration && <button onClick={onOpenTicket} style={{ background: 'none', border: 'none', color: 'var(--fg)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}><Icons.Ticket size={20} /><div style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>Ticket</div></button>}

                    {hasWallOfLove && canSeeFeedback && (
                        <Link href={`/events/${event.id}#wall-of-love`} style={{ color: '#ec4899', textAlign: 'center', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                            <Icons.Sparkles size={20} />
                            <div style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>Memories</div>
                        </Link>
                    )}

                    {canSeeFeedback && (
                        isEventEnded ? (
                            <Link href={`/events/${event.id}/feedback`} style={{ color: 'var(--fg)', textAlign: 'center', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}><Icons.Message size={20} /><div style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>Feedback</div></Link>
                        ) : (
                            <button disabled style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'not-allowed', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }} title="Event must be ended to give feedback">
                                <Icons.Message size={20} /><div style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>Feedback</div>
                            </button>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
