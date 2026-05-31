
import jsPDF from 'jspdf';
import { Event, Certificate } from '@/types';

/**
 * Generates and downloads a PDF certificate for an event.
 * Replicates a premium "Gold & Black" or "Professional" design.
 */
export const generateCertificatePDF = (certificate: Certificate, event: Event) => {
    // Create new PDF (landscape)
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    // Dimensions
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();

    // --- DESIGN ---

    // 1. Background
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, width, height, 'F');

    // 2. Decorative Border (Gold)
    const margin = 10;
    doc.setDrawColor(218, 165, 32); // Goldenrod
    doc.setLineWidth(2);
    doc.rect(margin, margin, width - (margin * 2), height - (margin * 2));

    // Inner thin border
    doc.setLineWidth(0.5);
    doc.rect(margin + 2, margin + 2, width - (margin * 2 + 4), height - (margin * 2 + 4));


    // 3. Header
    doc.setTextColor(30, 30, 30); // Dark Gray
    doc.setFont("helvetica", "bold");
    doc.setFontSize(36);
    doc.text("CERTIFICATE", width / 2, 50, { align: 'center' });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(16);
    doc.setTextColor(100, 100, 100);
    doc.text("OF PARTICIPATION", width / 2, 60, { align: 'center' });


    // 4. Body Content
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(14);
    doc.text("This certificate is proudly presented to", width / 2, 90, { align: 'center' });

    // Recipient Name (Large, Script-like if possible, otherwise Bold)
    doc.setFont("times", "bolditalic");
    doc.setFontSize(40);
    doc.setTextColor(218, 165, 32); // Gold Text
    doc.text(certificate.studentName || "Participant", width / 2, 110, { align: 'center' });

    // Underline name
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(width / 2 - 60, 115, width / 2 + 60, 115);


    // Description text
    doc.setFont("helvetica", "normal");
    doc.setFontSize(14);
    doc.setTextColor(50, 50, 50);
    doc.text("For successfully attending and participating in the event", width / 2, 135, { align: 'center' });

    // Event Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text(event.title, width / 2, 150, { align: 'center' });

    // Date & Venue
    const dateStr = new Date(event.startTime).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(`Held on ${dateStr}`, width / 2, 165, { align: 'center' });


    // 5. Footer / Signatures
    // Placeholder signatures
    const sigY = 185;

    // Left Signature (Club Lead / Admin)
    doc.setLineWidth(0.5);
    doc.line(40, sigY, 90, sigY);
    doc.setFontSize(10);
    doc.text("Event Organizer", 65, sigY + 8, { align: 'center' });

    // Right Signature (Principal / College)
    doc.line(width - 90, sigY, width - 40, sigY);
    doc.text("Authority Signature", width - 65, sigY + 8, { align: 'center' });

    // 6. Verification ID (Bottom Center)
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    const certId = certificate.id || "LINQ-CERT-000";
    doc.text(`Certificate ID: ${certId}`, width / 2, 200, { align: 'center' });
    doc.text("Verify at linq-platform.com/verify", width / 2, 205, { align: 'center' });


    // Save
    doc.save(`${event.title.replace(/\s+/g, '_')}_Certificate.pdf`);
};
