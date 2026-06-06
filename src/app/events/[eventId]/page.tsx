'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { doc, getDoc, setDoc, collection, getDocs, query, orderBy, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Event, Registration, Club } from '@/types';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import TicketModal from '@/components/TicketModal';
import Toast from '@/components/Toast';
import ConfirmModal from '@/components/ConfirmModal';
import TeamManagement from '@/components/TeamManagement';
import SoloSubmission from '@/components/SoloSubmission';
import { Users, BarChart2, MessageSquare, ScanLine, Award, Calendar, Clock, MapPin, StopCircle, User, X, Sparkles, Heart, Quote, Trophy } from 'lucide-react';

type ViewMode = 'details' | 'announcements';

interface Announcement {
    id: string;
    message: string;
    authorId: string;
    authorName: string;
    createdAt: number;
}

export default function EventDetailPage({ params }: { params: Promise<{ eventId: string }> }) {
    const { user, profile } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [eventId, setEventId] = useState<string>('');

    const [event, setEvent] = useState<Event | null>(null);
    const [club, setClub] = useState<Club | null>(null);
    const [registration, setRegistration] = useState<Registration | null>(null);
    // const [qrCode, setQrCode] = useState<string>(''); // Removed
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isClubMember, setIsClubMember] = useState(false);

    // Ticket Modal State
    const [showTicket, setShowTicket] = useState(false);
    
    // Toast State
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    // Announcements
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [newAnnouncement, setNewAnnouncement] = useState('');
    const [postingAnnouncement, setPostingAnnouncement] = useState(false);

    // Edit State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editMessage, setEditMessage] = useState('');

    // Modal State
    const [confirmAction, setConfirmAction] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void, isDestructive?: boolean, confirmText?: string} | null>(null);

    const handleUpdateAnnouncement = async (id: string) => {
        if (!editMessage.trim()) return;
        try {
            await updateDoc(doc(db, `events/${event!.id}/announcements`, id), {
                message: editMessage,
                updatedAt: Date.now()
            });
            setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, message: editMessage } : a));
            setEditingId(null);
            setEditMessage('');
            setToast({ message: 'Announcement updated!', type: 'success' });
        } catch (e) {
            console.error(e);
            setToast({ message: 'Failed to update announcement', type: 'error' });
        }
    };

    const viewParam = searchParams?.get('view');
    const [isAnnouncementsOpen, setIsAnnouncementsOpen] = useState<boolean>(false);

    useEffect(() => {
        if (viewParam === 'announcements') {
            setIsAnnouncementsOpen(true);
        }
    }, [viewParam]);

    useEffect(() => {
        params.then(p => {
            setEventId(p.eventId);
        });
    }, [params]);

    useEffect(() => {
        if (!eventId || !user) return;

        const fetchData = async () => {
            try {
                // 1. Fetch Event
                const eventSnap = await getDoc(doc(db, 'events', eventId));
                if (!eventSnap.exists()) {
                    setLoading(false);
                    return;
                }
                const eventData = { id: eventSnap.id, ...eventSnap.data() } as Event;
                setEvent(eventData);

                // 2. Fetch Club
                if (eventData.clubId) {
                    const clubSnap = await getDoc(doc(db, 'clubs', eventData.clubId));
                    if (clubSnap.exists()) {
                        setClub({ id: clubSnap.id, ...clubSnap.data() } as Club);

                        // Check if user is admin
                        const clubData = clubSnap.data() as Club;
                        if (clubData.adminIds?.includes(user.uid)) {
                            setIsAdmin(true);
                        }
                    }
                }

                // 3. Check if user is club member
                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    if (userData.role === 'club_member' && userData.clubId === eventData.clubId) {
                        setIsClubMember(true);
                    }
                }

                // 4. Fetch My Registration
                const regSnap = await getDoc(doc(db, `events/${eventId}/registrations`, user.uid));
                if (regSnap.exists()) {
                    setRegistration({ id: regSnap.id, ...regSnap.data() } as Registration);
                    // QR Code generated in Modal now
                }

                // 5. Fetch Announcements
                const announcementsRef = collection(db, `events/${eventId}/announcements`);
                const q = query(announcementsRef, orderBy('createdAt', 'desc'));
                const announcementsSnap = await getDocs(q);
                const announcementsList = announcementsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Announcement[];
                setAnnouncements(announcementsList);

            } catch (e) {
                console.error('Error fetching event:', e);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [eventId, user]);

    const handleRegister = async () => {
        if (!user || !event || !profile) return;

        // Security Check: Registration Deadline
        const regDeadline = event.registrationDeadline || event.startTime;
        if (Date.now() > regDeadline) {
            setToast({ message: 'Registrations are closed for this event.', type: 'error' });
            return;
        }

        // Security Check: College Only
        if (event.scope === 'COLLEGE' && event.collegeId !== profile.homeCollegeId) {
            setToast({ message: `Registration is restricted to students of "${event.collegeId}".`, type: 'error' });
            return;
        }

        try {
            const regData: Omit<Registration, 'id'> = {
                eventId: event.id,
                userId: user.uid,
                userName: user.displayName || 'Unknown',
                userEmail: user.email || '',
                registeredAt: Date.now(),
                attended: false,
                status: 'REGISTERED',
                userCollegeId: profile.homeCollegeId || 'Unknown',
                userBranch: profile.branch || 'Unknown'
            };

            await setDoc(doc(db, `events/${event.id}/registrations`, user.uid), regData);

            // Update event attendee count
            await updateDoc(doc(db, 'events', event.id), {
                attendeeCount: (event.attendeeCount || 0) + 1
            });

            setRegistration({ id: user.uid, ...regData });
            setToast({ message: 'Successfully registered!', type: 'success' });
        } catch (e) {
            console.error(e);
            setToast({ message: 'Failed to register', type: 'error' });
        }
    };

    const handlePostAnnouncement = async () => {
        if (!newAnnouncement.trim() || !user || !event) return;

        setPostingAnnouncement(true);
        try {
            const announcementData = {
                message: newAnnouncement,
                authorId: user.uid,
                authorName: user.displayName || 'Unknown',
                createdAt: Date.now()
            };

            const docRef = await addDoc(collection(db, `events/${event.id}/announcements`), announcementData);
            setAnnouncements([{ id: docRef.id, ...announcementData }, ...announcements]);
            setNewAnnouncement('');
            setToast({ message: 'Announcement posted!', type: 'success' });
        } catch (e) {
            console.error(e);
            setToast({ message: 'Failed to post announcement', type: 'error' });
        } finally {
            setPostingAnnouncement(false);
        }
    };

    const handleDeleteAnnouncement = (announcementId: string) => {
        setConfirmAction({
            isOpen: true,
            title: 'Delete Announcement',
            message: 'Are you sure you want to delete this announcement? This action cannot be undone.',
            isDestructive: true,
            confirmText: 'Delete',
            onConfirm: async () => {
                try {
                    await deleteDoc(doc(db, `events/${event!.id}/announcements`, announcementId));
                    setAnnouncements(announcements.filter(a => a.id !== announcementId));
                    setToast({ message: 'Announcement deleted!', type: 'success' });
                } catch (e) {
                    console.error(e);
                    setToast({ message: 'Failed to delete announcement', type: 'error' });
                }
            }
        });
    };

    if (loading) return <div className="min-h-screen grid place-items-center text-white">Loading...</div>;
    if (!event) return <div className="min-h-screen grid place-items-center text-white">Event not found</div>;

    const isEventEnded = event.status === 'ENDED' || new Date(event.endTime) < new Date();
    const canManage = isAdmin || isClubMember;
    const registrationDeadline = event.registrationDeadline || event.startTime;
    const isRegistrationClosed = Date.now() > registrationDeadline;

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', color: 'var(--fg)', fontFamily: 'var(--font-inter)', transition: 'background-color 0.3s ease, color 0.3s ease' }}>
            <Navbar />
            
            <style dangerouslySetInnerHTML={{__html: `
                @media (max-width: 900px) {
                    .event-grid { grid-template-columns: 1fr !important; }
                    .info-row { grid-template-columns: 1fr !important; }
                    .panel-grid { grid-template-columns: repeat(2, 1fr) !important; }
                    .hero-container { height: 300px !important; }
                    .hero-overlay { max-width: 100% !important; padding: 20px !important; bottom: 12px !important; left: 12px !important; width: calc(100% - 24px) !important; box-sizing: border-box !important; }
                    .hero-title { font-size: 1.8rem !important; }
                }
                .announcements-overlay {
                    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                    background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
                    z-index: 1000;
                    opacity: 0; pointer-events: none; transition: opacity 0.3s ease;
                }
                .announcements-overlay.open { opacity: 1; pointer-events: auto; }
                
                .announcements-drawer {
                    position: fixed; top: 0; right: 0; bottom: 0;
                    width: 450px; max-width: 100%;
                    background: var(--bg);
                    border-left: 1px solid var(--card-border);
                    z-index: 1001;
                    transform: translateX(100%); transition: transform 0.3s ease-in-out;
                    display: flex; flex-direction: column;
                    box-shadow: -10px 0 30px rgba(0,0,0,0.2);
                }
                .announcements-drawer.open { transform: translateX(0); }
                
                .chat-bubble {
                    background: rgba(129, 140, 248, 0.1);
                    border: 2px solid rgba(129, 140, 248, 0.6);
                    border-radius: 16px; border-bottom-left-radius: 4px;
                    padding: 16px; margin-bottom: 16px;
                }
                .chat-bubble.mine {
                    background: rgba(192, 132, 252, 0.15);
                    border: 2px solid rgba(192, 132, 252, 0.6);
                    border-bottom-left-radius: 16px; border-bottom-right-radius: 4px;
                }
                
                .edit-modal-overlay {
                    position: fixed; inset: 0;
                    background: rgba(0,0,0,0.6); backdrop-filter: blur(8px);
                    z-index: 2000;
                    display: flex; align-items: center; justify-content: center;
                    padding: 24px;
                }
                .edit-modal {
                    background: var(--card-bg);
                    border: 1px solid var(--card-border);
                    border-radius: 16px;
                    width: 100%; max-width: 600px;
                    padding: 32px;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.4);
                }
            `}} />

            <main className="mobile-px-4 mobile-py-8" style={{ maxWidth: '1600px', margin: '0 auto', padding: '100px 24px 80px' }}>

                {/* Hero Section */}
                <div className="hero-container" style={{ position: 'relative', width: '100%', height: '350px', borderRadius: '24px', overflow: 'hidden', marginBottom: '24px', background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}>
                    {event.posterURL ? (
                        <img src={event.posterURL} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, var(--primary), var(--accent))' }}></div>
                    )}
                    
                    {/* Glassmorphic Overlay */}
                    <div className="hero-overlay" style={{ position: 'absolute', bottom: '24px', left: '24px', padding: '32px', background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', borderRadius: '20px', border: '1px solid var(--glass-border)', maxWidth: '80%' }}>
                        <div style={{ fontSize: '0.9rem', color: 'var(--primary)', fontWeight: 'bold', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            {club?.name || 'Unknown Club'}
                        </div>
                        <h1 className="hero-title" style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '16px', color: 'var(--fg)', fontFamily: 'var(--font-outfit)', lineHeight: 1.1 }}>
                            {event.title}
                        </h1>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                            {isEventEnded && (
                                <div style={{ padding: '6px 14px', borderRadius: '20px', background: 'rgba(239, 68, 68, 0.9)', color: '#fff', fontSize: '0.85rem', fontWeight: 'bold' }}>
                                    Event Ended
                                </div>
                            )}
                            {!registration && !isEventEnded && isRegistrationClosed && (
                                <div style={{ padding: '6px 14px', borderRadius: '20px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', fontSize: '0.85rem', fontWeight: 'bold' }}>
                                    Registration Closed
                                </div>
                            )}
                            {!registration && !isEventEnded && !isRegistrationClosed && (
                                (event.scope !== 'COLLEGE' || event.collegeId === profile?.homeCollegeId) ? (
                                    <button onClick={handleRegister} style={{ padding: '8px 20px', borderRadius: '20px', background: 'var(--primary)', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(192, 132, 252, 0.3)' }}>
                                        Register Now
                                    </button>
                                ) : (
                                    <div style={{ padding: '6px 14px', borderRadius: '20px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', fontSize: '0.85rem', fontWeight: 'bold' }}>
                                        Restricted to {event.collegeId}
                                    </div>
                                )
                            )}
                            {registration && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <div style={{ padding: '6px 14px', borderRadius: '20px', background: registration.attended ? 'rgba(139, 92, 246, 0.1)' : 'rgba(34, 197, 94, 0.1)', border: registration.attended ? '1px solid #8b5cf6' : '1px solid #22c55e', color: registration.attended ? '#8b5cf6' : '#22c55e', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                                        {registration.attended ? '✓ Attended' : '✓ Registered'}
                                    </div>
                                    <button onClick={() => setShowTicket(true)} style={{ padding: '6px 14px', borderRadius: '20px', background: 'var(--fg)', color: 'var(--bg)', border: 'none', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                        View Ticket
                                    </button>
                                    {isEventEnded && registration.attended && (
                                        <Link href={`/events/${eventId}/feedback`} style={{ padding: '6px 14px', borderRadius: '20px', background: 'var(--primary)', color: '#fff', border: 'none', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                                            Give Feedback
                                        </Link>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Info Row */}
                <div className="info-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '40px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', padding: '20px', borderRadius: '16px' }}>
                        <div style={{ padding: '12px', background: 'var(--hover-bg)', borderRadius: '12px', color: 'var(--primary)' }}><Calendar size={24} /></div>
                        <div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '2px' }}>Date</div>
                            <div style={{ fontSize: '1.05rem', color: 'var(--fg)', fontWeight: 'bold' }}>{new Date(event.startTime).toLocaleDateString()}</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', padding: '20px', borderRadius: '16px' }}>
                        <div style={{ padding: '12px', background: 'var(--hover-bg)', borderRadius: '12px', color: 'var(--primary)' }}><Clock size={24} /></div>
                        <div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '2px' }}>Time</div>
                            <div style={{ fontSize: '1.05rem', color: 'var(--fg)', fontWeight: 'bold' }}>{new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', padding: '20px', borderRadius: '16px' }}>
                        <div style={{ padding: '12px', background: 'var(--hover-bg)', borderRadius: '12px', color: 'var(--primary)' }}><MapPin size={24} /></div>
                        <div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '2px' }}>Location</div>
                            <div style={{ fontSize: '1.05rem', color: 'var(--fg)', fontWeight: 'bold' }}>{event.venue}</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', padding: '20px', borderRadius: '16px' }}>
                        <div style={{ padding: '12px', background: 'var(--hover-bg)', borderRadius: '12px', color: 'var(--primary)' }}><Users size={24} /></div>
                        <div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: '500', marginBottom: '2px' }}>Reg Deadline</div>
                            <div style={{ fontSize: '0.95rem', color: 'var(--fg)', fontWeight: 'bold' }}>{new Date(event.registrationDeadline || event.startTime).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                    </div>
                </div>

                {/* Main 2-Column Grid */}
                <div className="event-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', alignItems: 'start' }}>
                    
                    {/* Left Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        
                        {/* Event Panel */}
                        {canManage && (
                            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '16px', padding: '32px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ padding: '8px', background: 'var(--hover-bg)', borderRadius: '8px', color: 'var(--text-muted)' }}>
                                            <Award size={20} />
                                        </div>
                                        <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--fg)' }}>Event Panel</h2>
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 'bold', padding: '6px 12px', background: 'rgba(192, 132, 252, 0.1)', borderRadius: '12px' }}>
                                        {event.attendeeCount || 0} Registered
                                    </div>
                                </div>

                                <div className="panel-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
                                    <Link href={`/events/${eventId}/attendees`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'var(--hover-bg)', borderRadius: '12px', color: 'var(--fg)', textDecoration: 'none', gap: '12px', transition: 'background 0.2s' }}>
                                        <Users size={24} />
                                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Attendees</span>
                                    </Link>
                                    <Link href={`/events/${eventId}/analytics`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'var(--hover-bg)', borderRadius: '12px', color: 'var(--fg)', textDecoration: 'none', gap: '12px', transition: 'background 0.2s' }}>
                                        <BarChart2 size={24} />
                                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Analytics</span>
                                    </Link>
                                    <Link href={`/events/${eventId}/feedback`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'var(--hover-bg)', borderRadius: '12px', color: 'var(--fg)', textDecoration: 'none', gap: '12px', transition: 'background 0.2s' }}>
                                        <MessageSquare size={24} />
                                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Feedback</span>
                                    </Link>
                                    <Link href={`/events/${eventId}/scan`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'var(--hover-bg)', borderRadius: '12px', color: 'var(--fg)', textDecoration: 'none', gap: '12px', transition: 'background 0.2s' }}>
                                        <ScanLine size={24} />
                                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Scan</span>
                                    </Link>

                                    {/* Action Button: End or Generate */}
                                    {!isEventEnded ? (
                                        isAdmin && (
                                            <button
                                                onClick={() => {
                                                    setConfirmAction({
                                                        isOpen: true,
                                                        title: 'End Event',
                                                        message: 'Are you sure you want to end this event? This will stop further registrations and unlock feedback.',
                                                        isDestructive: true,
                                                        confirmText: 'End Event',
                                                        onConfirm: async () => {
                                                            try {
                                                                const { endEvent } = await import('@/lib/club-utils');
                                                                await endEvent(event.id);
                                                                setEvent(prev => prev ? { ...prev, status: 'ENDED' } : null);
                                                                setToast({ message: "Event ended successfully.", type: 'success' });
                                                            } catch (e) {
                                                                console.error(e);
                                                                setToast({ message: "Failed to end event.", type: 'error' });
                                                            }
                                                        }
                                                    });
                                                }}
                                                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', color: '#ef4444', cursor: 'pointer', gap: '12px', transition: 'background 0.2s' }}
                                            >
                                                <StopCircle size={24} />
                                                <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>End Event</span>
                                            </button>
                                        )
                                    ) : (
                                        <button
                                            onClick={() => {
                                                setConfirmAction({
                                                    isOpen: true,
                                                    title: 'Generate Certificates',
                                                    message: 'Are you sure you want to generate certificates for all attendees who checked in?',
                                                    confirmText: 'Generate',
                                                    onConfirm: async () => {
                                                        try {
                                                            const { generateCertificates } = await import('@/lib/club-utils');
                                                            const count = await generateCertificates(event);
                                                            setToast({ message: `Success! Generated ${count} certificates.`, type: 'success' });
                                                        } catch (err) {
                                                            console.error(err);
                                                            setToast({ message: "Failed to generate certificates.", type: 'error' });
                                                        }
                                                    }
                                                });
                                            }}
                                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'var(--primary)', border: 'none', borderRadius: '12px', color: '#fff', cursor: 'pointer', gap: '12px', transition: 'background 0.2s' }}
                                        >
                                            <Award size={24} />
                                            <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Generate Certs</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Tabs */}
                        <div style={{ display: 'flex', gap: '24px', borderBottom: '1px solid var(--card-border)', marginBottom: '8px' }}>
                            <button style={{ padding: '12px 4px', background: 'transparent', color: 'var(--primary)', border: 'none', borderBottom: '2px solid var(--primary)', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.95rem' }}>
                                Details
                            </button>
                            <button onClick={() => setIsAnnouncementsOpen(true)} style={{ padding: '12px 4px', background: 'transparent', color: 'var(--text-muted)', border: 'none', borderBottom: '2px solid transparent', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.95rem' }}>
                                Announcements
                            </button>
                        </div>

                        {/* Details View */}
                        <div style={{ background: 'var(--card-bg)', padding: '32px', borderRadius: '16px', border: '1px solid var(--card-border)' }}>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '16px', color: 'var(--fg)' }}>About This Event</h2>
                            <p style={{ lineHeight: '1.8', color: 'var(--text-muted)', whiteSpace: 'pre-line', fontSize: '0.95rem' }}>{event.description}</p>
                        </div>
                    </div>

                    {/* Right Column Stats */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div style={{ background: 'var(--card-bg)', padding: '24px', borderRadius: '16px', border: '1px solid var(--card-border)' }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '12px' }}>Total Registrations</div>
                            <div style={{ fontSize: '3rem', fontWeight: '800', color: 'var(--primary)', lineHeight: 1 }}>{event.attendeeCount || 0}</div>
                        </div>
                        <div style={{ background: 'var(--card-bg)', padding: '24px', borderRadius: '16px', border: '1px solid var(--card-border)' }}>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '12px' }}>Event Type</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--fg)' }}>{event.scope || 'COLLEGE'}</div>
                        </div>
                    </div>

                </div>

                {/* Solo Submission Section */}
                {!event.isTeamEvent && registration && user && (
                    <SoloSubmission event={event} user={{ uid: user.uid, displayName: user.displayName || 'Student' }} registration={registration} />
                )}

                {/* Team Management Section */}
                {event.isTeamEvent && registration && user && (
                    <div style={{ marginTop: '40px' }}>
                        <TeamManagement event={event} user={{ uid: user.uid, displayName: user.displayName || 'Student', email: user.email || '' }} registration={registration} />
                    </div>
                )}

                {/* Wall of Love Link Banner */}
                {(event as any).recapData?.published && (
                    <Link href={`/events/${event.id}/wall-of-love`} style={{ textDecoration: 'none', display: 'block', marginTop: '40px', marginBottom: '40px' }}>
                        <div style={{ background: 'linear-gradient(135deg, #1e1b4b, #312e81)', border: '1px solid #6366f1', borderRadius: '24px', padding: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 8px 32px rgba(99, 102, 241, 0.2)', transition: 'transform 0.2s', cursor: 'pointer' }}
                            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '16px', background: 'linear-gradient(135deg, #8b5cf6, #ec4899)', color: '#fff', boxShadow: '0 4px 16px rgba(236, 72, 153, 0.4)' }}>
                                    <Heart size={32} fill="currentColor" />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '1.8rem', fontWeight: '900', fontFamily: 'var(--font-outfit)', color: '#fff', margin: 0 }}>Wall of Love ✨</h2>
                                    <p style={{ color: 'rgba(255, 255, 255, 0.7)', margin: '4px 0 0 0', fontSize: '1rem' }}>See memories, hall of fame, and love notes from this event!</p>
                                </div>
                            </div>
                            <div style={{ padding: '12px 24px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', color: '#fff', fontWeight: 'bold' }}>
                                Enter Experience →
                            </div>
                        </div>
                    </Link>
                )}

                {/* Announcements Drawer */}
                <div className={`announcements-overlay ${isAnnouncementsOpen ? 'open' : ''}`} onClick={() => setIsAnnouncementsOpen(false)}></div>
                <div className={`announcements-drawer ${isAnnouncementsOpen ? 'open' : ''}`}>
                    {/* Drawer Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', background: 'var(--card-bg)', borderBottom: '1px solid var(--card-border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ padding: '8px', background: 'rgba(192, 132, 252, 0.1)', borderRadius: '8px', color: 'var(--primary)' }}>
                                <MessageSquare size={20} />
                            </div>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--fg)', fontFamily: 'var(--font-outfit)' }}>Announcements</h2>
                        </div>
                        <button onClick={() => setIsAnnouncementsOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                            <X size={24} />
                        </button>
                    </div>

                    {/* Drawer Content */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {canManage && (
                            <div style={{ background: 'var(--card-bg)', padding: '20px', borderRadius: '16px', border: '1px solid var(--card-border)' }}>
                                <textarea
                                    value={newAnnouncement}
                                    onChange={(e) => setNewAnnouncement(e.target.value)}
                                    placeholder="Share updates with attendees..."
                                    style={{ width: '100%', minHeight: '80px', padding: '12px', background: 'var(--input-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', color: 'var(--fg)', fontSize: '0.95rem', marginBottom: '12px', resize: 'vertical', outline: 'none' }}
                                />
                                <button onClick={handlePostAnnouncement} disabled={postingAnnouncement} style={{ width: '100%', padding: '10px 24px', borderRadius: '10px', background: 'var(--primary)', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer', transition: 'background 0.2s' }}>
                                    {postingAnnouncement ? 'Posting...' : 'Post Announcement'}
                                </button>
                            </div>
                        )}

                        <div style={{ flex: 1 }}>
                            {announcements.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)', border: '2px dashed var(--card-border)', borderRadius: '16px' }}>
                                    No announcements yet
                                </div>
                            ) : (
                                announcements.map(announcement => {
                                    const isMine = announcement.authorId === user?.uid;
                                    return (
                                        <div key={announcement.id} className={`chat-bubble ${isMine ? 'mine' : ''}`}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                                                <div>
                                                    <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: isMine ? 'var(--primary)' : 'var(--fg)' }}>{announcement.authorName}</div>
                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{new Date(announcement.createdAt).toLocaleString()}</div>
                                                </div>
                                                {(isAdmin || isMine) && (
                                                    <div style={{ display: 'flex', gap: '6px' }}>
                                                        <button
                                                            onClick={() => {
                                                                setEditingId(announcement.id);
                                                                setEditMessage(announcement.message);
                                                            }}
                                                            style={{ padding: '4px 8px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border: 'none', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold' }}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button onClick={() => handleDeleteAnnouncement(announcement.id)} style={{ padding: '4px 8px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 'bold' }}>
                                                            Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <p style={{ lineHeight: '1.5', color: 'var(--fg)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'break-word', fontSize: '0.95rem', marginTop: '8px' }}>{announcement.message}</p>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* Ticket Modal */}
                {showTicket && event && registration && (
                    <TicketModal
                        event={event}
                        reg={registration}
                        onClose={() => setShowTicket(false)}
                        userDisplayName={user?.displayName || 'Student'}
                    />
                )}

                {/* Edit Announcement Modal */}
                {editingId && (
                    <div className="edit-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setEditingId(null); }}>
                        <div className="edit-modal">
                            <h3 style={{ fontSize: '1.3rem', fontWeight: 'bold', marginBottom: '20px', color: 'var(--fg)' }}>Edit Announcement</h3>
                            <textarea
                                value={editMessage}
                                onChange={e => setEditMessage(e.target.value)}
                                style={{ width: '100%', minHeight: '200px', padding: '16px', background: 'var(--input-bg)', color: 'var(--fg)', border: '1px solid var(--card-border)', borderRadius: '12px', resize: 'vertical', outline: 'none', fontSize: '1rem', lineHeight: '1.6', marginBottom: '24px' }}
                            />
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button onClick={() => setEditingId(null)} style={{ padding: '10px 24px', borderRadius: '10px', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--card-border)', cursor: 'pointer', fontWeight: 'bold' }}>
                                    Cancel
                                </button>
                                <button onClick={() => handleUpdateAnnouncement(editingId)} style={{ padding: '10px 24px', borderRadius: '10px', background: 'var(--primary)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

                {confirmAction && (
                    <ConfirmModal 
                        isOpen={confirmAction.isOpen}
                        title={confirmAction.title}
                        message={confirmAction.message}
                        onConfirm={confirmAction.onConfirm}
                        onCancel={() => setConfirmAction(null)}
                        isDestructive={confirmAction.isDestructive}
                        confirmText={confirmAction.confirmText}
                    />
                )}
            </main>
        </div>
    );
}
