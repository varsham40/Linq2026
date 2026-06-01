'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { Event, ProjectSubmission } from '@/types';
import Navbar from '@/components/Navbar';
import Toast from '@/components/Toast';
import { ArrowLeft, FolderOpen, ExternalLink, Clock, Users, User, Search } from 'lucide-react';
import Link from 'next/link';

export default function SubmissionViewPage({ params }: { params: Promise<{ eventId: string }> }) {
    const { eventId } = React.use(params);
    const { user, profile } = useAuth();
    const router = useRouter();
    const [event, setEvent] = useState<Event | null>(null);
    const [submissions, setSubmissions] = useState<ProjectSubmission[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (!user) return;
        const fetchData = async () => {
            try {
                // Fetch Event
                const docRef = doc(db, 'events', eventId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setEvent({ id: docSnap.id, ...docSnap.data() } as Event);
                }

                // Fetch Submissions
                const subRef = collection(db, `events/${eventId}/submissions`);
                const subSnap = await getDocs(subRef);
                const subList = subSnap.docs.map(d => ({ id: d.id, ...d.data() } as ProjectSubmission));
                // Sort by newest first
                subList.sort((a, b) => b.submittedAt - a.submittedAt);
                setSubmissions(subList);

            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user, eventId]);

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
                <div style={{ width: '40px', height: '40px', border: '4px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
            </div>
        );
    }

    if (!event) {
        return <div style={{ padding: '40px', color: 'red', textAlign: 'center' }}>Event not found.</div>;
    }

    const filteredSubmissions = submissions.filter(s => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (s.teamName?.toLowerCase().includes(q) || s.submitterName?.toLowerCase().includes(q) || Object.values(s.data).some(val => val.toLowerCase().includes(q)));
    });

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', color: 'var(--fg)', fontFamily: 'var(--font-inter)' }}>
            <Navbar />
            <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '100px 24px 80px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                            <Link href={profile?.role === 'club_member' ? '/dashboard/club-member' : '/dashboard/club-admin'} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: '24px', fontWeight: 'bold' }}>
                                <ArrowLeft size={18} /> Back to Dashboard
                            </Link>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ padding: '16px', background: 'var(--hover-bg)', borderRadius: '16px', color: '#ec4899' }}>
                                <FolderOpen size={32} />
                            </div>
                            <div>
                                <h1 style={{ fontSize: '2rem', fontWeight: '900', fontFamily: 'var(--font-outfit)' }}>Project Submissions</h1>
                                <p style={{ color: 'var(--text-muted)' }}>{event.title}</p>
                            </div>
                        </div>
                    </div>

                    <div style={{ position: 'relative', width: '300px' }}>
                        <Search style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={18} />
                        <input
                            type="text"
                            placeholder="Search submissions..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            style={{ width: '100%', padding: '12px 16px 12px 44px', background: 'var(--input-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', color: 'var(--fg)', outline: 'none', fontSize: '0.95rem' }}
                        />
                    </div>
                </div>

                {filteredSubmissions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '80px 20px', background: 'var(--card-bg)', border: '1px dashed var(--card-border)', borderRadius: '24px', color: 'var(--text-muted)' }}>
                        <FolderOpen size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '8px', color: 'var(--fg)' }}>No submissions found</h3>
                        <p>{submissions.length === 0 ? "No one has submitted a project yet." : "No submissions matched your search."}</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
                        {filteredSubmissions.map(sub => (
                            <div key={sub.id} style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s, box-shadow 0.2s' }}
                                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(0,0,0,0.1)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: 'var(--hover-bg)', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--fg)' }}>
                                        {sub.isTeamSubmission ? <Users size={14} color="#a855f7" /> : <User size={14} color="#3b82f6" />}
                                        {sub.isTeamSubmission ? `Team: ${sub.teamName}` : `Solo: ${sub.submitterName}`}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                        <Clock size={12} />
                                        {new Date(sub.submittedAt).toLocaleDateString()}
                                    </div>
                                </div>

                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {event.submissionConfig?.fields?.map(field => {
                                        const val = sub.data[field.id];
                                        if (!val) return null;
                                        
                                        const isUrl = field.type === 'url' || val.startsWith('http://') || val.startsWith('https://');

                                        return (
                                            <div key={field.id}>
                                                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '4px', letterSpacing: '0.5px' }}>
                                                    {field.label}
                                                </div>
                                                {isUrl ? (
                                                    <a href={val.startsWith('http') ? val : `https://${val}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--primary)', fontWeight: 'bold', textDecoration: 'none', wordBreak: 'break-all', fontSize: '0.9rem' }}>
                                                        {val} <ExternalLink size={14} />
                                                    </a>
                                                ) : (
                                                    <div style={{ fontSize: '0.95rem', color: 'var(--fg)', wordBreak: 'break-word', background: 'var(--input-bg)', padding: '12px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                                                        {val}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                
                                {sub.isTeamSubmission && (
                                    <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--card-border)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                        Submitted by: <span style={{ fontWeight: 'bold', color: 'var(--fg)' }}>{sub.submitterName}</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
