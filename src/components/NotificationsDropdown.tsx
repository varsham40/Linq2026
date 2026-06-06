'use client';
import { useState, useEffect, useRef } from 'react';
import { Bell, X, Info, AlertCircle, Calendar } from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Notification } from '@/types';
import { useAuth } from '@/lib/auth-context';

export default function NotificationsDropdown() {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [clearedIds, setClearedIds] = useState<string[]>([]);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Initialize clearedIds from localStorage
    useEffect(() => {
        if (user) {
            setClearedIds(JSON.parse(localStorage.getItem(`linq_cleared_notifications_${user.uid}`) || '[]'));
        }
    }, [user]);

    // Click outside to close
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Listen to notifications
    useEffect(() => {
        const q = query(
            collection(db, 'notifications'),
            orderBy('createdAt', 'desc'),
            limit(20)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Notification[];
            setNotifications(fetched);

            // Calculate unread count
            const lastRead = localStorage.getItem(`linq_last_read_notifications_${user?.uid}`) || '0';
            const lastReadTime = parseInt(lastRead, 10);
            const cleared = JSON.parse(localStorage.getItem(`linq_cleared_notifications_${user?.uid}`) || '[]');
            const count = fetched.filter(n => n.createdAt > lastReadTime && !cleared.includes(n.id)).length;
            setUnreadCount(count);
        });

        return () => unsubscribe();
    }, [user]);

    const handleClear = (id: string) => {
        if (!user) return;
        const updated = [...clearedIds, id];
        setClearedIds(updated);
        localStorage.setItem(`linq_cleared_notifications_${user.uid}`, JSON.stringify(updated));
        
        // Update unread count if we clear an unread message
        const lastRead = parseInt(localStorage.getItem(`linq_last_read_notifications_${user.uid}`) || '0', 10);
        const notif = notifications.find(n => n.id === id);
        if (notif && notif.createdAt > lastRead) {
            setUnreadCount(prev => Math.max(0, prev - 1));
        }
    };

    const handleClearAll = () => {
        if (!user) return;
        const allIds = notifications.map(n => n.id);
        const updated = Array.from(new Set([...clearedIds, ...allIds]));
        setClearedIds(updated);
        localStorage.setItem(`linq_cleared_notifications_${user.uid}`, JSON.stringify(updated));
        setUnreadCount(0);
    };

    const visibleNotifications = notifications.filter(n => !clearedIds.includes(n.id));

    const handleOpen = () => {
        setIsOpen(!isOpen);
        if (!isOpen && user) {
            // Marking as read when opened
            localStorage.setItem(`linq_last_read_notifications_${user.uid}`, Date.now().toString());
            setUnreadCount(0);
        }
    };

    const getIconForType = (type: string) => {
        switch (type) {
            case 'URGENT': return <AlertCircle size={18} color="#ef4444" />;
            case 'EVENT': return <Calendar size={18} color="#8b5cf6" />;
            default: return <Info size={18} color="#3b82f6" />;
        }
    };

    const getBorderColorForType = (type: string) => {
        switch (type) {
            case 'URGENT': return 'rgba(239, 68, 68, 0.3)';
            case 'EVENT': return 'rgba(139, 92, 246, 0.3)';
            default: return 'rgba(59, 130, 246, 0.3)';
        }
    };

    return (
        <div style={{ position: 'relative' }} ref={dropdownRef}>
            <button 
                onClick={handleOpen} 
                style={{ 
                    background: 'var(--hover-bg)', 
                    border: '1px solid var(--glass-border)', 
                    color: 'var(--fg)', 
                    width: '36px', 
                    height: '36px', 
                    borderRadius: '50%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    cursor: 'pointer', 
                    transition: 'background 0.2s',
                    position: 'relative'
                }}
            >
                <Bell size={18} />
                {unreadCount > 0 && (
                    <span style={{ 
                        position: 'absolute', 
                        top: '-2px', 
                        right: '-2px', 
                        background: '#ef4444', 
                        color: '#fff', 
                        fontSize: '0.65rem', 
                        fontWeight: 'bold', 
                        width: '16px', 
                        height: '16px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        borderRadius: '50%',
                        boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)'
                    }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="notifications-dropdown" style={{
                    position: 'absolute',
                    top: '50px',
                    right: '-10px',
                    width: '380px',
                    maxWidth: '100vw',
                    maxHeight: '80vh',
                    background: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                    borderRadius: '24px',
                    boxShadow: 'var(--card-glow)',
                    zIndex: 1000,
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg)' }}>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--fg)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Bell size={20} color="#8b5cf6" />
                            Notifications
                        </h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {visibleNotifications.length > 0 && (
                                <button onClick={handleClearAll} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>
                                    Clear All
                                </button>
                            )}
                            <button onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    <div style={{ overflowY: 'auto', flex: 1, padding: '12px' }}>
                        {visibleNotifications.length === 0 ? (
                            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                <Bell size={32} style={{ opacity: 0.3, marginBottom: '12px' }} />
                                <p style={{ margin: 0, fontSize: '0.95rem' }}>No new notifications.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {visibleNotifications.map(notif => (
                                    <div key={notif.id} style={{
                                        background: 'var(--input-bg)',
                                        border: `1px solid ${getBorderColorForType(notif.type)}`,
                                        borderRadius: '16px',
                                        padding: '16px',
                                        transition: 'transform 0.2s',
                                        position: 'relative'
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {getIconForType(notif.type)}
                                                <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                    {notif.clubName}
                                                </span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                    {new Date(notif.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                </span>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleClear(notif.id); }}
                                                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex' }}
                                                    title="Clear message"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        <h4 style={{ margin: '0 0 6px 0', fontSize: '1.05rem', color: 'var(--fg)', fontWeight: 'bold' }}>
                                            {notif.title}
                                        </h4>
                                        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
                                            {notif.message}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
