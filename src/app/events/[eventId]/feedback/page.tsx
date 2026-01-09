'use client';
import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';
import { doc, getDoc, collection, addDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Event, Feedback, Registration } from '@/types';
import Navbar from '@/components/Navbar';
import { useParams, useRouter } from 'next/navigation';

export default function FeedbackPage() {
    const { user } = useAuth();
    const params = useParams();
    const router = useRouter();
    const eventId = params.eventId as string;

    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    // Student State
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

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

                // 2. Determine Role
                // Check if user is club admin for this event's club
                // Simplified: If user role is club_admin, check if they manage this club.
                // For hackathon speed, let's assume if they have access to the dashboard link they are admin,
                // but strictly we should check club.adminIds.

                // Let's check Registration first to see if they are a student attendee
                const regRef = doc(db, `events/${eventId}/registrations/${user.uid}`);
                const regSnap = await getDoc(regRef);
                const isAttendee = regSnap.exists() && regSnap.data().attended;

                // Fetch User Profile to check role
                const userProfileSnap = await getDoc(doc(db, 'users', user.uid));
                const userRole = userProfileSnap.exists() ? userProfileSnap.data().role : 'student';

                let isEventAdmin = false;

                if (userRole === 'club_admin' || userRole === 'platform_admin' || userRole === 'college_admin') {
                    // Check if they manage this club
                    const clubSnap = await getDoc(doc(db, 'clubs', eventData.clubId));
                    if (clubSnap.exists() && clubSnap.data().adminIds.includes(user.uid)) {
                        isEventAdmin = true;
                    }
                }

                setIsAdmin(isEventAdmin);

                if (isEventAdmin) {
                    // Defined here to be safely called
                    const q = query(collection(db, `events/${eventId}/feedback`), orderBy('createdAt', 'desc'));
                    const snap = await getDocs(q);
                    const list = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Feedback[];
                    setFeedbacks(list);
                } else {
                    // If not admin, check if they already submitted feedback
                    const fbRef = doc(db, `events/${eventId}/feedback/${user.uid}`);
                    const fbSnap = await getDoc(fbRef);
                    if (fbSnap.exists()) {
                        setSubmitted(true);
                        setRating(fbSnap.data().rating);
                        setComment(fbSnap.data().comment);
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

    // fetchFeedbacks removed from here as it's now inlined/handled inside useEffect


    const handleSubmit = async () => {
        if (!user) return;
        if (rating === 0) return alert("Please select a rating");
        setSubmitting(true);
        try {
            // Using setDoc with user.uid to prevent duplicates
            const { setDoc } = await import('firebase/firestore');
            await setDoc(doc(db, `events/${eventId}/feedback/${user.uid}`), {
                userId: user.uid,
                userName: user.displayName || 'Anonymous',
                eventId: eventId,
                rating,
                comment,
                createdAt: Date.now()
            });
            setSubmitted(true);
            alert("Feedback Submitted!");
            router.push('/dashboard/student');
        } catch (e) {
            console.error(e);
            alert("Failed to submit");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>;
    if (!event) return <div className="min-h-screen flex items-center justify-center text-white">Event not found</div>;

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#09090b', color: '#fff', fontFamily: 'var(--font-inter)' }}>
            <Navbar />
            <main style={{ maxWidth: '800px', margin: '0 auto', padding: '140px 24px 80px' }}>

                <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '8px' }}>
                    Feedback: <span style={{ color: '#3b82f6' }}>{event.title}</span>
                </h1>
                <p style={{ opacity: 0.6, marginBottom: '40px' }}>
                    {isAdmin ? "See what students are saying about your event." : "Share your experience to help us improve."}
                </p>

                {isAdmin ? (
                    // ADMIN VIEW
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {feedbacks.length === 0 ? (
                            <div style={{ padding: '40px', textAlign: 'center', opacity: 0.5, border: '1px dashed #333', borderRadius: '12px' }}>
                                No feedback yet.
                            </div>
                        ) : (
                            feedbacks.map(fb => (
                                <div key={fb.id} style={{
                                    background: '#121214',
                                    padding: '24px',
                                    borderRadius: '16px',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                        <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{fb.userName}</span>
                                        <div style={{ display: 'flex', gap: '2px' }}>
                                            {[1, 2, 3, 4, 5].map(star => (
                                                <span key={star} style={{ color: star <= fb.rating ? '#eab308' : '#333' }}>★</span>
                                            ))}
                                        </div>
                                    </div>
                                    <p style={{ lineHeight: '1.6', opacity: 0.8 }}>{fb.comment}</p>
                                    <div style={{ marginTop: '16px', fontSize: '0.8rem', opacity: 0.4 }}>
                                        {new Date(fb.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    // STUDENT VIEW
                    <div style={{
                        background: '#121214',
                        padding: '32px',
                        borderRadius: '24px',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <div style={{ marginBottom: '30px', textAlign: 'center' }}>
                            <label style={{ display: 'block', marginBottom: '16px', fontSize: '1.2rem', fontWeight: 'bold' }}>How would you rate this event?</label>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                                {[1, 2, 3, 4, 5].map(star => (
                                    <button
                                        key={star}
                                        onClick={() => !submitted && setRating(star)}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            fontSize: '3rem',
                                            color: star <= rating ? '#eab308' : '#333',
                                            cursor: submitted ? 'default' : 'pointer',
                                            transition: 'transform 0.1s'
                                        }}
                                        onMouseEnter={(e) => !submitted && (e.currentTarget.style.transform = 'scale(1.2)')}
                                        onMouseLeave={(e) => !submitted && (e.currentTarget.style.transform = 'scale(1)')}
                                    >
                                        ★
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ marginBottom: '30px' }}>
                            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>Any additional comments?</label>
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                disabled={submitted}
                                placeholder="What did you like? What could be better?"
                                style={{
                                    width: '100%',
                                    minHeight: '120px',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    background: '#000',
                                    color: '#fff',
                                    fontFamily: 'inherit',
                                    resize: 'vertical'
                                }}
                            />
                        </div>

                        <button
                            onClick={handleSubmit}
                            disabled={submitting || submitted || rating === 0}
                            style={{
                                width: '100%',
                                padding: '16px',
                                background: submitted ? '#22c55e' : '#3b82f6',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: '1.1rem',
                                fontWeight: 'bold',
                                cursor: (submitting || submitted || rating === 0) ? 'not-allowed' : 'pointer',
                                opacity: (rating === 0 && !submitted) ? 0.5 : 1
                            }}
                        >
                            {submitted ? "Thanks for your feedback! ✓" : (submitting ? "Submitting..." : "Submit Feedback")}
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}
