'use client';
import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import QRCode from 'react-qr-code';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

export default function TicketPage({ params }: { params: Promise<{ eventId: string }> }) {
    const { user } = useAuth();
    const [eventId, setEventId] = useState('');
    const [event, setEvent] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        params.then(p => {
            setEventId(p.eventId);
            if (!user) return;
            getDoc(doc(db, 'events', p.eventId)).then(snap => {
                if (snap.exists()) setEvent(snap.data());
                setLoading(false);
            });
        });
    }, [params, user]);

    if (!user || loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading Ticket...</div>;

    const qrData = JSON.stringify({ uid: user.uid, eid: eventId, ts: Date.now() });

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#050505', color: '#fff', fontFamily: 'var(--font-inter)' }}>
            <Navbar />

            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 20px 40px' }}>

                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '8px' }}>Your Ticket</h1>
                    <p style={{ opacity: 0.6 }}>Present this QR code at {event?.venue}</p>
                </div>

                {/* Ticket Card */}
                <div style={{
                    width: '100%',
                    maxWidth: '360px',
                    backgroundColor: '#fff',
                    borderRadius: '24px',
                    color: '#000',
                    overflow: 'hidden',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                    position: 'relative'
                }}>
                    {/* Top Halftest */}
                    <div style={{ padding: '30px', background: '#f8fafc', borderBottom: '2px dashed #cbd5e1', position: 'relative' }}>
                        {/* Notches */}
                        <div style={{ position: 'absolute', bottom: '-12px', left: '-12px', width: '24px', height: '24px', borderRadius: '50%', background: '#050505' }}></div>
                        <div style={{ position: 'absolute', bottom: '-12px', right: '-12px', width: '24px', height: '24px', borderRadius: '50%', background: '#050505' }}></div>

                        <div style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '8px', letterSpacing: '1px' }}>Event Access</div>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: '900', lineHeight: '1.1', marginBottom: '16px' }}>{event?.title}</h2>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 'bold' }}>Date</div>
                                <div style={{ fontWeight: '600' }}>{new Date(event?.startTime).toLocaleDateString()}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 'bold' }}>Time</div>
                                <div style={{ fontWeight: '600' }}>{new Date(event?.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Half */}
                    <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ padding: '10px', border: '4px solid #000', borderRadius: '16px', marginBottom: '20px' }}>
                            <QRCode value={qrData} size={160} />
                        </div>

                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{user.displayName}</div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Standard Ticket</div>
                    </div>
                </div>

                <div style={{ marginTop: '40px', display: 'flex', gap: '16px' }}>
                    <Link href="/dashboard/student" style={{ padding: '12px 30px', background: '#3b82f6', color: '#fff', borderRadius: '50px', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)' }}>
                        Done
                    </Link>
                </div>

            </div>
        </div>
    );
}
