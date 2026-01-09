'use client';
import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Navbar from '@/components/Navbar';
import { useParams } from 'next/navigation';

export default function ScanPage() {
    const { user } = useAuth();
    const params = useParams();
    const eventId = params.eventId as string;

    const [scanning, setScanning] = useState(true);
    const [manualEmail, setManualEmail] = useState('');
    const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'SUCCESS' | 'ERROR'>('IDLE');
    const [message, setMessage] = useState('');
    const [lastScanned, setLastScanned] = useState('');

    // Scanned Data State
    const [scannedUid, setScannedUid] = useState<string | null>(null);

    const handleScan = async (rawValue: string) => {
        if (!rawValue || status === 'PROCESSING') return;

        // Prevent double scanning
        if (rawValue === lastScanned && status === 'SUCCESS') return;
        setLastScanned(rawValue);

        setStatus('PROCESSING');
        setMessage('Fetching ticket details...');

        try {
            let uid = rawValue;
            try {
                const data = JSON.parse(rawValue);
                if (data.uid) uid = data.uid;
                if (data.eid && data.eid !== eventId) {
                    throw new Error("Ticket is for a different event!");
                }
            } catch (e) {
                // Not JSON, use raw
            }

            // Fetch Registration first (Don't mark yet)
            const regRef = doc(db, `events/${eventId}/registrations/${uid}`);
            const snap = await getDoc(regRef);

            if (!snap.exists()) {
                throw new Error("User NOT registered for this event.");
            }

            const data = snap.data();
            setManualEmail(data.userEmail); // Autofill Email
            setScannedUid(uid);             // Store UID for the Mark action

            setStatus('IDLE'); // Ready for confirmation
            setMessage(`Found: ${data.userName}`);

        } catch (e: any) {
            console.error(e);
            setStatus('ERROR');
            setMessage(e.message || "Invalid Ticket");
            setTimeout(() => { setStatus('IDLE'); setMessage(''); }, 3000);
        }
    };

    const confirmAttendance = async () => {
        let uidToMark = scannedUid;

        // If no scanned UID, try to find by email (Manual mode)
        if (!uidToMark) {
            if (!manualEmail) return;
            setStatus('PROCESSING');
            try {
                // Using top-level imports
                const q = query(collection(db, `events/${eventId}/registrations`), where('userEmail', '==', manualEmail));
                const snaps = await getDocs(q);
                if (snaps.empty) throw new Error("No registration found for this email.");
                uidToMark = snaps.docs[0].id;
            } catch (e: any) {
                setStatus('ERROR');
                setMessage(e.message);
                return;
            }
        }

        if (!uidToMark) return;

        try {
            const regRef = doc(db, `events/${eventId}/registrations/${uidToMark}`);

            // Check if already attended
            const snap = await getDoc(regRef);
            if (snap.exists() && snap.data().attended) {
                alert("Already marked as attended!");
                setStatus('ERROR');
                setMessage(`Already Scanned: ${snap.data().userName}`);
                setScannedUid(null);
                setManualEmail('');
                return;
            }

            await updateDoc(regRef, {
                attended: true,
                attendedAt: Date.now()
            });

            // Success Feedback
            // User requested: "give a pop of done"
            alert("Done! Attendance Marked.");

            setStatus('SUCCESS');
            setMessage(`Verified & Marked!`);

            // Reset
            setScannedUid(null);
            setManualEmail('');
            setLastScanned('');

            // Clear message after delay
            setTimeout(() => { setStatus('IDLE'); setMessage(''); }, 2000);

        } catch (e: any) {
            setStatus('ERROR');
            setMessage(e.message);
        }
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff', fontFamily: 'var(--font-inter)' }}>
            <Navbar />
            {/* Close / Back Button */}
            <div style={{ position: 'fixed', top: '20px', left: '20px', zIndex: 1000 }}>
                <button
                    onClick={() => window.history.back()}
                    style={{ background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '50%', width: '40px', height: '40px', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}
                >
                    ✕
                </button>
            </div>

            <div style={{ padding: '120px 20px 40px', maxWidth: '600px', margin: '0 auto' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '20px', textAlign: 'center' }}>Attendance Scanner</h1>

                {/* Status Banner */}
                {message && (
                    <div style={{
                        padding: '16px',
                        borderRadius: '12px',
                        marginBottom: '20px',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        backgroundColor: status === 'SUCCESS' ? '#22c55e' : status === 'ERROR' ? '#ef4444' : '#3b82f6'
                    }}>
                        {message}
                    </div>
                )}

                {/* Scanner View */}
                <div style={{
                    borderRadius: '24px',
                    overflow: 'hidden',
                    border: '2px solid rgba(255,255,255,0.1)',
                    marginBottom: '30px',
                    position: 'relative',
                    background: '#111',
                    aspectRatio: '1/1'
                }}>
                    {scanning && (
                        <Scanner
                            onScan={(result) => result?.[0]?.rawValue && handleScan(result[0].rawValue)}
                            onError={(error) => console.log(error)}
                        />
                    )}
                    <div style={{ position: 'absolute', inset: 0, border: '50px solid rgba(0,0,0,0.5)', pointerEvents: 'none' }}></div>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '200px', height: '200px', border: '2px solid #3b82f6', borderRadius: '12px', boxShadow: '0 0 20px rgba(59, 130, 246, 0.5)' }}></div>
                </div>

                {/* Manual Fallback */}
                <div style={{ background: '#111', padding: '24px', borderRadius: '20px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '12px' }}>
                        {scannedUid ? 'Confirm Attendance' : 'Manual Entry'}
                    </h3>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input
                            style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #333', background: '#000', color: '#fff' }}
                            placeholder="Student Email"
                            value={manualEmail}
                            onChange={(e) => setManualEmail(e.target.value)}
                        />
                        <button
                            onClick={confirmAttendance}
                            disabled={status === 'PROCESSING'}
                            style={{ padding: '0 20px', background: status === 'SUCCESS' ? '#22c55e' : '#3b82f6', color: '#fff', borderRadius: '8px', fontWeight: 'bold' }}
                        >
                            {status === 'SUCCESS' ? 'Done' : 'Mark'}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
