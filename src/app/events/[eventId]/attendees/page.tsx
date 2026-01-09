'use client';
import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

export default function AttendeeListPage({ params }: { params: Promise<{ eventId: string }> }) {
    const { user } = useAuth();
    const [eventId, setEventId] = useState('');
    const [attendees, setAttendees] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        params.then(p => {
            setEventId(p.eventId);
            const fetchAttendees = async () => {
                const ref = collection(db, `events/${p.eventId}/registrations`);
                const snap = await getDocs(ref);
                const list = snap.docs.map(d => d.data());
                setAttendees(list);
                setLoading(false);
            };
            fetchAttendees();
        });
    }, [params]);

    const handleExport = () => {
        if (attendees.length === 0) {
            alert("No attendees to export.");
            return;
        }

        // 1. Define Headers
        const headers = ["Name", "Email", "Registered At", "Status"];

        // 2. Generate Rows
        const rows = attendees.map(a => {
            // Escape quotes in data to prevent CSV breakage
            const name = (a.userName || "").replace(/"/g, '""');
            const email = (a.userEmail || "").replace(/"/g, '""');
            const date = new Date(a.registeredAt).toLocaleString().replace(/"/g, '""');
            const status = (a.attended ? 'Attended' : 'Registered');

            // Wrap each field in quotes
            return `"${name}","${email}","${date}","${status}"`;
        });

        // 3. Combine into CSV String
        const csvString = [headers.join(","), ...rows].join("\n");

        // 4. Create Blob with UTF-8 BOM
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]); // Critical for Excel
        const blob = new Blob([bom, csvString], { type: 'text/csv;charset=utf-8' });

        // 5. Trigger Download
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = `attendees_list.csv`; // Simple, static name to avoid browser issues
        document.body.appendChild(link);
        link.click();

        // 6. Cleanup
        setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        }, 100);
    };

    if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#09090b', color: '#fff', fontFamily: 'var(--font-inter)' }}>
            <Navbar />
            <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 24px', paddingTop: '140px', paddingBottom: '80px' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '30px' }}>
                    <div>
                        <Link href={`/events/${eventId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', opacity: 0.6, marginBottom: '16px', fontSize: '0.9rem' }}>
                            ← Back to Event
                        </Link>
                        <h1 style={{ fontSize: '2rem', fontWeight: 'bold' }}>All Attendees</h1>
                    </div>

                    <button
                        onClick={handleExport}
                        style={{ padding: '12px 24px', background: '#22c55e', color: '#000', fontWeight: 'bold', borderRadius: '12px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <span>📥</span> Export to CSV
                    </button>
                </div>

                <div style={{ background: '#121214', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '24px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}>
                                <th style={{ padding: '20px', fontSize: '0.85rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>Name</th>
                                <th style={{ padding: '20px', fontSize: '0.85rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>Email</th>
                                <th style={{ padding: '20px', fontSize: '0.85rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>Registered At</th>
                                <th style={{ padding: '20px', fontSize: '0.85rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {attendees.map((a, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '20px', fontWeight: '600' }}>{a.userName}</td>
                                    <td style={{ padding: '20px', opacity: 0.7, fontFamily: 'monospace' }}>{a.userEmail}</td>
                                    <td style={{ padding: '20px', opacity: 0.5, fontSize: '0.9rem' }}>{new Date(a.registeredAt).toLocaleString()}</td>
                                    <td style={{ padding: '20px' }}>
                                        <span style={{ padding: '4px 10px', borderRadius: '6px', background: a.attended ? 'rgba(34, 197, 94, 0.2)' : 'rgba(234, 179, 8, 0.2)', color: a.attended ? '#4ade80' : '#facc15', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                            {a.attended ? 'Attended' : 'Registered'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {attendees.length === 0 && (
                        <div style={{ padding: '40px', textAlign: 'center', opacity: 0.5 }}>No attendees yet.</div>
                    )}
                </div>
            </main>
        </div>
    );
}
