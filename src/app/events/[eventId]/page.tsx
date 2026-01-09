'use client';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Event } from '@/types';

const SAMPLE_IMAGES = [
    "https://img.freepik.com/free-vector/cloud-services-isometric-composition-with-small-figures-people-with-computer-screens_1284-30497.jpg?t=st=1767964951~exp=1767968551~hmac=a838f4281bc60e4ece2d61e9552f22de1637384ea5eb3c2d0cd1886d369671af",
];

export default function EventDetailsPage({ params }: { params: Promise<{ eventId: string }> }) {
    const { user } = useAuth();
    const router = useRouter();
    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<Partial<Event>>({});

    useEffect(() => {
        params.then(p => {
            getDoc(doc(db, 'events', p.eventId)).then(snap => {
                if (snap.exists()) {
                    setEvent({ id: snap.id, ...snap.data() } as Event);
                }
                setLoading(false);
            });
        });
    }, [params]);

    const handleSave = async () => {
        if (!event) return;
        try {
            await updateDoc(doc(db, 'events', event.id), editForm);
            setEvent({ ...event, ...editForm });
            setIsEditing(false);
            alert("Event updated!");
        } catch (e) {
            console.error(e);
            alert("Update failed");
        }
    };

    if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;
    if (!event) return <div>Event not found</div>;

    const imageSrc = event.posterURL || SAMPLE_IMAGES[0];

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#09090b', color: '#fff', fontFamily: 'var(--font-inter)' }}>
            <Navbar />

            <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 24px', paddingTop: '140px', paddingBottom: '80px' }}>

                {/* Back Link */}
                <Link href="/dashboard/club-admin" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', opacity: 0.6, marginBottom: '24px', fontSize: '0.9rem' }}>
                    ← Back to Dashboard
                </Link>

                {/* Hero / Header */}
                <div style={{ position: 'relative', borderRadius: '32px', overflow: 'hidden', marginBottom: '40px', minHeight: '200px', background: '#121214', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ position: 'absolute', inset: 0 }}>
                        <img src={imageSrc} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.4 }} referrerPolicy="no-referrer" />
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, #09090b 20%, transparent)' }}></div>
                    </div>

                    <div style={{ position: 'relative', padding: '40px', display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
                        {isEditing ? (
                            <input
                                className="input-fld"
                                style={{ fontSize: '2rem', fontWeight: 'bold', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', marginBottom: '10px' }}
                                value={editForm.title || event.title}
                                onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                            />
                        ) : (
                            <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '10px', maxWidth: '700px' }}>{event.title}</h1>
                        )}

                        <div style={{ display: 'flex', gap: '24px', opacity: 0.8, fontSize: '0.9rem' }}>
                            {isEditing ? (
                                <input
                                    className="input-fld"
                                    value={editForm.venue || event.venue}
                                    onChange={e => setEditForm({ ...editForm, venue: e.target.value })}
                                />
                            ) : (
                                <>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>📍 {event.venue}</span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>📅 {new Date(event.startTime).toLocaleString()}</span>
                                </>
                            )}
                        </div>

                        {/* Actions */}
                        <div style={{ position: 'absolute', top: '40px', right: '40px', display: 'flex', gap: '12px' }}>
                            {isEditing ? (
                                <>
                                    <button onClick={handleSave} style={{ padding: '10px 24px', background: '#22c55e', color: '#000', fontWeight: 'bold', borderRadius: '12px', border: 'none' }}>Save</button>
                                    <button onClick={() => setIsEditing(false)} style={{ padding: '10px 24px', background: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px', border: 'none' }}>Cancel</button>
                                </>
                            ) : (
                                <button onClick={() => { setIsEditing(true); setEditForm(event); }} style={{ padding: '10px 24px', background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', color: '#fff', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)', fontWeight: 'bold' }}>
                                    Edit Details
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Content Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) 1fr', gap: '40px' }}>
                    {/* Left: Description */}
                    <div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '16px' }}>About Event</h3>
                        {isEditing ? (
                            <textarea
                                className="input-fld"
                                style={{ width: '100%', minHeight: '200px', background: '#121214', color: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}
                                value={editForm.description || event.description}
                                onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                            />
                        ) : (
                            <p style={{ lineHeight: '1.8', opacity: 0.8, whiteSpace: 'pre-line' }}>{event.description}</p>
                        )}
                    </div>
                    {/* Analytics Button placed below About Event */}
                    <div style={{ marginTop: '24px' }}>
                        <Link href={`/events/${event.id}/analytics`} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', color: '#3b82f6', borderRadius: '12px', fontWeight: 'bold', maxWidth: '300px', transition: 'all 0.2s' }}>
                            <span style={{ fontSize: '1.2rem' }}>📊</span>
                            <span>View Event Analytics</span>
                        </Link>
                    </div>

                    {/* Right: Stats & Attendees */}
                    <div>
                        <div style={{ background: '#121214', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', padding: '30px' }}>
                            <h3 style={{ fontSize: '1rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', fontWeight: 'bold', marginBottom: '8px' }}>Registrations</h3>
                            <div style={{ fontSize: '3.5rem', fontWeight: '800', marginBottom: '4px', lineHeight: '1' }}>{event.attendeeCount || 0}</div>
                            <p style={{ opacity: 0.6, fontSize: '0.9rem', marginBottom: '32px' }}>Total students assigned</p>

                            <Link href={`/events/${event.id}/attendees`} style={{ display: 'block', width: '100%', padding: '14px', background: '#3b82f6', color: '#fff', textAlign: 'center', borderRadius: '12px', fontWeight: 'bold', marginBottom: '16px' }}>
                                View Attendee List
                            </Link>

                            {event.status !== 'ENDED' ? (
                                <>
                                    <Link href={`/events/${event.id}/analytics`} style={{ display: 'block', width: '100%', padding: '14px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', color: '#3b82f6', textAlign: 'center', borderRadius: '12px', fontWeight: 'bold', marginBottom: '16px' }}>
                                        📊 Analytics
                                    </Link>
                                    <Link href={`/events/${event.id}/feedback`} style={{ display: 'block', width: '100%', padding: '14px', background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.2)', color: '#a855f7', textAlign: 'center', borderRadius: '12px', fontWeight: 'bold', marginBottom: '16px' }}>
                                        💬 User Feedback
                                    </Link>
                                    <Link href={`/events/${event.id}/scan`} style={{ display: 'block', width: '100%', padding: '14px', background: '#121214', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', textAlign: 'center', borderRadius: '12px', fontWeight: 'bold', marginBottom: '16px' }}>
                                        📷 Scan Attendance
                                    </Link>
                                    <button
                                        onClick={async () => {
                                            if (!confirm("Are you sure you want to END this event? This will stop registrations.")) return;
                                            await updateDoc(doc(db, 'events', event.id), { status: 'ENDED' });
                                            setEvent({ ...event, status: 'ENDED' });
                                        }}
                                        style={{ display: 'block', width: '100%', padding: '14px', background: '#ef4444', color: '#fff', textAlign: 'center', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                                    >
                                        End Event
                                    </button>
                                </>
                            ) : (
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', borderRadius: '12px', marginBottom: '16px', fontWeight: 'bold' }}>
                                        Event Ended
                                    </div>

                                    <Link href={`/events/${event.id}/feedback`} style={{ display: 'block', width: '100%', padding: '14px', background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.2)', color: '#a855f7', textAlign: 'center', borderRadius: '12px', fontWeight: 'bold', marginBottom: '16px' }}>
                                        💬 View User Feedback
                                    </Link>

                                    {!event.certificatesIssued ? (
                                        <button
                                            onClick={async () => {
                                                if (!confirm("Issue certificates to all attendees?")) return;
                                                const btn = document.getElementById('issue-btn');
                                                if (btn) btn.innerText = "Issuing...";

                                                try {
                                                    const { collection, getDocs, addDoc, writeBatch } = await import('firebase/firestore');

                                                    // 1. Get Attendees
                                                    const regsRef = collection(db, `events/${event.id}/registrations`);
                                                    const regSnap = await getDocs(regsRef);
                                                    const attendees = regSnap.docs.map(d => d.data()).filter(d => d.attended);

                                                    if (attendees.length === 0) {
                                                        alert("No attendees found to issue certificates to.");
                                                        if (btn) btn.innerText = "Issue Certificates";
                                                        return;
                                                    }

                                                    // 2. Issue Certificates (Batch writing might be limited, so loop for now or use multiple batches)
                                                    const batch = writeBatch(db);

                                                    attendees.forEach(student => {
                                                        // Using a subcollection in User profile for easy access
                                                        const certRef = doc(collection(db, `users/${student.userId}/certificates`));
                                                        batch.set(certRef, {
                                                            eventId: event.id,
                                                            eventName: event.title,
                                                            eventDate: event.startTime,
                                                            issuedAt: Date.now(),
                                                            studentName: student.userName,
                                                            studentEmail: student.userEmail,
                                                            collegeName: event.collegeId === 'Global_College' ? 'CMRIT' : event.collegeId
                                                        });
                                                    });

                                                    // Mark event as issued
                                                    batch.update(doc(db, 'events', event.id), { certificatesIssued: true });

                                                    await batch.commit();
                                                    alert(`Successfully issued ${attendees.length} certificates!`);
                                                    setEvent({ ...event, certificatesIssued: true });

                                                } catch (e) {
                                                    console.error(e);
                                                    alert("Failed to issue certificates");
                                                }
                                            }}
                                            id="issue-btn"
                                            style={{ display: 'block', width: '100%', padding: '14px', background: '#eab308', color: '#000', textAlign: 'center', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                                        >
                                            🏆 Issue Certificates
                                        </button>
                                    ) : (
                                        <div style={{ padding: '12px', background: 'rgba(34, 197, 94, 0.1)', color: '#4ade80', borderRadius: '12px', fontWeight: 'bold' }}>
                                            ✅ Certificates Issued
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>
                    </div>
                </div>

            </main >
        </div >
    );
}
