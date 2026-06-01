'use client';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { collection, query, where, getDocs, doc, getDoc, collectionGroup } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Club, Event } from '@/types';
import { endEvent, generateCertificates } from '@/lib/club-utils';
import { Calendar, Users, Megaphone, Edit2, BarChart2, MessageSquare, Award, PlusCircle, ExternalLink, Settings, StopCircle, Radio, MapPin, Search, FileText, FolderOpen } from 'lucide-react';

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
    const [certsCount, setCertsCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            const clubsRef = collection(db, 'clubs');
            const q = query(clubsRef, where('adminIds', 'array-contains', user.uid));
            const clubSnap = await getDocs(q);

            if (!clubSnap.empty) {
                const c = { id: clubSnap.docs[0].id, ...clubSnap.docs[0].data() } as Club;
                setClub(c);

                const evRef = collection(db, 'events');
                const evQ = query(evRef, where('clubId', '==', c.id));
                const evSnap = await getDocs(evQ);
                const evList = evSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Event[];
                evList.sort((a, b) => b.startTime - a.startTime);
                setEvents(evList);
                
                try {
                    const certsQ = query(collectionGroup(db, 'certificates'), where('clubId', '==', c.id));
                    const certsSnap = await getDocs(certsQ);
                    setCertsCount(certsSnap.size);
                } catch (e) {
                    console.log("Error or index missing for certificates:", e);
                }
            }
            setLoading(false);
        };
        fetchData();
    }, [user]);

    if (loading) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
            <div style={{ width: '40px', height: '40px', border: '4px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
    );

    const upcomingEvents = events.filter(e => e.status !== 'ENDED' && new Date(e.endTime).getTime() >= Date.now()).length;
    const totalRegistrations = events.reduce((acc, e) => acc + (e.attendeeCount || 0), 0);

    const filteredEvents = events.filter(e => {
        if (searchQuery && !e.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', color: 'var(--fg)', fontFamily: 'var(--font-inter)', transition: 'background-color 0.3s ease, color 0.3s ease' }}>
            <Navbar />
            
            <style dangerouslySetInnerHTML={{__html: `
                .stat-card {
                    position: relative;
                    padding: 24px;
                    background: #8b5cf6;
                    color: #ffffff;
                    border-radius: 16px;
                    border: 1px solid #7c3aed;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                }
                .stat-card::before {
                    content: '';
                    position: absolute;
                    top: 0; left: 0; bottom: 0; width: 4px;
                    background: rgba(255,255,255,0.4);
                }

                .icon-box {
                    width: 40px; height: 40px;
                    border-radius: 12px;
                    display: flex; align-items: center; justify-content: center;
                    background: rgba(255, 255, 255, 0.2); 
                    color: #ffffff;
                }

                .action-btn {
                    display: flex; flex-direction: column; align-items: center; justify-content: center;
                    padding: 12px 8px; border-radius: 12px;
                    background: var(--hover-bg); color: var(--fg);
                    text-decoration: none; font-size: 0.75rem; font-weight: bold; gap: 8px;
                    transition: background 0.2s;
                }
                .action-btn:hover { background: var(--card-border); }

                .event-card {
                    background: var(--card-bg);
                    border: 1px solid var(--card-border);
                    border-radius: 24px;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    cursor: pointer;
                    transition: all 0.3s ease;
                }
                .event-card:hover {
                    transform: translateY(-8px);
                    box-shadow: 0 12px 30px rgba(139, 92, 246, 0.25);
                    border-color: rgba(139, 92, 246, 0.5);
                    background: var(--hover-bg);
                }

                @media (max-width: 768px) {
                    .events-grid { grid-template-columns: 1fr !important; }
                    .header-top { flex-direction: column; align-items: flex-start !important; gap: 16px; }
                }
            `}} />

            <main style={{ maxWidth: '1600px', margin: '0 auto', padding: '100px 24px 80px' }}>

                {/* Header Section */}
                <div style={{ marginBottom: '40px' }}>
                    <div className="header-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h1 style={{ fontSize: '2.5rem', fontWeight: '800', fontFamily: 'var(--font-outfit)', letterSpacing: '-0.5px' }}>Club Admin Dashboard</h1>
                        <Link href="/events/create" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: 'var(--primary)', color: '#fff', borderRadius: '16px', fontWeight: 'bold', fontSize: '1rem', textDecoration: 'none', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)', transition: 'transform 0.2s' }}>
                            <PlusCircle size={20} /> Host New Event
                        </Link>
                    </div>

                    {club ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                                {club.logoURL ? (
                                    <img src={club.logoURL} style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }} alt="Club Logo" />
                                ) : (
                                    <Users size={18} />
                                )}
                                <span style={{ fontWeight: 'bold', color: 'var(--fg)' }}>{club.name}</span>
                            </div>
                            <span style={{ color: 'var(--card-border)' }}>|</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                                <MapPin size={18} />
                                <span style={{ fontSize: '0.9rem' }}>{club.collegeId === 'Global_College' ? 'CMRIT' : club.collegeId}</span>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
                                <Link href={`/clubs/${club.id}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '20px', background: 'var(--card-bg)', fontSize: '0.85rem', fontWeight: 'bold', border: '1px solid var(--card-border)', color: 'var(--fg)', textDecoration: 'none' }}>
                                    <ExternalLink size={14} /> External View
                                </Link>
                                <Link href={`/dashboard/club-admin/clubs/${club.id}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '20px', background: 'var(--hover-bg)', fontSize: '0.85rem', fontWeight: 'bold', border: '1px solid var(--card-border)', color: 'var(--fg)', textDecoration: 'none' }}>
                                    <Settings size={14} /> Manage Club
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div style={{ padding: '20px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            You are not assigned to any club yet. Please contact your College Admin.
                        </div>
                    )}
                </div>

                {club && (
                    <>
                        {/* 4 Stat Cards based on Real Data */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '40px' }}>
                            <div className="stat-card c1">
                                <div className="icon-box c1"><Calendar size={20} /></div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)', fontWeight: 'bold', letterSpacing: '0.5px' }}>Events Hosted</div>
                                    <div style={{ fontSize: '2rem', fontWeight: '800', marginTop: '4px' }}>{events.length}</div>
                                </div>
                            </div>
                            <div className="stat-card c2">
                                <div className="icon-box c2"><Users size={20} /></div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)', fontWeight: 'bold', letterSpacing: '0.5px' }}>Registrations</div>
                                    <div style={{ fontSize: '2rem', fontWeight: '800', marginTop: '4px' }}>{totalRegistrations}</div>
                                </div>
                            </div>
                            <div className="stat-card c3">
                                <div className="icon-box c3"><Radio size={20} /></div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)', fontWeight: 'bold', letterSpacing: '0.5px' }}>Upcoming Events</div>
                                    <div style={{ fontSize: '2rem', fontWeight: '800', marginTop: '4px' }}>{upcomingEvents}</div>
                                </div>
                            </div>
                            <div className="stat-card c4">
                                <div className="icon-box c4"><Award size={20} /></div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)', fontWeight: 'bold', letterSpacing: '0.5px' }}>Certificates</div>
                                    <div style={{ fontSize: '2rem', fontWeight: '800', marginTop: '4px' }}>{certsCount}</div>
                                </div>
                            </div>
                        </div>

                        {/* Managed Events */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', fontFamily: 'var(--font-outfit)' }}>Managed Events</h3>
                            <div style={{ position: 'relative', width: '300px' }}>
                                <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                                <input
                                    type="text"
                                    placeholder="Search events..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    style={{ width: '100%', padding: '12px 16px 12px 44px', background: 'var(--input-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', color: 'var(--fg)', outline: 'none', fontSize: '0.95rem', transition: 'border-color 0.2s' }}
                                />
                            </div>
                        </div>

                        {filteredEvents.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)', border: '2px dashed var(--card-border)', borderRadius: '20px' }}>
                                {events.length === 0 ? "No events hosted yet. Start by creating one!" : "No events matched your search."}
                            </div>
                        ) : (
                            <AdminEventSections filteredEvents={filteredEvents} setEvents={setEvents} setCertsCount={setCertsCount} router={router} />
                        )}
                    </>
                )}
            </main>
        </div>
    );
}

const AdminEventSections = ({ filteredEvents, setEvents, setCertsCount, router }: any) => {
    const now = Date.now();
    
    const liveEvents = filteredEvents.filter((e: any) => e.status !== 'ENDED' && new Date(e.startTime).getTime() <= now && new Date(e.endTime).getTime() >= now);
    const upcomingEvents = filteredEvents.filter((e: any) => e.status !== 'ENDED' && new Date(e.startTime).getTime() > now);
    const pastEvents = filteredEvents.filter((e: any) => e.status === 'ENDED' || new Date(e.endTime).getTime() < now);

    const renderSection = (title: string, evs: Event[], titleColor: string) => {
        if (evs.length === 0) return null;
        return (
            <div style={{ marginBottom: '48px' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '24px', color: titleColor, borderBottom: '2px solid var(--card-border)', paddingBottom: '12px' }}>
                    {title} <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>({evs.length})</span>
                </h2>
                <div className="events-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
                    {evs.map((event: any) => {
                        const imageSrc = event.posterURL || getRandomImage(event.id);
                        const isEnded = event.status === 'ENDED' || new Date(event.endTime).getTime() < now;
                        const isActive = !isEnded && new Date(event.startTime).getTime() <= now;

                        return (
                            <div key={event.id} className="event-card" onClick={(e) => {
                                if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) return;
                                router.push(`/events/${event.id}`) 
                            }}>
                                
                                {/* Top Half: Image */}
                                <div style={{ height: '180px', position: 'relative' }}>
                                    <img
                                        src={imageSrc}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        referrerPolicy="no-referrer"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = SAMPLE_IMAGES[0];
                                        }}
                                    />
                                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)' }}></div>
                                    
                                    {/* Status Badge */}
                                    <div style={{ position: 'absolute', top: '16px', right: '16px', background: isActive ? '#10b981' : isEnded ? '#ef4444' : 'var(--primary)', color: isEnded ? '#000000' : '#ffffff', padding: '6px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 'bold', backdropFilter: 'blur(4px)', textTransform: 'uppercase', letterSpacing: '0.5px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                                        {isActive ? 'LIVE NOW' : isEnded ? 'COMPLETED' : 'UPCOMING'}
                                    </div>
                                </div>

                                {/* Bottom Half */}
                                <div style={{ padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    
                                    <h4 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px', color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{event.title}</h4>
                                    
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '24px' }}>
                                        <Calendar size={14} />
                                        <span>{new Date(event.startTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                    </div>

                                    {/* Action Icons Grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '24px' }}>
                                        <Link href={`/events/${event.id}/edit`} className="action-btn">
                                            <div style={{ color: '#a855f7' }}><Edit2 size={20} /></div>
                                            EDIT
                                        </Link>
                                        <Link href={`/events/${event.id}/analytics`} className="action-btn">
                                            <div style={{ color: '#3b82f6' }}><BarChart2 size={20} /></div>
                                            ANALYTICS
                                        </Link>
                                        <Link href={`/events/${event.id}/attendees`} className="action-btn">
                                            <div style={{ color: '#10b981' }}><Users size={20} /></div>
                                            ATTENDEES
                                        </Link>
                                        <Link href={`/events/${event.id}/feedback`} className="action-btn">
                                            <div style={{ color: '#f43f5e' }}><MessageSquare size={20} /></div>
                                            FEEDBACK
                                        </Link>
                                        <Link href={`/events/${event.id}/submissions/config`} className="action-btn">
                                            <div style={{ color: '#fb923c' }}><FileText size={20} /></div>
                                            SUBMISSIONS
                                        </Link>
                                        <Link href={`/events/${event.id}/submissions/view`} className="action-btn">
                                            <div style={{ color: '#ec4899' }}><FolderOpen size={20} /></div>
                                            VIEW WORK
                                        </Link>
                                    </div>

                                    {/* Full Width Action Buttons */}
                                    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <Link href={`/events/${event.id}?view=announcements`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '12px', background: 'var(--hover-bg)', color: 'var(--fg)', borderRadius: '12px', border: '1px solid var(--card-border)', fontSize: '0.9rem', fontWeight: 'bold', textDecoration: 'none', transition: 'background 0.2s' }}>
                                            <Megaphone size={18} color="#a855f7" /> Post Announcement
                                        </Link>
                                        
                                        {!isEnded ? (
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    if (!confirm("Are you sure you want to end this event?")) return;
                                                    await endEvent(event.id);
                                                    setEvents((prev: any[]) => prev.map(ev => ev.id === event.id ? { ...ev, status: 'ENDED' } : ev));
                                                }}
                                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '12px', background: 'var(--hover-bg)', color: 'var(--fg)', borderRadius: '12px', border: '1px solid var(--card-border)', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' }}
                                            >
                                                <StopCircle size={18} color="#ef4444" /> End Event
                                            </button>
                                        ) : (
                                            <button
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    if (!confirm("Generate certificates for all checked-in attendees?")) return;
                                                    try {
                                                        const count = await generateCertificates(event);
                                                        alert(`Success! Generated ${count} certificates.`);
                                                        setCertsCount((prev: number) => prev + count);
                                                    } catch (err) {
                                                        console.error(err);
                                                        alert("Failed to generate certificates.");
                                                    }
                                                }}
                                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '12px', background: 'var(--hover-bg)', color: 'var(--fg)', borderRadius: '12px', border: '1px solid var(--card-border)', fontSize: '0.9rem', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' }}
                                            >
                                                <Award size={18} color="#a855f7" /> Issue Certificates
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div>
            {renderSection("Live Events", liveEvents, "#10b981")}
            {renderSection("Upcoming Events", upcomingEvents, "var(--primary)")}
            {renderSection("Past Events", pastEvents, "var(--text-muted)")}
        </div>
    );
};
