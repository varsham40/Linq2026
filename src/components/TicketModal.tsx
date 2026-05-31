'use client';

import { Event, Registration } from '@/types';
import QRCode from 'react-qr-code';
import { useEffect, useState } from 'react';

/**
 * Reusable Ticket Modal Component
 * Displays a ticket with event details and a QR code.
 */
interface TicketModalProps {
    event: Event;
    reg: Registration;
    onClose: () => void;
    userDisplayName: string;
}

export default function TicketModal({ event, reg, onClose, userDisplayName }: TicketModalProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Trigger animation
        setIsVisible(true);

        // Lock body scroll
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'unset'; };
    }, []);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for animation
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999,
            opacity: isVisible ? 1 : 0,
            transition: 'opacity 0.3s ease'
        }} onClick={handleClose}>
            <div style={{
                position: 'relative', width: '320px',
                background: '#f4f4f5', borderRadius: '24px',
                overflow: 'hidden',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                fontFamily: 'var(--font-inter)',
                transform: isVisible ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(20px)',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }} onClick={e => e.stopPropagation()}>

                {/* Close Button X */}
                <button onClick={handleClose} style={{ position: 'absolute', top: '10px', right: '10px', width: '30px', height: '30px', background: '#000', color: '#fff', border: 'none', borderRadius: '50%', cursor: 'pointer', zIndex: 20 }}>✕</button>

                {/* Ticket Top */}
                <div style={{ background: '#fff', padding: '30px 24px', position: 'relative' }}>
                    <div style={{ fontSize: '0.7rem', color: '#71717a', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold', marginBottom: '8px' }}>Event Access</div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: '900', color: '#18181b', lineHeight: '1.1', marginBottom: '24px' }}>{event.title}</h2>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div>
                            <div style={{ fontSize: '0.7rem', color: '#a1a1aa', fontWeight: 'bold', marginBottom: '4px' }}>DATE</div>
                            <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#3f3f46' }}>{new Date(event.startTime).toLocaleDateString()}</div>
                        </div>
                        <div>
                            <div style={{ fontSize: '0.7rem', color: '#a1a1aa', fontWeight: 'bold', marginBottom: '4px' }}>TIME</div>
                            <div style={{ fontSize: '1rem', fontWeight: 'bold', color: '#3f3f46' }}>{new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                    </div>

                    {/* Left Cutout */}
                    <div style={{ position: 'absolute', bottom: '-10px', left: '-10px', width: '20px', height: '20px', background: '#09090b', borderRadius: '50%' }}></div>
                    {/* Right Cutout */}
                    <div style={{ position: 'absolute', bottom: '-10px', right: '-10px', width: '20px', height: '20px', background: '#09090b', borderRadius: '50%' }}></div>
                </div>

                {/* Perforated Line */}
                <div style={{ height: '2px', background: '#fff', backgroundImage: 'linear-gradient(to right, #ccc 50%, rgba(255,255,255,0) 0%)', backgroundSize: '10px 1px', backgroundRepeat: 'repeat-x' }}></div>

                {/* Ticket Bottom */}
                <div style={{ background: '#fff', padding: '30px 24px', textAlign: 'center', position: 'relative' }}>
                    <div style={{ background: '#fff', display: 'inline-block', padding: '10px', borderRadius: '12px', border: '2px solid #18181b', marginBottom: '16px' }}>
                        <div style={{ height: "auto", margin: "0 auto", maxWidth: 150, width: "100%" }}>
                            <QRCode
                                size={256}
                                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                value={`LINQ_TICKET:${reg.id}`}
                                viewBox={`0 0 256 256`}
                            />
                        </div>
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#18181b' }}>{userDisplayName}</div>
                    <div style={{ fontSize: '0.75rem', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold', marginTop: '4px' }}>Standard Ticket</div>

                    {/* Left Cutout */}
                    <div style={{ position: 'absolute', top: '-10px', left: '-10px', width: '20px', height: '20px', background: '#09090b', borderRadius: '50%' }}></div>
                    {/* Right Cutout */}
                    <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '20px', height: '20px', background: '#09090b', borderRadius: '50%' }}></div>
                </div>

                <div style={{ padding: '20px', textAlign: 'center' }}>
                    <button onClick={handleClose} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '12px 40px', borderRadius: '50px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)' }}>
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
