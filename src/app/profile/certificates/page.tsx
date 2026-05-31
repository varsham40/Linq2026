'use client';
import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Certificate, Club, Event } from '@/types';
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

    const downloadPDF = async (cert: Certificate) => {
        // 1. Fetch fresh data (Retroactive Fix)
        let clubName = cert.clubName || "Club Name";
        let collegeName = cert.collegeName || "College Name";

        try {
            // Fetch Event to get Club ID
            const eventRef = doc(db, 'events', cert.eventId);
            const eventSnap = await getDoc(eventRef);

            if (eventSnap.exists()) {
                const eventData = eventSnap.data() as Event;

                if (eventData.clubId) {
                    const clubSnap = await getDoc(doc(db, 'clubs', eventData.clubId));
                    if (clubSnap.exists()) {
                        const clubData = clubSnap.data() as Club;
                        clubName = clubData.name;
                        // Determine college name 
                        // For MVP, we might need to fetch college or just use club's collegeId if it's a string name (unlikely)
                        // logic: if collegeId is an ID, fetch it.
                        if (clubData.collegeId) {
                            // Attempt fetch
                            const colSnap = await getDoc(doc(db, 'colleges', clubData.collegeId));
                            if (colSnap.exists()) {
                                collegeName = colSnap.data().name;
                            }
                        }
                    }
                }
            }
        } catch (err) {
            console.error("Error fetching fresh cert details:", err);
            // Fallback to existing cert data
        }

        const pdf = new jsPDF({
            orientation: 'landscape',
            unit: 'px',
            format: [842, 595] // A4 Landscape roughly
        });

        const width = pdf.internal.pageSize.getWidth();
        const height = pdf.internal.pageSize.getHeight();

        // --- Background & Border ---
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, width, height, 'F');

        // Professional Border
        pdf.setDrawColor(20, 20, 20);
        pdf.setLineWidth(2);
        pdf.rect(20, 20, width - 40, height - 40);

        pdf.setDrawColor(218, 165, 32); // Gold
        pdf.setLineWidth(5);
        pdf.rect(25, 25, width - 50, height - 50);

        // --- Content ---

        // Header
        pdf.setFont("times", "bold");
        pdf.setFontSize(48);
        pdf.setTextColor(30, 30, 30);
        pdf.text("CERTIFICATE", width / 2, 100, { align: 'center' });

        pdf.setFontSize(18);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(100, 100, 100);
        pdf.text("OF ACHIEVEMENT", width / 2, 130, { align: 'center', charSpace: 3 });

        // Body Text
        pdf.setFontSize(14);
        pdf.setTextColor(60, 60, 60);
        pdf.text("This is to certify that", width / 2, 180, { align: 'center' });

        // Student Name
        pdf.setFont("times", "bolditalic");
        pdf.setFontSize(42);
        pdf.setTextColor(0, 0, 0);
        pdf.text(cert.studentName, width / 2, 230, { align: 'center' });

        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(1);
        pdf.line(width / 2 - 150, 240, width / 2 + 150, 240);

        // Participation Text
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(14);
        pdf.setTextColor(60, 60, 60);
        pdf.text("has successfully participated in the event", width / 2, 270, { align: 'center' });

        // Event Name
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(28);
        pdf.setTextColor(33, 150, 243); // Blue Theme
        pdf.text(cert.eventName, width / 2, 310, { align: 'center' });

        // Organized By
        const displayCollegeName = collegeName === 'Global_College' ? 'CMR Inst. of Technology' :
            (collegeName === 'MLRIT' ? 'MLR Inst. of Technology' : collegeName);

        pdf.setFont("times", "italic");
        pdf.setFontSize(16);
        pdf.setTextColor(40, 40, 40);
        pdf.text(`Organized by ${clubName}`, width / 2, 350, { align: 'center' });

        pdf.setFont("times", "bold");
        pdf.text(`at ${displayCollegeName}`, width / 2, 370, { align: 'center' });

        // Date
        const dateStr = new Date(cert.eventDate).toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' });
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(12);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Date: ${dateStr}`, width / 2, 400, { align: 'center' });

        // --- Signatures ---
        const sigY = 470;

        // Signature Lines
        pdf.setDrawColor(50, 50, 50);
        pdf.setLineWidth(1);
        pdf.line(150, sigY, 300, sigY);
        pdf.line(width - 300, sigY, width - 150, sigY);

        // Titles
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(12);
        pdf.setTextColor(0, 0, 0);
        pdf.text("Faculty Coordinator", 225, sigY + 20, { align: 'center' });
        pdf.text("Club President", width - 225, sigY + 20, { align: 'center' });

        // Footer ID (Verification)
        pdf.setFontSize(9);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Certificate ID: ${cert.id.substring(0, 8).toUpperCase()}  •  Verified by Linq`, width / 2, height - 30, { align: 'center' });

        pdf.save(`${cert.eventName}_Certificate.pdf`);
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
