'use client';

import { useEffect, useState, use } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Event } from '@/types';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { Heart, Quote, Trophy, Sparkles, Download, Maximize2, X, ArrowLeft, Image as ImageIcon } from 'lucide-react';

export default function WallOfLovePage({ params }: { params: Promise<{ eventId: string }> }) {
    const { eventId } = use(params);
    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    
    // Modal states
    const [viewAllFeedback, setViewAllFeedback] = useState(false);
    const [viewAllImages, setViewAllImages] = useState(false);

    useEffect(() => {
        if (!eventId) return;
        const fetchData = async () => {
            try {
                const snap = await getDoc(doc(db, 'events', eventId));
                if (snap.exists()) setEvent({ id: snap.id, ...snap.data() } as Event);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [eventId]);

    if (loading) return <div className="min-h-screen grid place-items-center" style={{ backgroundColor: 'var(--bg)', color: 'var(--fg)' }}>Loading Wall of Love...</div>;
    if (!event || !(event as any).recapData?.published) return <div className="min-h-screen grid place-items-center" style={{ backgroundColor: 'var(--bg)', color: 'var(--fg)' }}>Wall of Love not available.</div>;

    const recapData = (event as any).recapData;
    const hasFeedback = recapData.curatedFeedback && recapData.curatedFeedback.length > 0;
    const hasImages = recapData.images && recapData.images.length > 0;

    // Helper to duplicate arrays for infinite marquee loop
    const duplicatedFeedback = hasFeedback ? [...recapData.curatedFeedback, ...recapData.curatedFeedback] : [];
    const duplicatedImages = hasImages ? [...recapData.images, ...recapData.images] : [];

    const handleDownload = (url: string) => {
        // Since cross-origin Firebase storage URLs can sometimes block native <a> downloads, 
        // opening in a new tab is a reliable fallback. If we want a direct download we could fetch the blob.
        window.open(url, '_blank');
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', color: 'var(--fg)', fontFamily: 'var(--font-inter)', position: 'relative', overflowX: 'hidden' }}>
            <Navbar />

            {/* Pouring Hearts Animation Background */}
            <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
                {[...Array(20)].map((_, i) => {
                    const left = Math.random() * 100;
                    const delay = Math.random() * 10;
                    const duration = 10 + Math.random() * 10;
                    const size = 10 + Math.random() * 20;
                    return (
                        <div key={i} className="heart-particle" style={{ left: `${left}%`, animationDelay: `${delay}s`, animationDuration: `${duration}s`, fontSize: `${size}px` }}>
                            ❤️
                        </div>
                    );
                })}
            </div>

            <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '60px 24px 80px', position: 'relative', zIndex: 10 }}>
                
                {/* Back Button */}
                <Link href={`/events/${eventId}`} style={{ position: 'absolute', top: '24px', left: '24px', display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--primary)', textDecoration: 'none', fontWeight: 'bold', background: 'var(--hover-bg)', padding: '10px 20px', borderRadius: '12px', transition: 'background 0.2s', border: '1px solid var(--card-border)' }}>
                    <ArrowLeft size={18} /> Back to Event
                </Link>

                {/* Header Section */}
                <div style={{ textAlign: 'center', marginBottom: '80px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', borderRadius: '24px', background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', color: '#fff', marginBottom: '24px', boxShadow: '0 8px 32px rgba(236, 72, 153, 0.4)' }}>
                        <Sparkles size={40} />
                    </div>
                    <h1 style={{ fontSize: '4rem', fontWeight: '900', fontFamily: 'var(--font-outfit)', marginBottom: '24px', color: '#ec4899' }}>
                        Wall of Love
                    </h1>
                    <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', maxWidth: '800px', margin: '0 auto', lineHeight: '1.8' }}>
                        {recapData.eventSummary}
                    </p>
                </div>

                {/* Hall of Fame */}
                {recapData.winnerShoutouts && (
                    <div style={{ marginBottom: '80px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px', justifyContent: 'center' }}>
                            <Trophy size={28} color="#eab308" />
                            <h2 style={{ fontSize: '2rem', fontWeight: 'bold', fontFamily: 'var(--font-outfit)', margin: 0, color: 'var(--fg)' }}>Hall of Fame</h2>
                        </div>
                        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--primary)', borderRadius: '24px', padding: '40px', boxShadow: '0 8px 32px rgba(139, 92, 246, 0.15)', backdropFilter: 'blur(10px)', textAlign: 'center' }}>
                            <div style={{ fontSize: '2rem', marginBottom: '16px' }}>🌟 👑 🚀</div>
                            <p style={{ whiteSpace: 'pre-line', fontSize: '1.2rem', color: 'var(--fg)', lineHeight: '2' }}>
                                {recapData.winnerShoutouts}
                            </p>
                        </div>
                    </div>
                )}

                {/* Love Notes (Feedback) */}
                {hasFeedback && (
                    <div style={{ marginBottom: '80px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Quote size={28} color="#ec4899" />
                                <h2 style={{ fontSize: '2rem', fontWeight: 'bold', fontFamily: 'var(--font-outfit)', margin: 0, color: 'var(--fg)' }}>Attendee Feedback</h2>
                            </div>
                            <button onClick={() => setViewAllFeedback(true)} style={{ background: 'var(--hover-bg)', border: '1px solid var(--card-border)', color: 'var(--fg)', padding: '8px 20px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.9rem' }}>
                                VIEW ALL
                            </button>
                        </div>

                        {/* Marquee Wrapper */}
                        <div className="marquee-wrapper">
                            <div className="marquee-content">
                                {duplicatedFeedback.map((fb: any, idx: number) => (
                                    <div key={idx} style={{ minWidth: '400px', maxWidth: '400px', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '20px', padding: '32px', display: 'flex', flexDirection: 'column', backdropFilter: 'blur(10px)', transition: 'transform 0.2s', cursor: 'default', whiteSpace: 'normal' }}
                                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-5px)'}
                                        onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                                    >
                                        <Quote size={24} color="#ec4899" style={{ marginBottom: '20px', opacity: 0.6 }} />
                                        <p style={{ fontSize: '1.1rem', color: 'var(--fg)', lineHeight: '1.8', fontStyle: 'italic', margin: 0, whiteSpace: 'pre-wrap' }}>"{fb.quote}"</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Event Memories (Images) */}
                {hasImages && (
                    <div style={{ marginBottom: '80px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <ImageIcon size={28} color="#10b981" />
                                <h2 style={{ fontSize: '2rem', fontWeight: 'bold', fontFamily: 'var(--font-outfit)', margin: 0, color: 'var(--fg)' }}>Event Memories</h2>
                            </div>
                            <button onClick={() => setViewAllImages(true)} style={{ background: 'var(--hover-bg)', border: '1px solid var(--card-border)', color: 'var(--fg)', padding: '8px 20px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.9rem' }}>
                                VIEW ALL
                            </button>
                        </div>

                        {/* Marquee Wrapper */}
                        <div className="marquee-wrapper">
                            <div className="marquee-content" style={{ animationDuration: '40s' }}>
                                {duplicatedImages.map((img: string, idx: number) => (
                                    <div key={idx} className="memory-card" style={{ minWidth: '350px', height: '250px', borderRadius: '24px', overflow: 'hidden', position: 'relative', border: '1px solid rgba(255,255,255,0.1)' }}>
                                        <img src={img} alt={`Memory ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        <div className="memory-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', opacity: 0, transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <button onClick={() => handleDownload(img)} style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', color: '#fff', width: '50px', height: '50px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(4px)' }} title="Download Image">
                                                <Download size={24} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* View All Feedback Modal */}
            {viewAllFeedback && (
                <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', backdropFilter: 'blur(20px)', zIndex: 9999, overflowY: 'auto', padding: '40px 24px' }}>
                    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                            <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: 0, color: 'var(--fg)' }}>Attendee Feedback</h2>
                            <button onClick={() => setViewAllFeedback(false)} style={{ background: 'var(--hover-bg)', border: '1px solid var(--card-border)', color: 'var(--fg)', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
                            {recapData.curatedFeedback.map((fb: any, idx: number) => (
                                <div key={idx} style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '20px', padding: '32px', display: 'flex', flexDirection: 'column' }}>
                                    <Quote size={24} color="#ec4899" style={{ marginBottom: '20px', opacity: 0.6 }} />
                                    <p style={{ fontSize: '1.1rem', color: 'var(--fg)', lineHeight: '1.8', fontStyle: 'italic', margin: 0, whiteSpace: 'pre-wrap' }}>"{fb.quote}"</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* View All Images Modal */}
            {viewAllImages && (
                <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', backdropFilter: 'blur(20px)', zIndex: 9999, overflowY: 'auto', padding: '40px 24px' }}>
                    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                            <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: 0, color: 'var(--fg)' }}>All Memories</h2>
                            <button onClick={() => setViewAllImages(false)} style={{ background: 'var(--hover-bg)', border: '1px solid var(--card-border)', color: 'var(--fg)', width: '48px', height: '48px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                            {recapData.images.map((img: string, idx: number) => (
                                <div key={idx} style={{ borderRadius: '24px', overflow: 'hidden', height: '250px', position: 'relative', border: '1px solid rgba(255,255,255,0.1)' }} className="memory-card">
                                    <img src={img} alt={`Memory ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <div className="memory-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', opacity: 0, transition: 'opacity 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <button onClick={() => handleDownload(img)} style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', color: '#fff', width: '50px', height: '50px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(4px)' }} title="Download Image">
                                            <Download size={24} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{__html: `
                @keyframes fall {
                    0% { transform: translateY(-10vh) rotate(0deg); opacity: 0; }
                    10% { opacity: 0.5; }
                    90% { opacity: 0.5; }
                    100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
                }
                .heart-particle { 
                    position: absolute; top: 0; color: rgba(236, 72, 153, 0.3); 
                    animation-name: fall; animation-timing-function: linear; animation-iteration-count: infinite; 
                }
                
                @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(calc(-50% - 12px)); }
                }
                .marquee-wrapper {
                    width: 100vw;
                    margin-left: calc(-50vw + 50%);
                    overflow: hidden;
                    white-space: nowrap;
                    padding: 10px 0;
                }
                .marquee-content {
                    display: inline-flex;
                    gap: 24px;
                    animation: marquee 30s linear infinite;
                    padding-left: 24px;
                }
                .marquee-wrapper:hover .marquee-content {
                    animation-play-state: paused;
                }

                .memory-card:hover .memory-overlay {
                    opacity: 1 !important;
                }
            `}} />
        </div>
    );
}
