'use client';
import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';
import { doc, getDoc, collection, getDocs, query, orderBy, where, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Event, Feedback } from '@/types';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { X, ArrowLeft } from 'lucide-react';

const EMOJI_RATINGS = [
    { value: 5, emoji: '🤩', label: 'Fantastic!' },
    { value: 4, emoji: '😀', label: 'Good.' },
    { value: 3, emoji: '😐', label: 'Fine.' },
    { value: 2, emoji: '🙁', label: 'Not so great.' },
    { value: 1, emoji: '😡', label: 'Improvements needed.' },
];

export default function FeedbackPage() {
    const { user } = useAuth();
    const params = useParams();
    const router = useRouter();
    const eventId = params.eventId as string;

    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    // Multi-step Feedback State
    const [step, setStep] = useState<number>(0);
    // 0 = Rating, 1 = Comment, 2 = Success

    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [accessDenied, setAccessDenied] = useState<string | null>(null);

    // Admin State
    const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);

    useEffect(() => {
        if (!user) return;

        const init = async () => {
            try {
                // 1. Fetch Event
                const eventSnap = await getDoc(doc(db, 'events', eventId));
                if (!eventSnap.exists()) {
                    setLoading(false);
                    return;
                }
                const eventData = { id: eventSnap.id, ...eventSnap.data() } as Event;
                setEvent(eventData);

                // 2. Check attendee status
                const regRef = doc(db, `events/${eventId}/registrations/${user.uid}`);
                const regSnap = await getDoc(regRef);
                const isAttendee = regSnap.exists() && regSnap.data().attended;

                let hasCertificate = false;
                try {
                    const certsRef = collection(db, `users/${user.uid}/certificates`);
                    const q = query(certsRef, where('eventId', '==', eventId));
                    const certSnap = await getDocs(q);
                    hasCertificate = !certSnap.empty;
                } catch (e) {
                    console.warn("Failed to check certificates", e);
                }

                // 3. Check Role
                const userProfileSnap = await getDoc(doc(db, 'users', user.uid));
                const userData = userProfileSnap.exists() ? userProfileSnap.data() : null;
                const userRole = userData?.role || 'student';

                let isEventAdmin = false;
                if (userRole === 'club_admin' || userRole === 'platform_admin' || userRole === 'college_admin') {
                    const clubSnap = await getDoc(doc(db, 'clubs', eventData.clubId));
                    if (clubSnap.exists() && clubSnap.data().adminIds?.includes(user.uid)) {
                        isEventAdmin = true;
                    }
                }
                if (userData?.role === 'club_member' && userData?.clubId === eventData.clubId) {
                    isEventAdmin = true;
                }

                setIsAdmin(isEventAdmin);

                if (isEventAdmin) {
                    const q = query(collection(db, `events/${eventId}/feedback`), orderBy('createdAt', 'desc'));
                    const snap = await getDocs(q);
                    const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Feedback[];
                    setFeedbacks(list);
                } else {
                    if (!isAttendee && !hasCertificate) {
                        setAccessDenied("You must check-in and attend the event to give feedback.");
                        setLoading(false);
                        return;
                    }
                    const isEventEnded = eventData.status === 'ENDED' || new Date(eventData.endTime).getTime() < Date.now();
                    if (!isEventEnded) {
                        setAccessDenied("Feedback will unlock once the event has ended.");
                        setLoading(false);
                        return;
                    }

                    const fbRef = doc(db, `events/${eventId}/feedback/${user.uid}`);
                    const fbSnap = await getDoc(fbRef);
                    if (fbSnap.exists()) {
                        setStep(2); // Already submitted
                    }
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [user, eventId]);

    const handleRatingSelect = (val: number) => {
        setRating(val);
        setStep(1);
    };

    const handleSubmit = async () => {
        if (!user || rating === 0) return;
        setSubmitting(true);
        try {
            await setDoc(doc(db, `events/${eventId}/feedback/${user.uid}`), {
                userId: user.uid,
                userName: user.displayName || 'Anonymous',
                eventId: eventId,
                rating,
                comment,
                createdAt: Date.now()
            });
            setStep(2);
        } catch (e) {
            console.error(e);
            alert("Failed to submit");
        } finally {
            setSubmitting(false);
        }
    };

    const getEmojiForRating = (val: number) => {
        const found = EMOJI_RATINGS.find(r => r.value === val);
        return found ? found.emoji : '⭐️';
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>;
    if (!event) return <div className="min-h-screen flex items-center justify-center text-white">Event not found</div>;

    if (accessDenied && !isAdmin) {
        return (
            <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', color: 'var(--fg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-inter)' }}>
                <div style={{ background: 'var(--card-bg)', padding: '40px', borderRadius: '24px', border: '1px solid var(--card-border)', textAlign: 'center', maxWidth: '400px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🔒</div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '12px' }}>Access Denied</h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '24px', lineHeight: '1.6' }}>{accessDenied}</p>
                    <Link href="/dashboard/student" style={{ display: 'inline-block', padding: '12px 24px', background: 'var(--primary)', color: '#fff', textDecoration: 'none', borderRadius: '12px', fontWeight: 'bold' }}>
                        Back to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', color: 'var(--fg)', fontFamily: 'var(--font-inter)', transition: 'background-color 0.3s ease' }}>
            <Navbar />

            <main style={{ maxWidth: isAdmin ? '1000px' : '600px', margin: '0 auto', padding: '120px 24px 80px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

                {isAdmin ? (
                    // ADMIN VIEW: Structured Feedbacks
                    <div style={{ width: '100%' }}>
                        <Link href={`/events/${eventId}/analytics`} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', marginBottom: '24px', textDecoration: 'none', fontWeight: 'bold' }}>
                            <ArrowLeft size={16} /> Back to Analytics
                        </Link>

                        <div style={{ marginBottom: '40px' }}>
                            <h1 style={{ fontSize: '2.5rem', fontWeight: '800', fontFamily: 'var(--font-outfit)', marginBottom: '8px' }}>
                                Attendee Feedback
                            </h1>
                            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
                                See what your attendees thought about <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{event.title}</span>.
                            </p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                            {feedbacks.length === 0 ? (
                                <div style={{ gridColumn: '1 / -1', padding: '60px 20px', textAlign: 'center', background: 'var(--card-bg)', border: '1px dashed var(--card-border)', borderRadius: '24px', color: 'var(--text-muted)' }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📭</div>
                                    <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--fg)' }}>No Feedback Yet</h3>
                                    <p>Check back later once attendees start rating your event!</p>
                                </div>
                            ) : (
                                feedbacks.map(fb => (
                                    <div key={fb.id} style={{ background: 'var(--card-bg)', padding: '24px', borderRadius: '24px', border: '1px solid var(--card-border)', boxShadow: 'var(--card-glow)', display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                            <div>
                                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--fg)' }}>{fb.userName}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                                    {new Date(fb.createdAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '2rem', lineHeight: 1, filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.1))' }}>
                                                {getEmojiForRating(fb.rating)}
                                            </div>
                                        </div>
                                        <div style={{ background: 'var(--input-bg)', padding: '16px', borderRadius: '16px', color: fb.comment ? 'var(--fg)' : 'var(--text-muted)', fontSize: '0.95rem', flex: 1, border: '1px solid var(--card-border)' }}>
                                            {fb.comment ? `"${fb.comment}"` : <i>No comment provided.</i>}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                ) : (
                    // STUDENT VIEW: Cute Multi-step Form
                    <div style={{ width: '100%', maxWidth: '420px', animation: 'slideUp 0.3s ease-out' }}>

                        {/* Interactive Card */}
                        <div style={{ background: 'var(--card-bg)', borderRadius: '32px', border: '1px solid var(--card-border)', boxShadow: '0 20px 40px rgba(0,0,0,0.08), var(--card-glow)', overflow: 'hidden', position: 'relative' }}>

                            {/* Card Header */}
                            <div style={{ padding: '32px 32px 16px', position: 'relative' }}>
                                {step === 1 && (
                                    <button onClick={() => setStep(0)} style={{ position: 'absolute', top: '32px', left: '24px', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}>
                                        <ArrowLeft size={20} />
                                    </button>
                                )}
                                <Link href="/dashboard/student" style={{ position: 'absolute', top: '32px', right: '24px', background: 'var(--hover-bg)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <X size={16} />
                                </Link>

                                <div style={{ textAlign: 'center', marginTop: step === 1 ? '0' : '10px' }}>
                                    <h2 style={{ fontSize: '1.4rem', fontWeight: '800', fontFamily: 'var(--font-outfit)', color: 'var(--fg)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                        {step === 0 && <>👋 How's it going?</>}
                                        {step === 1 && <>Rate your experience! 👏</>}
                                        {step === 2 && <>Thank you! 💕</>}
                                    </h2>
                                </div>
                            </div>

                            {/* Card Body */}
                            <div style={{ padding: '0 32px 32px' }}>

                                {/* Step 0: Emoji Ratings */}
                                {step === 0 && (
                                    <div style={{ animation: 'fadeIn 0.3s ease' }}>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', textAlign: 'center', marginBottom: '24px', lineHeight: '1.5' }}>
                                            We would love to hear from you! How was your experience with <strong style={{ color: 'var(--fg)' }}>{event.title}</strong>?
                                        </p>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            {EMOJI_RATINGS.map((r) => (
                                                <button
                                                    key={r.value}
                                                    onClick={() => handleRatingSelect(r.value)}
                                                    style={{ display: 'flex', alignItems: 'center', gap: '16px', width: '100%', padding: '16px 20px', background: 'var(--bg)', border: '1px solid var(--card-border)', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left' }}
                                                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--card-border)'; e.currentTarget.style.background = 'var(--bg)'; e.currentTarget.style.transform = 'translateY(0)' }}
                                                >
                                                    <span style={{ fontSize: '1.8rem', lineHeight: '1', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}>{r.emoji}</span>
                                                    <span style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--fg)' }}>{r.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Step 1: Comment Box */}
                                {step === 1 && (
                                    <div style={{ animation: 'fadeIn 0.3s ease' }}>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', textAlign: 'center', marginBottom: '24px', lineHeight: '1.5' }}>
                                            We love to hear from you! How's your experience with <strong style={{ color: 'var(--primary)' }}>{event.title}</strong>?
                                        </p>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                                            <div style={{ fontSize: '2.5rem', lineHeight: '1', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))' }}>
                                                {getEmojiForRating(rating)}
                                            </div>
                                            <div style={{ flex: 1, height: '4px', background: 'var(--hover-bg)', borderRadius: '2px', position: 'relative' }}>
                                                <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${(rating / 5) * 100}%`, background: '#3b82f6', borderRadius: '2px', transition: 'width 0.3s ease' }}>
                                                    <div style={{ position: 'absolute', right: '-8px', top: '-6px', width: '16px', height: '16px', background: '#3b82f6', borderRadius: '50%', border: '3px solid var(--card-bg)' }}></div>
                                                </div>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
                                            {EMOJI_RATINGS.find(r => r.value === rating)?.label}
                                        </div>

                                        <textarea
                                            value={comment}
                                            onChange={(e) => setComment(e.target.value)}
                                            placeholder="Any comment for us?"
                                            style={{
                                                width: '100%', minHeight: '120px', padding: '16px', borderRadius: '16px', border: '1px solid var(--card-border)', background: 'var(--bg)', color: 'var(--fg)', fontFamily: 'inherit', resize: 'vertical', fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s', marginBottom: '24px'
                                            }}
                                            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                                            onBlur={(e) => e.target.style.borderColor = 'var(--card-border)'}
                                        />

                                        <button
                                            onClick={handleSubmit}
                                            disabled={submitting}
                                            style={{ width: '100%', padding: '16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '16px', fontSize: '1.1rem', fontWeight: 'bold', cursor: submitting ? 'not-allowed' : 'pointer', transition: 'transform 0.2s', opacity: submitting ? 0.7 : 1 }}
                                            onMouseEnter={(e) => !submitting && (e.currentTarget.style.transform = 'translateY(-2px)')}
                                            onMouseLeave={(e) => !submitting && (e.currentTarget.style.transform = 'translateY(0)')}
                                        >
                                            {submitting ? 'Submitting...' : 'Submit'}
                                        </button>
                                    </div>
                                )}

                                {/* Step 2: Success Screen */}
                                {step === 2 && (
                                    <div style={{ textAlign: 'center', animation: 'fadeIn 0.4s ease' }}>
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '32px', lineHeight: '1.5' }}>
                                            Thanks for submitting your feedback! We really appreciate your time.
                                        </p>
                                        <div style={{ fontSize: '5rem', marginBottom: '32px', animation: 'bounce 2s infinite' }}>
                                            🎉
                                        </div>
                                        <Link href="/dashboard/student" style={{ display: 'inline-block', padding: '14px 32px', background: 'var(--bg)', color: 'var(--fg)', textDecoration: 'none', borderRadius: '16px', fontWeight: 'bold', border: '1px solid var(--card-border)' }}>
                                            Back to Dashboard
                                        </Link>
                                    </div>
                                )}

                            </div>
                        </div>
                    </div>
                )}
            </main>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-10px); }
                }
            `}} />
        </div>
    );
}
