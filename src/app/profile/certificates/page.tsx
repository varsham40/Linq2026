'use client';
import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Certificate } from '@/types';
import jsPDF from 'jspdf';

export default function MyCertificates() {
    const { user } = useAuth();
    const [certificates, setCertificates] = useState<Certificate[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        const fetchCerts = async () => {
            const ref = collection(db, `users/${user.uid}/certificates`);
            const snap = await getDocs(ref);
            setCertificates(snap.docs.map(d => ({ id: d.id, ...d.data() })) as Certificate[]);
            setLoading(false);
        };
        fetchCerts();
    }, [user]);

    const downloadPDF = (cert: Certificate) => {
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'px',
            format: [800, 600]
        });

        // Background
        doc.setFillColor(255, 255, 255);
        doc.rect(0, 0, 800, 600, 'F');

        // Border
        doc.setLineWidth(10);
        doc.setDrawColor(59, 130, 246); // Blue border
        doc.rect(20, 20, 760, 560);

        // Header
        doc.setFont("helvetica", "bold");
        doc.setFontSize(40);
        doc.setTextColor(59, 130, 246);
        doc.text("CERTIFICATE OF PARTICIPATION", 400, 100, { align: 'center' });

        // Body
        doc.setFont("helvetica", "normal");
        doc.setFontSize(20);
        doc.setTextColor(50, 50, 50);
        doc.text("This is to certify that", 400, 180, { align: 'center' });

        // Name
        doc.setFont("helvetica", "bold");
        doc.setFontSize(36);
        doc.setTextColor(0, 0, 0);
        doc.text(cert.studentName, 400, 240, { align: 'center' });

        // Event Text
        doc.setFont("helvetica", "normal");
        doc.setFontSize(20);
        doc.setTextColor(50, 50, 50);
        doc.text("has successfully attended the event", 400, 300, { align: 'center' });

        // Event Name
        doc.setFont("helvetica", "bold");
        doc.setFontSize(28);
        doc.text(cert.eventName, 400, 350, { align: 'center' });

        // Date & Org
        doc.setFontSize(16);
        doc.setFont("helvetica", "normal");
        doc.text(`Organized by ${cert.collegeName}`, 400, 400, { align: 'center' });
        doc.text(`Date: ${new Date(cert.eventDate).toLocaleDateString()}`, 400, 430, { align: 'center' });

        // Footer / Signature Mock
        doc.setLineWidth(1);
        doc.setDrawColor(0, 0, 0);
        doc.line(200, 500, 350, 500);
        doc.line(450, 500, 600, 500);

        doc.setFontSize(12);
        doc.text("College Admin", 275, 520, { align: 'center' });
        doc.text("Club President", 525, 520, { align: 'center' });

        doc.save(`${cert.eventName}_Certificate.pdf`);
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#09090b', color: '#fff', fontFamily: 'var(--font-inter)' }}>
            <Navbar />
            <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 24px', paddingTop: '140px', paddingBottom: '80px' }}>
                <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '30px' }}>My Certificates 🏆</h1>

                {loading ? (
                    <div>Loading...</div>
                ) : certificates.length === 0 ? (
                    <div style={{ padding: '40px', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', textAlign: 'center' }}>
                        <p style={{ opacity: 0.6 }}>You haven't earned any certificates yet. Attend events to earn them!</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                        {certificates.map(cert => (
                            <div key={cert.id} style={{ background: '#fff', color: '#000', padding: '24px', borderRadius: '16px', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '6px', background: '#3b82f6' }}></div>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '8px' }}>{cert.eventName}</h3>
                                <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '20px' }}>Issued on: {new Date(cert.issuedAt).toLocaleDateString()}</p>

                                <button
                                    onClick={() => downloadPDF(cert)}
                                    style={{ width: '100%', padding: '10px', background: '#121214', color: '#fff', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                                >
                                    ⬇ Download PDF
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
