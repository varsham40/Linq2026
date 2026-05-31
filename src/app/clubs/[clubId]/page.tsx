'use client';
import { useEffect, useState } from 'react';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { Club, Event, UserProfile } from '@/types';
import { Globe, Instagram, Linkedin, Calendar, Users, MapPin, ChevronRight, Building } from 'lucide-react';

// Extend Club type locally to ensure socialMedia properties are accessible
interface ClubWithDetails extends Club {
    instagram?: string;
    linkedin?: string;
    website?: string;
    adminIds: string[];
}

export default function ClubProfilePage({ params }: { params: Promise<{ clubId: string }> }) {
    const [clubId, setClubId] = useState('');
    const [club, setClub] = useState<ClubWithDetails | null>(null);
    const [events, setEvents] = useState<Event[]>([]);
    const [members, setMembers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        params.then(p => {
            setClubId(p.clubId);
            const fetchData = async () => {
                try {
                    // 1. Fetch Club Details
                    const clubSnap = await getDoc(doc(db, 'clubs', p.clubId));
                    if (clubSnap.exists()) {
                        const clubData = { id: clubSnap.id, ...clubSnap.data() } as ClubWithDetails;
                        setClub(clubData);

                        // 2. Fetch Events
                        const evRef = collection(db, 'events');
                        const evQ = query(evRef, where('clubId', '==', p.clubId));
                        const evSnap = await getDocs(evQ);
                        const evList = evSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Event[];
                        setEvents(evList.sort((a, b) => b.startTime - a.startTime));

                        // 3. Fetch All Members
                        const usersRef = collection(db, 'users');
                        const membersQuery = query(usersRef, where('clubId', '==', p.clubId));
                        const membersSnap = await getDocs(membersQuery);
                        const memberList = membersSnap.docs.map(d => ({ uid: d.id, ...d.data() })) as UserProfile[];

                        let adminList: UserProfile[] = [];
                        if (clubData.adminIds && clubData.adminIds.length > 0) {
                            const adminPromises = clubData.adminIds.map(uid => getDoc(doc(db, 'users', uid)));
                            const adminSnaps = await Promise.all(adminPromises);
                            adminList = adminSnaps
                                .filter(s => s.exists())
                                .map(s => ({ uid: s.id, ...s.data() })) as UserProfile[];
                        }

                        // Merge and Deduplicate
                        const allMembersMap = new Map<string, UserProfile>();

                        // Add admins first
                        adminList.forEach(m => allMembersMap.set(m.uid, m));
                        memberList.forEach(m => {
                            if (!allMembersMap.has(m.uid)) {
                                allMembersMap.set(m.uid, m);
                            }
                        });

                        const finalList = Array.from(allMembersMap.values());

                        // Sort: Admins first, then alphabetical
                        finalList.sort((a, b) => {
                            const aIsAdmin = clubData.adminIds?.includes(a.uid);
                            const bIsAdmin = clubData.adminIds?.includes(b.uid);
                            if (aIsAdmin && !bIsAdmin) return -1;
                            if (!aIsAdmin && bIsAdmin) return 1;
                            return (a.displayName || '').localeCompare(b.displayName || '');
                        });

                        setMembers(finalList);
                    }
                } catch (e) {
                    console.error(e);
                } finally {
                    setLoading(false);
                }
            };
            fetchData();
        });
    }, [params]);

    if (loading) return <div className="min-h-screen grid place-items-center" style={{ color: 'var(--fg)', background: 'var(--bg)' }}>Loading Club Profile...</div>;
    if (!club) return <div className="min-h-screen grid place-items-center" style={{ color: 'var(--fg)', background: 'var(--bg)' }}>Club not found</div>;

    const website = club.socialMedia?.website || club.website;
    const instagram = club.socialMedia?.instagram || club.instagram;
    const linkedin = club.socialMedia?.linkedin || club.linkedin;

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', color: 'var(--fg)', fontFamily: 'var(--font-inter)', transition: 'background-color 0.3s ease, color 0.3s ease' }}>
            <Navbar />
            <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '140px 24px 80px' }}>

                {/* Banner & Header Profile */}
                <div style={{ 
                    position: 'relative', marginBottom: '60px', borderRadius: '24px', overflow: 'hidden',
                    background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.15), rgba(192, 132, 252, 0.05))',
                    border: '1px solid var(--primary)',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.05)',
                    padding: '60px 20px 50px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center'
                }}>
                    {/* Abstract Design Elements */}
                    <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '400px', height: '400px', background: 'rgba(192, 132, 252, 0.08)', borderRadius: '50%', filter: 'blur(50px)', pointerEvents: 'none' }}></div>
                    <div style={{ position: 'absolute', bottom: '-20%', right: '-10%', width: '500px', height: '500px', background: 'rgba(147, 51, 234, 0.08)', borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none' }}></div>
                    <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(var(--card-border) 1px, transparent 1px)', backgroundSize: '30px 30px', opacity: 0.3, pointerEvents: 'none' }}></div>
                    
                    {/* Header Content */}
                    <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        
                        <div style={{
                            width: '140px', height: '140px', margin: '0 auto 24px',
                            borderRadius: '50%', overflow: 'hidden', 
                            border: '4px solid var(--primary)', 
                            boxShadow: '0 8px 32px rgba(192, 132, 252, 0.2)',
                            background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            {club.logoURL ? (
                                <img src={club.logoURL} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <Building size={50} color="var(--primary)" />
                            )}
                        </div>
                        
                        <h1 style={{ fontSize: '3.5rem', fontWeight: '900', marginBottom: '8px', color: 'var(--fg)' }}>{club.name}</h1>
                        
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--text-muted)', marginBottom: '40px', fontSize: '1.1rem', fontWeight: '500' }}>
                            <MapPin size={20} />
                            <span>{club.name} {club.collegeId ? 'Campus' : 'Headquarters'}</span>
                        </div>

                        {/* Social Links */}
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
                            {website && (
                                <a href={website} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 28px', borderRadius: '16px', background: 'var(--bg)', color: 'var(--fg)', textDecoration: 'none', fontWeight: 'bold', border: '1px solid var(--card-border)', transition: 'transform 0.2s, box-shadow 0.2s', fontSize: '1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                                    <Globe size={20} /> Website
                                </a>
                            )}
                            {instagram && (
                                <a href={instagram} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 28px', borderRadius: '16px', background: 'var(--bg)', color: 'var(--fg)', textDecoration: 'none', fontWeight: 'bold', border: '1px solid var(--card-border)', transition: 'transform 0.2s, box-shadow 0.2s', fontSize: '1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                                    <Instagram size={20} color="#e1306c" /> Instagram
                                </a>
                            )}
                            {linkedin && (
                                <a href={linkedin} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 28px', borderRadius: '16px', background: 'var(--bg)', color: 'var(--fg)', textDecoration: 'none', fontWeight: 'bold', border: '1px solid var(--card-border)', transition: 'transform 0.2s, box-shadow 0.2s', fontSize: '1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                                    <Linkedin size={20} color="#0a66c2" /> LinkedIn
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '60px', alignItems: 'start' }}>

                    {/* Events Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--fg)', marginBottom: '8px' }}>
                            <Calendar size={28} /> Recent Events
                        </h2>
                        
                        {events.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No events yet.</p>}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                            {events.map(event => {
                                const isEnded = event.status === 'ENDED' || new Date(event.endTime).getTime() < Date.now();
                                
                                return (
                                    <Link key={event.id} href={`/events/${event.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                                        <div className="hover-card" style={{ background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--card-border)', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%', transition: 'transform 0.2s, box-shadow 0.2s' }}>
                                            
                                            {/* Top Half: Image */}
                                            <div style={{ height: '160px', position: 'relative', overflow: 'hidden' }}>
                                                {event.posterURL ? (
                                                    <img src={event.posterURL} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(45deg, var(--card-border), var(--bg))' }}></div>
                                                )}
                                                
                                                {/* Status Badge */}
                                                <div style={{ 
                                                    position: 'absolute', top: '12px', right: '12px', 
                                                    padding: '6px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '900', letterSpacing: '0.5px',
                                                    background: isEnded ? '#ef4444' : 'var(--primary)',
                                                    color: isEnded ? '#000000' : '#ffffff',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                                                }}>
                                                    {isEnded ? 'ENDED' : 'UPCOMING'}
                                                </div>
                                            </div>
                                            
                                            {/* Bottom Half: Details */}
                                            <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                                <div style={{ fontWeight: 'bold', fontSize: '1.25rem', color: 'var(--fg)', marginBottom: '8px', lineHeight: '1.2' }}>{event.title}</div>
                                                
                                                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
                                                    <Calendar size={14} />
                                                    {new Date(event.startTime).toLocaleDateString()}
                                                </div>
                                                
                                                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
                                                    <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                                                        {isEnded ? 'View Recap →' : 'Register →'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>

                    {/* Team Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <h2 style={{ fontSize: '1.8rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--fg)', marginBottom: '8px' }}>
                            <Users size={28} /> Core Team
                        </h2>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {members.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No team members visible.</p>}
                            {members.slice(0, 5).map(member => (
                                <div key={member.uid} style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--card-bg)', padding: '16px 20px', borderRadius: '16px', border: '1px solid var(--card-border)' }}>
                                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0, fontSize: '1.2rem' }}>
                                        {member.photoURL ? (
                                            <img src={member.photoURL} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                                        ) : (
                                            member.displayName?.charAt(0).toUpperCase() || '?'
                                        )}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 'bold', color: 'var(--fg)', fontSize: '1.1rem' }}>{member.displayName}</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            {club.adminIds.includes(member.uid) && (
                                                <span style={{ color: '#fbbf24' }}>★</span>
                                            )}
                                            <span style={{ color: club.adminIds.includes(member.uid) ? '#fbbf24' : 'var(--text-muted)', fontWeight: club.adminIds.includes(member.uid) ? 'bold' : 'normal' }}>
                                                {club.adminIds.includes(member.uid) ? 'Club Lead' : 'Member'}
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronRight size={20} color="var(--text-muted)" />
                                </div>
                            ))}

                            {members.length > 5 && (
                                <div style={{ padding: '16px', border: '2px dashed var(--card-border)', borderRadius: '16px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px', transition: 'background 0.2s' }}>
                                    + View all {members.length} members
                                </div>
                            )}
                        </div>

                        {/* Impact Card */}
                        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '16px', padding: '32px', marginTop: '16px' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '24px', letterSpacing: '1px' }}>IMPACT</div>
                            <div style={{ display: 'flex', gap: '40px' }}>
                                <div>
                                    <div style={{ fontSize: '3rem', fontWeight: '900', color: 'var(--fg)', lineHeight: 1 }}>{events.length}</div>
                                    <div style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginTop: '8px', fontWeight: '600' }}>Events Hosted</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '3rem', fontWeight: '900', color: 'var(--primary)', lineHeight: 1 }}>{members.length}+</div>
                                    <div style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginTop: '8px', fontWeight: '600' }}>Members</div>
                                </div>
                            </div>
                        </div>

                    </div>

                </div>
            </main>
        </div>
    );
}
