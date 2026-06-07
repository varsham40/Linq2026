'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Megaphone, X, Send } from 'lucide-react';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Club } from '@/types';
import Toast from '@/components/Toast';

export default function PostAnnouncementFAB() {
    const { user, profile } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [type, setType] = useState<'GENERAL' | 'URGENT' | 'EVENT'>('GENERAL');
    const [selectedClubId, setSelectedClubId] = useState('');
    const [clubs, setClubs] = useState<Club[]>([]);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    // Only show for these roles
    const canPost = profile && ['college_admin', 'club_admin', 'club_member'].includes(profile.role);

    useEffect(() => {
        if (!isOpen || !user) return;
        
        // Fetch clubs the user can post on behalf of.
        // For MVP, we'll just fetch all clubs and let them choose, or filter if they are admin.
        const fetchClubs = async () => {
            try {
                let q;
                if (profile?.role === 'college_admin') {
                    // College admin can post for any club in their college
                    q = query(collection(db, 'clubs'), where('collegeId', '==', profile.homeCollegeId));
                } else {
                    // For now, let's just fetch all clubs they might be an admin of
                    q = query(collection(db, 'clubs'), where('adminIds', 'array-contains', user.uid));
                }
                const snap = await getDocs(q);
                let loadedClubs = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Club[];
                
                // Fallback: If no clubs found (e.g. standard club_member), fetch all to let them pick (MVP shortcut)
                if (loadedClubs.length === 0) {
                    const allSnap = await getDocs(collection(db, 'clubs'));
                    loadedClubs = allSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Club[];
                }

                setClubs(loadedClubs);
                if (loadedClubs.length > 0) setSelectedClubId(loadedClubs[0].id);
            } catch (e) {
                console.error("Failed to fetch clubs", e);
            }
        };

        fetchClubs();
    }, [isOpen, user, profile]);

    if (!canPost) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !message.trim() || !selectedClubId) {
            setToast({ message: 'Please fill in all fields', type: 'error' });
            return;
        }

        const club = clubs.find(c => c.id === selectedClubId);
        if (!club) return;

        setLoading(true);
        try {
            await addDoc(collection(db, 'notifications'), {
                title,
                message,
                type,
                clubId: club.id,
                clubName: club.name,
                authorId: user?.uid,
                authorName: profile?.displayName || user?.displayName || 'Admin',
                createdAt: Date.now()
            });

            setToast({ message: 'Announcement posted! 🚀', type: 'success' });
            setIsOpen(false);
            setTitle('');
            setMessage('');
            setType('GENERAL');
        } catch (error) {
            setToast({ message: 'Failed to post announcement', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            
            {/* FAB */}
            <button 
                className="fab-announcement"
                onClick={() => setIsOpen(true)}
                style={{
                    position: 'fixed',
                    bottom: '100px',
                    right: '30px',
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                    color: '#fff',
                    border: 'none',
                    boxShadow: '0 8px 32px rgba(139, 92, 246, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    zIndex: 999,
                    transition: 'transform 0.2s, box-shadow 0.2s'
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-5px) scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 12px 40px rgba(139, 92, 246, 0.6)';
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.boxShadow = '0 8px 32px rgba(139, 92, 246, 0.4)';
                }}
                title="Post Announcement"
            >
                <Megaphone size={24} />
            </button>

            {/* Modal */}
            {isOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div style={{
                        background: 'var(--card-bg)',
                        border: '1px solid var(--card-border)',
                        borderRadius: '24px',
                        width: '100%',
                        maxWidth: '500px',
                        boxShadow: 'var(--card-glow)',
                        overflow: 'hidden'
                    }}>
                        <div style={{ padding: '24px', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg)' }}>
                            <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--fg)', fontSize: '1.4rem' }}>
                                <Megaphone size={24} color="var(--primary)" />
                                Broadcast Message
                            </h2>
                            <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                                <X size={24} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '8px' }}>Post As (Club)</label>
                                <select 
                                    value={selectedClubId}
                                    onChange={e => setSelectedClubId(e.target.value)}
                                    style={{ width: '100%', padding: '12px 16px', background: 'var(--input-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', color: 'var(--fg)', fontSize: '1rem', outline: 'none' }}
                                    required
                                >
                                    {clubs.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '8px' }}>Announcement Type</label>
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    {(['GENERAL', 'EVENT', 'URGENT'] as const).map(t => (
                                        <button
                                            key={t}
                                            type="button"
                                            onClick={() => setType(t)}
                                            style={{
                                                flex: 1,
                                                padding: '10px',
                                                borderRadius: '10px',
                                                border: `1px solid ${type === t ? (t === 'URGENT' ? '#ef4444' : t === 'EVENT' ? '#8b5cf6' : '#3b82f6') : 'var(--card-border)'}`,
                                                background: type === t ? (t === 'URGENT' ? 'rgba(239, 68, 68, 0.1)' : t === 'EVENT' ? 'rgba(139, 92, 246, 0.1)' : 'rgba(59, 130, 246, 0.1)') : 'var(--input-bg)',
                                                color: type === t ? (t === 'URGENT' ? '#ef4444' : t === 'EVENT' ? '#8b5cf6' : '#3b82f6') : 'var(--text-muted)',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                transition: 'all 0.2s'
                                            }}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '8px' }}>Headline</label>
                                <input 
                                    type="text"
                                    placeholder="e.g. Hackathon Registration Now Open!"
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    maxLength={60}
                                    style={{ width: '100%', padding: '12px 16px', background: 'var(--input-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', color: 'var(--fg)', fontSize: '1rem', outline: 'none' }}
                                    required
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '8px' }}>Message</label>
                                <textarea 
                                    placeholder="Write your announcement here..."
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    style={{ width: '100%', height: '120px', padding: '16px', background: 'var(--input-bg)', border: '1px solid var(--card-border)', borderRadius: '12px', color: 'var(--fg)', fontSize: '1rem', resize: 'none', outline: 'none' }}
                                    required
                                />
                            </div>

                            <button 
                                type="submit"
                                disabled={loading}
                                style={{
                                    marginTop: '10px',
                                    padding: '16px',
                                    background: 'var(--primary)',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontWeight: 'bold',
                                    fontSize: '1.1rem',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    opacity: loading ? 0.7 : 1,
                                    transition: 'background 0.2s'
                                }}
                            >
                                <Send size={20} />
                                {loading ? 'Broadcasting...' : 'Broadcast to All Students'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
