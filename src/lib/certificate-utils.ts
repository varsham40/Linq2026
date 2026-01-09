import jsPDF from 'jspdf';
import { Certificate } from '@/types';

export const downloadCertificatePDF = (cert: Certificate) => {
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

    doc.save(`${cert.eventName.replace(/[^a-z0-9]/gi, '_')}_Certificate.pdf`);
};
