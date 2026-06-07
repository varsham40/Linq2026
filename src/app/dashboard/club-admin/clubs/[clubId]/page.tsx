'use client';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { doc, getDoc, updateDoc, collection, getDocs, query, where, setDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Club, ClubMember, Event, WhitelistedMember } from '@/types';
import Link from 'next/link';
import { Info, Globe, Users, Calendar, Menu, X } from 'lucide-react';

type Tab = 'DETAILS' | 'SOCIALS' | 'MEMBERS' | 'EVENTS';

export default function ManageClubPage() {
    const { user } = useAuth();
    const params = useParams();
    const router = useRouter();
    const clubId = params.clubId as string;

    const [activeTab, setActiveTab] = useState<Tab>('DETAILS');
    const [loading, setLoading] = useState(true);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [club, setClub] = useState<Club | null>(null);

    // Details State
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [logoURL, setLogoURL] = useState('');

    // Socials State
    const [socials, setSocials] = useState<{ instagram?: string; linkedin?: string; twitter?: string; website?: string }>({});

    // Members State
    const [members, setMembers] = useState<WhitelistedMember[]>([]);
    const [newMemberEmail, setNewMemberEmail] = useState('');
    const [newMemberRole, setNewMemberRole] = useState('');
    const [addingMember, setAddingMember] = useState(false);
    const [removingMember, setRemovingMember] = useState<string | null>(null);

    // Events State
    const [events, setEvents] = useState<Event[]>([]);

    useEffect(() => {
        if (!user || !clubId) return;

        const init = async () => {
            try {
                // 1. Fetch Club
                const clubRef = doc(db, 'clubs', clubId);
                const clubSnap = await getDoc(clubRef);

                if (clubSnap.exists()) {
                    const c = { id: clubSnap.id, ...clubSnap.data() } as Club;
                    // Verify Admin Access
                    if (!c.adminIds.includes(user.uid)) {
                        alert("Unauthorized access");
                        router.push('/dashboard');
                        return;
                    }

                    setClub(c);
                    setName(c.name);
                    setDescription(c.description);
                    setLogoURL(c.logoURL || '');
                    setSocials(c.socialMedia || {});

                    // 2. Fetch Members (Whitelisted)
                    try {
                        const membersRef = collection(db, `clubs/${clubId}/whitelisted_emails`);
                        const membersSnap = await getDocs(membersRef);
                        const mList = membersSnap.docs.map(d => d.data() as WhitelistedMember);
                        setMembers(mList);
                    } catch (e) {
                        console.warn("Failed to fetch members", e);
                        setMembers([]);
                    }

                    // 3. Fetch Events
                    const evRef = collection(db, 'events');
                    const evQ = query(evRef, where('clubId', '==', clubId));
                    const evSnap = await getDocs(evQ);
                    const evList = evSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Event[];
                    setEvents(evList);

                } else {
                    alert("Club not found");
                    router.push('/dashboard');
                }

            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        init();
    }, [user, clubId, router]);

    const handleSaveDetails = async () => {
        if (!club) return;
        try {
            await updateDoc(doc(db, 'clubs', clubId), {
                name,
                description,
                logoURL
            });
            alert("Details updated!");
        } catch (e) {
            console.error(e);
            alert("Failed to update");
        }
    };

    const handleSaveSocials = async () => {
        if (!club) return;
        try {
            await updateDoc(doc(db, 'clubs', clubId), {
                socialMedia: socials
            });
            alert("Social links updated!");
        } catch (e) {
            console.error(e);
            alert("Failed to update");
        }
    };

    const handleAddMember = async () => {
        if (!newMemberEmail || !newMemberRole) {
            alert("Please enter both email and role.");
            return;
        }
        setAddingMember(true);
        try {
            // Check if email already whitelisted
            if (members.find(m => m.email === newMemberEmail)) {
                alert("Member already added.");
                setAddingMember(false);
                return;
            }

            // Create Whitelist Entry
            // Use email as doc ID for uniqueness in this subcollection
            // We need to sanitize email to be a valid doc ID if strictly necessary, but emails are usually fine.
            // Let's stick to using the email string directly as we did in the rule match.

            const newMember: WhitelistedMember = {
                id: newMemberEmail,
                email: newMemberEmail,
                role: newMemberRole,
                clubId: clubId,
                addedAt: Date.now(),
                addedBy: user?.uid || 'unknown'
            };

            await setDoc(doc(db, `clubs/${clubId}/whitelisted_emails`, newMemberEmail), newMember);

            setMembers([...members, newMember]);
            setNewMemberEmail('');
            setNewMemberRole('');
            alert("Member added to whitelist! Give them your Club Name and Email to sign up.");

        } catch (e) {
            console.error(e);
            alert("Failed to add member");
        } finally {
            setAddingMember(false);
        }
    };

    const handleRemoveMember = async (email: string) => {
        if (!confirm("NUCLEAR OPTION: Removing this member will PERMANENTLY DELETE their account from the platform. Are you sure?")) return;
        setRemovingMember(email);

        try {
            // 1. Remove from Whitelist
            await deleteDoc(doc(db, `clubs/${clubId}/whitelisted_emails`, email));

            // 2. Find UID to delete account (if they have registered)
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('email', '==', email));
            const querySnap = await getDocs(q);

            if (!querySnap.empty) {
                const uid = querySnap.docs[0].id;

                // Call Admin API to delete user
                const response = await fetch('/api/admin/remove-user', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${await user?.getIdToken()}`
                    },
                    body: JSON.stringify({ uid, clubId })
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || 'Failed to delete user account');
                }
            }

            setMembers(members.filter(m => m.email !== email));
            alert("Member removed and account data wiped.");

        } catch (e) {
            console.error(e);
            alert(`Failed to remove member: ${(e as Error).message}`);
        } finally {
            setRemovingMember(null);
        }
    };

    const handleDeleteEvent = async (eventId: string) => {
        if (!confirm("Are you sure you want to delete this event? This cannot be undone.")) return;
        try {
            await deleteDoc(doc(db, 'events', eventId));
            setEvents(events.filter(e => e.id !== eventId));
        } catch (e) {
            console.error(e);
            alert("Failed to delete event");
        }
    };

    if (loading) return <div className="min-h-screen grid place-items-center text-white">Loading...</div>;

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', color: 'var(--fg)', fontFamily: 'var(--font-inter)' }}>
            <Navbar />
            <main className="dashboard-layout" style={{ maxWidth: '1400px', margin: '0 auto', padding: '100px 24px 80px' }}>

                {isMobileSidebarOpen && (
                    <div className="sidebar-overlay" onClick={() => setIsMobileSidebarOpen(false)}></div>
                )}

                <div className={`dashboard-sidebar ${isMobileSidebarOpen ? 'open' : ''}`}>
                    
                    <div className="mobile-only" style={{ alignSelf: 'flex-end', marginBottom: '20px', cursor: 'pointer', padding: '8px' }} onClick={() => setIsMobileSidebarOpen(false)}>
                        <X size={24} />
                    </div>

                    {([
                            { id: 'DETAILS', label: 'Details', icon: <Info size={24} /> },
                            { id: 'SOCIALS', label: 'Socials', icon: <Globe size={24} /> },
                            { id: 'MEMBERS', label: 'Members', icon: <Users size={24} /> },
                            { id: 'EVENTS', label: 'Events', icon: <Calendar size={24} /> }
                        ]).map(tab => (
                            <button
                                key={tab.id}
                                title={tab.label}
                                className={activeTab === tab.id ? 'active' : ''}
                                onClick={() => { setActiveTab(tab.id as Tab); setIsMobileSidebarOpen(false); }}
                            >
                                {tab.icon}
                                <span className="mobile-only">{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Content Area */}
                <div className="dashboard-content" style={{ flex: 1 }}>

                    <button className="mobile-sidebar-hamburger" onClick={() => setIsMobileSidebarOpen(true)}>
                        <Menu size={20} /> <span>Menu</span>
                    </button>

                    {/* Header with Back Button (Moved inside content) */}
                    <div style={{ marginBottom: '40px' }}>
                        <Link href="/dashboard/club-admin" style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px', marginBottom: '10px' }}>
                            ← Back to Dashboard
                        </Link>
                        <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', fontFamily: 'var(--font-outfit)' }}>Manage <span style={{ color: '#3b82f6' }}>{club?.name}</span></h1>
                    </div>

                    <div style={{ background: 'var(--card-bg)', padding: '30px', borderRadius: '20px', border: '1px solid var(--card-border)' }}>

                    {/* DETAILS TAB */}
                    {activeTab === 'DETAILS' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Club Name</label>
                                <input
                                    value={name} onChange={e => setName(e.target.value)}
                                    className="input-fld"
                                    style={{ width: '100%', padding: '12px', background: 'var(--input-bg)', border: '1px solid var(--card-border)', color: 'var(--fg)', borderRadius: '8px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Logo URL</label>
                                <input
                                    value={logoURL} onChange={e => setLogoURL(e.target.value)}
                                    placeholder="https://..."
                                    className="input-fld"
                                    style={{ width: '100%', padding: '12px', background: 'var(--input-bg)', border: '1px solid var(--card-border)', color: 'var(--fg)', borderRadius: '8px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Description (Full)</label>
                                <textarea
                                    value={description} onChange={e => setDescription(e.target.value)}
                                    className="input-fld"
                                    style={{ width: '100%', minHeight: '200px', padding: '12px', background: 'var(--input-bg)', border: '1px solid var(--card-border)', color: 'var(--fg)', borderRadius: '8px', lineHeight: '1.6' }}
                                />
                            </div>
                            <button onClick={handleSaveDetails} className="btn-primary" style={{ alignSelf: 'flex-start', padding: '12px 30px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                                Save Changes
                            </button>
                        </div>
                    )}

                    {/* SOCIALS TAB */}
                    {activeTab === 'SOCIALS' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <p style={{ opacity: 0.6, marginBottom: '10px' }}>Links will be displayed on the club's public profile.</p>
                            {['instagram', 'linkedin', 'twitter', 'website'].map((platform) => (
                                <div key={platform}>
                                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', textTransform: 'capitalize' }}>{platform}</label>
                                    <input
                                        value={(socials as any)[platform] || ''}
                                        onChange={e => setSocials({ ...socials, [platform]: e.target.value })}
                                        placeholder={`https://${platform}.com/...`}
                                        className="input-fld"
                                        style={{ width: '100%', padding: '12px', background: 'var(--input-bg)', border: '1px solid var(--card-border)', color: 'var(--fg)', borderRadius: '8px' }}
                                    />
                                </div>
                            ))}
                            <button onClick={handleSaveSocials} className="btn-primary" style={{ alignSelf: 'flex-start', padding: '12px 30px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                                Update Links
                            </button>
                        </div>
                    )}

                    {/* MEMBERS TAB */}
                    {activeTab === 'MEMBERS' && (
                        <div>
                            <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '20px', borderRadius: '12px', marginBottom: '30px' }}>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '16px', color: '#60a5fa' }}>Add New Member</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px' }}>
                                    <input
                                        value={newMemberEmail} onChange={e => setNewMemberEmail(e.target.value)}
                                        placeholder="Member Email"
                                        className="input-fld"
                                        style={{ padding: '12px', background: 'var(--input-bg)', border: '1px solid var(--card-border)', color: 'var(--fg)', borderRadius: '8px' }}
                                    />
                                    <input
                                        value={newMemberRole} onChange={e => setNewMemberRole(e.target.value)}
                                        placeholder="Role Title (e.g. Event Lead)"
                                        className="input-fld"
                                        style={{ padding: '12px', background: 'var(--input-bg)', border: '1px solid var(--card-border)', color: 'var(--fg)', borderRadius: '8px' }}
                                    />
                                    <button onClick={handleAddMember} disabled={addingMember} className="btn-primary" style={{ padding: '0 24px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: addingMember ? 'wait' : 'pointer', fontWeight: 'bold' }}>
                                        {addingMember ? 'Adding...' : '+ Add'}
                                    </button>
                                </div>
                                <p style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '10px' }}>
                                    * Adding a member simply allows them to sign up. They must register as "Club Member" using your <b>Club Name</b> and <b>Email</b>.
                                </p>
                            </div>

                            <div style={{ display: 'grid', gap: '12px' }}>
                                {members.length === 0 ? <p style={{ opacity: 0.5 }}>No members whitelist entries found.</p> : members.map(m => (
                                    <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--hover-bg)', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                                        <div>
                                            <div style={{ fontWeight: 'bold' }}>{m.email}</div>
                                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '4px' }}>
                                                <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '4px' }}>{m.role}</span>
                                                <span style={{ fontSize: '0.8rem', opacity: 0.5 }}>Added: {new Date(m.addedAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveMember(m.email)}
                                            disabled={removingMember === m.email}
                                            style={{ color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.2)', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.85rem' }}
                                        >
                                            {removingMember === m.email ? 'Wiping...' : 'Remove & Wipe'}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* EVENTS TAB */}
                    {activeTab === 'EVENTS' && (
                        <div>
                            {events.length === 0 ? <p style={{ opacity: 0.5 }}>No events found.</p> : (
                                <div style={{ display: 'grid', gap: '16px' }}>
                                    {events.map(ev => (
                                        <div key={ev.id} style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--hover-bg)', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '1 1 min-content' }}>
                                                {ev.posterURL && <img src={ev.posterURL} style={{ width: '60px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />}
                                                <div>
                                                    <div style={{ fontWeight: 'bold' }}>{ev.title}</div>
                                                    <div style={{ fontSize: '0.85rem', opacity: 0.6 }}>{new Date(ev.startTime).toLocaleDateString()} • {ev.attendeeCount || 0} attendees</div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '10px' }}>
                                                <Link href={`/events/${ev.id}`} style={{ padding: '6px 12px', borderRadius: '6px', background: 'var(--primary)', fontSize: '0.85rem', textDecoration: 'none', color: '#fff', fontWeight: 'bold' }}>
                                                    View
                                                </Link>
                                                <button onClick={() => handleDeleteEvent(ev.id)} style={{ padding: '6px 12px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                </div>
                </div>
            </main>
        </div>
    );
}
