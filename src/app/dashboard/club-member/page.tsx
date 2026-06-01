'use client';
import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Event, Club } from '@/types';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, Calendar, User, Globe, Instagram, Linkedin, Info, Building, Users, Camera, Download, ScanLine, ArrowUpRight, CheckCircle, BarChart3, Bell, Search, FileText, FolderOpen } from 'lucide-react';

type Tab = 'OPERATIONS' | 'EVENTS' | 'PROFILE';

export default function ClubMemberDashboard() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    const [club, setClub] = useState<Club | null>(null);
    const [memberProfile, setMemberProfile] = useState<any>(null);

    // Data
    const [events, setEvents] = useState<Event[]>([]);
    const [activeTab, setActiveTab] = useState<Tab>('OPERATIONS');
    const [totalAttendees, setTotalAttendees] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            try {
                // 1. Get User Profile to find clubId
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (!userDoc.exists()) {
                    router.push('/signup'); 
                    return;
                }
                const userData = userDoc.data();

                if (userData.role !== 'club_member') {
                    router.push('/dashboard');
                    return;
                }

                if (!userData.clubId) {
                    alert("No club associated with this account.");
                    return;
                }

                setMemberProfile(userData);

                // 2. Fetch Club Details
                const clubSnap = await getDoc(doc(db, 'clubs', userData.clubId));
                if (clubSnap.exists()) {
                    setClub({ id: clubSnap.id, ...clubSnap.data() } as Club);
                }

                // 3. Fetch Club Events
                const eventsRef = collection(db, 'events');
                const q = query(eventsRef, where('clubId', '==', userData.clubId));
                const querySnap = await getDocs(q);
                const evList = querySnap.docs.map(d => ({ id: d.id, ...d.data() })) as Event[];

                evList.sort((a, b) => b.startTime - a.startTime);
                setEvents(evList);

                let attendeesCount = 0;
                evList.forEach(ev => {
                    attendeesCount += (ev.attendeeCount || 0);
                });
                setTotalAttendees(attendeesCount);

            } catch (e) {
                console.error("Dashboard Error:", e);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user, router]);

    const handleExportAttendance = async (eventId: string) => {
        try {
            const regsRef = collection(db, `events/${eventId}/registrations`);
            const q = query(regsRef, where('attended', '==', true));
            const snap = await getDocs(q);

            if (snap.empty) {
                alert("No attendees to export.");
                return;
            }

            const data = snap.docs.map(d => {
                const r = d.data();
                const date = new Date(r.registeredAt || 0).toLocaleDateString();
                const status = r.attended ? 'Attended' : 'Registered';
                return [`"${r.userName || ''}"`, `"${r.userEmail || ''}"`, `"${date}"`, `"${status}"`].join(',');
            });

            const header = "Name,Email,Registered,Status";
            const csv = [header, ...data].join('\n');

            const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
            const blob = new Blob([bom, csv], { type: 'text/csv;charset=utf-8' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `attendance_${eventId}.csv`;
            a.click();
        } catch (e) {
            console.error(e);
            alert("Failed to export.");
        }
    };

    if (loading) return <div className="min-h-screen grid place-items-center" style={{ color: 'var(--fg)' }}>Loading...</div>;

    const upcomingEvents = events.filter(e => e.status !== 'ENDED' && new Date(e.endTime).getTime() >= new Date().getTime());
    const activeEvents = events.filter(e => {
        const now = new Date();
        return new Date(e.startTime) <= now && new Date(e.endTime) >= now;
    });

    const website = club?.socialMedia?.website;
    const instagram = club?.socialMedia?.instagram;
    const linkedin = club?.socialMedia?.linkedin;

    const filteredEvents = events.filter(e => {
        if (searchQuery && !e.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', color: 'var(--fg)', fontFamily: 'var(--font-inter)', transition: 'background-color 0.3s' }}>
            <Navbar />
            
            <main style={{ maxWidth: '1600px', margin: '0 auto', padding: '100px 24px 80px', display: 'flex', gap: '32px' }}>
                
                {/* VERTICAL SIDEBAR */}
                <div style={{ width: '80px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', paddingTop: '16px' }}>
                    <button
                        onClick={() => setActiveTab('OPERATIONS')}
                        style={{
                            width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: activeTab === 'OPERATIONS' ? 'var(--primary)' : 'var(--card-bg)',
                            color: activeTab === 'OPERATIONS' ? '#fff' : 'var(--text-muted)',
                            border: '1px solid var(--card-border)', cursor: 'pointer', transition: 'all 0.2s',
                            boxShadow: activeTab === 'OPERATIONS' ? '0 4px 16px rgba(192, 132, 252, 0.4)' : 'none'
                        }}
                        title="Operations Dashboard"
                    >
                        <LayoutDashboard size={24} />
                    </button>

                    <button
                        onClick={() => setActiveTab('EVENTS')}
                        style={{
                            width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: activeTab === 'EVENTS' ? 'var(--primary)' : 'var(--card-bg)',
                            color: activeTab === 'EVENTS' ? '#fff' : 'var(--text-muted)',
                            border: '1px solid var(--card-border)', cursor: 'pointer', transition: 'all 0.2s',
                            boxShadow: activeTab === 'EVENTS' ? '0 4px 16px rgba(192, 132, 252, 0.4)' : 'none'
                        }}
                        title="Events Management"
                    >
                        <Calendar size={24} />
                    </button>

                    <button
                        onClick={() => setActiveTab('PROFILE')}
                        style={{
                            width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: activeTab === 'PROFILE' ? 'var(--primary)' : 'var(--card-bg)',
                            color: activeTab === 'PROFILE' ? '#fff' : 'var(--text-muted)',
                            border: '1px solid var(--card-border)', cursor: 'pointer', transition: 'all 0.2s',
                            boxShadow: activeTab === 'PROFILE' ? '0 4px 16px rgba(192, 132, 252, 0.4)' : 'none'
                        }}
                        title="My Profile"
                    >
                        <User size={24} />
                    </button>
                </div>

                {/* MAIN CONTENT AREA */}
                <div style={{ flex: 1, paddingLeft: '16px' }}>

                    {/* 1. OPERATIONS */}
                    {activeTab === 'OPERATIONS' && (
                        <div>
                            <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '8px', color: 'var(--fg)' }}>Operations Dashboard</h1>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '40px', fontSize: '1.1rem' }}>Manage club activities and monitor active events from your secure center.</p>
                            
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '32px', alignItems: 'start' }}>
                                
                                {/* Left Column: Quick Stats */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                    <div style={{ background: 'var(--card-bg)', padding: '32px', borderRadius: '24px', border: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--primary)', fontWeight: 'bold' }}>
                                            <BarChart3 size={24} />
                                            <span style={{ fontSize: '1.1rem' }}>Quick Overview</span>
                                        </div>
                                        
                                        <div style={{ background: 'var(--input-bg)', padding: '20px', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                                            <div style={{ fontSize: '3rem', fontWeight: '900', lineHeight: 1, color: 'var(--fg)' }}>{events.length}</div>
                                            <div style={{ fontSize: '1rem', color: 'var(--text-muted)', marginTop: '8px', fontWeight: '500' }}>Total Events</div>
                                        </div>

                                        <div style={{ background: 'var(--input-bg)', padding: '20px', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
                                            <div style={{ fontSize: '3rem', fontWeight: '900', lineHeight: 1, color: '#10b981' }}>{activeEvents.length}</div>
                                            <div style={{ fontSize: '1rem', color: 'var(--text-muted)', marginTop: '8px', fontWeight: '500' }}>Live Events Now</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column: Active Events & Scanner */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--fg)' }}>
                                        <ScanLine size={24} color="#10b981" /> Action Center
                                    </h2>
                                    
                                    {activeEvents.length > 0 ? activeEvents.map(ev => (
                                        <div key={ev.id} style={{ background: 'var(--card-bg)', padding: '32px', borderRadius: '24px', border: '2px solid #10b981', boxShadow: '0 8px 32px rgba(16, 185, 129, 0.1)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '24px' }}>
                                                <div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', fontWeight: 'bold', color: '#10b981', marginBottom: '8px', letterSpacing: '1px' }}>
                                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }}></div>
                                                        LIVE EVENT
                                                    </div>
                                                    <h3 style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--fg)' }}>{ev.title}</h3>
                                                </div>
                                                <div style={{ padding: '8px 16px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', borderRadius: '12px', fontSize: '1rem', fontWeight: 'bold', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                                                    {ev.attendeeCount || 0} checked in
                                                </div>
                                            </div>

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                                <Link href={`/events/${ev.id}/scan`} style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '16px', 
                                                    background: '#10b981', color: '#fff',
                                                    borderRadius: '16px', fontWeight: 'bold', textDecoration: 'none', transition: 'transform 0.2s',
                                                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                                                }}>
                                                    <Camera size={20} /> Launch Scanner
                                                </Link>
                                                <button
                                                    onClick={() => handleExportAttendance(ev.id)}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', width: '100%', padding: '16px', background: 'var(--input-bg)',
                                                        color: 'var(--fg)', border: '1px solid var(--card-border)',
                                                        borderRadius: '16px', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s'
                                                    }}
                                                >
                                                    <Download size={20} /> Export Data
                                                </button>
                                            </div>
                                        </div>
                                    )) : (
                                        <div style={{ background: 'var(--card-bg)', padding: '40px', borderRadius: '24px', border: '1px dashed var(--card-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                                            <Bell size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
                                            <div style={{ fontSize: '1.2rem', fontWeight: '500' }}>No live events happening right now.</div>
                                            <p style={{ marginTop: '8px' }}>Your scanner will appear here when an event is active.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 2. EVENTS */}
                    {activeTab === 'EVENTS' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '40px' }}>
                                <div>
                                    <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '8px', color: 'var(--fg)' }}>Events Hub</h1>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>View and manage all events hosted by your club.</p>
                                </div>
                                <div style={{ position: 'relative', width: '300px', marginTop: '8px' }}>
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
                                    {events.length === 0 ? "Your club hasn't hosted any events yet." : "No events matched your search."}
                                </div>
                            ) : (
                                <EventManagementSection events={filteredEvents} user={user} />
                            )}
                        </div>
                    )}

                    {/* 3. PROFILE */}
                    {activeTab === 'PROFILE' && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '32px' }}>
                            
                            {/* Personal Profile Card */}
                            <div style={{ background: 'var(--card-bg)', padding: '40px', borderRadius: '24px', border: '1px solid var(--card-border)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                                    <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--fg)' }}>My Profile</h3>
                                    <button style={{ padding: '8px 20px', background: 'var(--input-bg)', color: 'var(--primary)', border: '1px solid var(--card-border)', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                                        SAVE CHANGES
                                    </button>
                                </div>
                                
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600' }}>Name</label>
                                        <div style={{ padding: '16px', background: 'var(--input-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px', color: 'var(--fg)', fontWeight: '500' }}>
                                            {user?.displayName}
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600' }}>Club Role</label>
                                        <div style={{ padding: '16px', background: 'var(--input-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px', color: 'var(--fg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontWeight: '500' }}>{memberProfile?.designation || 'Member'}</span>
                                            <CheckCircle size={20} color="var(--primary)" />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600' }}>Email Address</label>
                                        <div style={{ padding: '16px', background: 'var(--input-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px', color: 'var(--fg)', fontWeight: '500' }}>
                                            {user?.email}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '16px', borderRadius: '12px', color: '#ef4444', marginTop: '16px' }}>
                                        <Info size={20} style={{ flexShrink: 0 }} />
                                        <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>Role changes require administrative approval from the Chapter Lead.</span>
                                    </div>
                                </div>
                            </div>

                            {/* Club Details Column */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                
                                {/* Club Card */}
                                <div style={{ background: 'var(--card-bg)', padding: '40px', borderRadius: '24px', border: '1px solid var(--card-border)' }}>
                                    <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '32px', color: 'var(--fg)' }}>Club Details</h3>

                                    <div style={{ marginBottom: '32px' }}>
                                        <label style={{ display: 'block', marginBottom: '12px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600' }}>Club Name</label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--bg)', border: '1px solid var(--card-border)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {club?.logoURL ? <img src={club.logoURL} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Building size={24} color="var(--primary)" />}
                                            </div>
                                            <div style={{ fontSize: '1.8rem', fontWeight: '900', color: 'var(--fg)' }}>{club?.name}</div>
                                        </div>
                                    </div>

                                    <div style={{ marginBottom: '32px' }}>
                                        <label style={{ display: 'block', marginBottom: '12px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600' }}>About</label>
                                        <div style={{ padding: '20px', background: 'var(--input-bg)', border: '1px solid var(--glass-border)', borderRadius: '16px', lineHeight: '1.6', color: 'var(--fg)', fontStyle: 'italic', fontWeight: '500' }}>
                                            "{club?.description || 'No description available for this club.'}"
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', marginBottom: '12px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600' }}>Social Links</label>
                                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                            {instagram && (
                                                <a href={instagram} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '24px', border: '1px solid var(--card-border)', background: 'var(--bg)', color: 'var(--fg)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '600' }}>
                                                    Instagram <ArrowUpRight size={16} />
                                                </a>
                                            )}
                                            {linkedin && (
                                                <a href={linkedin} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '24px', border: '1px solid var(--card-border)', background: 'var(--bg)', color: 'var(--fg)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '600' }}>
                                                    LinkedIn <ArrowUpRight size={16} />
                                                </a>
                                            )}
                                            {website && (
                                                <a href={website} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '24px', border: '1px solid var(--card-border)', background: 'var(--bg)', color: 'var(--fg)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '600' }}>
                                                    Website <ArrowUpRight size={16} />
                                                </a>
                                            )}
                                            {(!instagram && !linkedin && !website) && (
                                                <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No social links added.</div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Stats Mini Cards */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                    <div style={{ background: 'var(--card-bg)', padding: '24px', borderRadius: '20px', border: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600', marginBottom: '8px' }}>Events Managed</div>
                                        <div style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--fg)' }}>{events.length}</div>
                                    </div>
                                    <div style={{ background: 'var(--card-bg)', padding: '24px', borderRadius: '20px', border: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '600', marginBottom: '8px' }}>Total Attendees</div>
                                        <div style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--fg)' }}>{totalAttendees}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </main>
        </div>
    );
}

// -- Sub-Components --

const EventManagementSection = ({ events, user }: { events: Event[], user: any }) => {
    const router = useRouter();
    const now = Date.now();
    
    const liveEvents = events.filter(e => e.status !== 'ENDED' && new Date(e.startTime).getTime() <= now && new Date(e.endTime).getTime() >= now);
    const upcomingEvents = events.filter(e => e.status !== 'ENDED' && new Date(e.startTime).getTime() > now);
    const pastEvents = events.filter(e => e.status === 'ENDED' || new Date(e.endTime).getTime() < now);

    const renderSection = (title: string, evs: Event[], titleColor: string) => {
        if (evs.length === 0) return null;
        return (
            <div style={{ marginBottom: '48px' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '24px', color: titleColor, borderBottom: '2px solid var(--card-border)', paddingBottom: '12px' }}>
                    {title} <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 'normal' }}>({evs.length})</span>
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '32px' }}>
                    {evs.map(ev => {
                        const isEnded = ev.status === 'ENDED' || new Date(ev.endTime).getTime() < now;
                        const isActive = !isEnded && new Date(ev.startTime).getTime() <= now;

                        return (
                            <div
                                key={ev.id}
                                onClick={() => router.push(`/events/${ev.id}`)}
                                style={{
                                    background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '24px',
                                    overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s',
                                    position: 'relative', display: 'flex', flexDirection: 'column'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'translateY(-6px)';
                                    e.currentTarget.style.boxShadow = '0 12px 30px rgba(0,0,0,0.1)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                <div style={{ height: '180px', background: 'var(--input-bg)', position: 'relative' }}>
                                    {ev.posterURL ? (
                                        <img src={ev.posterURL} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(45deg, var(--card-border), var(--bg))' }}></div>
                                    )}
                                    <div style={{ position: 'absolute', top: '16px', right: '16px', padding: '6px 12px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 'bold', background: isActive ? '#10b981' : isEnded ? '#ef4444' : 'var(--primary)', color: isEnded ? '#000000' : '#ffffff', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                                        {isActive ? 'LIVE NOW' : isEnded ? 'ENDED' : 'UPCOMING'}
                                    </div>
                                </div>
                                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                                    <h3 style={{ fontSize: '1.3rem', fontWeight: 'bold', marginBottom: '12px', color: 'var(--fg)', lineHeight: 1.3 }}>{ev.title}</h3>
                                    
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '500' }}>
                                            <Calendar size={16} /> {new Date(ev.startTime).toDateString()}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: '500' }}>
                                            <Users size={16} /> {ev.attendeeCount || 0} Registered Attendees
                                        </div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: 'auto', borderTop: '1px solid var(--card-border)', paddingTop: '16px' }}>
                                        <Link href={`/events/${ev.id}/submissions/config`} onClick={(e) => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '12px', background: 'var(--input-bg)', borderRadius: '12px', textDecoration: 'none', color: 'var(--fg)', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                            <div style={{ color: '#fb923c' }}><FileText size={20} /></div>
                                            CONFIG
                                        </Link>
                                        <Link href={`/events/${ev.id}/submissions/view`} onClick={(e) => e.stopPropagation()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '12px', background: 'var(--input-bg)', borderRadius: '12px', textDecoration: 'none', color: 'var(--fg)', fontSize: '0.75rem', fontWeight: 'bold' }}>
                                            <div style={{ color: '#ec4899' }}><FolderOpen size={20} /></div>
                                            VIEW WORK
                                        </Link>
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


