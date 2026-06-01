'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Event } from '@/types';
import Navbar from '@/components/Navbar';
import Toast from '@/components/Toast';
import { ArrowLeft, Save, Plus, Trash2, Settings, FileText, Link as LinkIcon, Type } from 'lucide-react';
import Link from 'next/link';

export default function SubmissionConfigPage({ params }: { params: Promise<{ eventId: string }> }) {
    const { eventId } = React.use(params);
    const { user, profile } = useAuth();
    const router = useRouter();
    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    const [isOpen, setIsOpen] = useState(false);
    const [deadline, setDeadline] = useState<string>('');
    const [fields, setFields] = useState<{ id: string, label: string, type: 'text' | 'url', required: boolean }[]>([]);

    useEffect(() => {
        if (!user) return;
        const fetchEvent = async () => {
            try {
                const docRef = doc(db, 'events', eventId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = { id: docSnap.id, ...docSnap.data() } as Event;
                    setEvent(data);
                    
                    if (data.submissionConfig) {
                        setIsOpen(data.submissionConfig.isOpen);
                        if (data.submissionConfig.deadline) {
                            // Format timestamp to YYYY-MM-DDThh:mm for input
                            const date = new Date(data.submissionConfig.deadline);
                            const pad = (n: number) => n.toString().padStart(2, '0');
                            setDeadline(`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`);
                        }
                        setFields(data.submissionConfig.fields || []);
                    } else {
                        // Default fields
                        setFields([
                            { id: 'projectName', label: 'Project Name', type: 'text', required: true },
                            { id: 'githubUrl', label: 'GitHub Repository URL', type: 'url', required: true },
                            { id: 'demoUrl', label: 'Live Demo URL', type: 'url', required: false }
                        ]);
                        // Default deadline: event end time + 24 hours
                        const defaultEnd = new Date(data.endTime + 24 * 60 * 60 * 1000);
                        const pad = (n: number) => n.toString().padStart(2, '0');
                        setDeadline(`${defaultEnd.getFullYear()}-${pad(defaultEnd.getMonth() + 1)}-${pad(defaultEnd.getDate())}T${pad(defaultEnd.getHours())}:${pad(defaultEnd.getMinutes())}`);
                    }
                }
            } catch (err) {
                console.error(err);
                setToast({ message: 'Failed to load event data', type: 'error' });
            } finally {
                setLoading(false);
            }
        };
        fetchEvent();
    }, [user, eventId]);

    const handleSave = async () => {
        if (!event) return;
        if (!deadline) {
            setToast({ message: 'Please select a deadline', type: 'error' });
            return;
        }

        setSaving(true);
        try {
            const deadlineTimestamp = new Date(deadline).getTime();
            await updateDoc(doc(db, 'events', event.id), {
                submissionConfig: {
                    isOpen,
                    deadline: deadlineTimestamp,
                    fields
                }
            });
            setToast({ message: 'Submission configuration saved!', type: 'success' });
        } catch (err) {
            console.error(err);
            setToast({ message: 'Failed to save configuration', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const addField = () => {
        const newId = 'field_' + Date.now() + Math.random().toString(36).substr(2, 5);
        setFields(prev => [...prev, { id: newId, label: 'New Field', type: 'text', required: false }]);
    };

    const removeField = (id: string) => {
        setFields(prev => prev.filter(f => f.id !== id));
    };

    const updateField = (id: string, updates: any) => {
        setFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    };

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

    const inputStyle = {
        width: '100%', padding: '12px 16px', backgroundColor: 'var(--bg)',
        border: '1px solid var(--card-border)', borderRadius: '12px', color: 'var(--fg)', fontSize: '0.95rem'
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', color: 'var(--fg)', fontFamily: 'var(--font-inter)' }}>
            <Navbar />
            <main style={{ maxWidth: '800px', margin: '0 auto', padding: '100px 24px 80px' }}>
                <Link href={profile?.role === 'club_member' ? '/dashboard/club-member' : '/dashboard/club-admin'} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', textDecoration: 'none', marginBottom: '24px', fontWeight: 'bold' }}>
                    <ArrowLeft size={18} /> Back to Dashboard
                </Link>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
                    <div style={{ padding: '16px', background: 'var(--hover-bg)', borderRadius: '16px', color: '#fb923c' }}>
                        <Settings size={32} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '2rem', fontWeight: '900', fontFamily: 'var(--font-outfit)' }}>Configure Submissions</h1>
                        <p style={{ color: 'var(--text-muted)' }}>For: {event.title}</p>
                    </div>
                </div>

                <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '24px', padding: '32px', marginBottom: '32px', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
                    
                    {/* General Settings */}
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '24px', borderBottom: '1px solid var(--card-border)', paddingBottom: '12px' }}>General Settings</h3>
                    
                    <div style={{ display: 'flex', gap: '24px', marginBottom: '32px', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-muted)' }}>Status</label>
                            <button
                                onClick={() => setIsOpen(!isOpen)}
                                style={{
                                    width: '100%', padding: '12px', borderRadius: '12px', fontWeight: 'bold', fontSize: '1rem',
                                    border: isOpen ? '1px solid #10b981' : '1px solid var(--card-border)',
                                    background: isOpen ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg)',
                                    color: isOpen ? '#10b981' : 'var(--text-muted)',
                                    cursor: 'pointer', transition: 'all 0.2s'
                                }}
                            >
                                {isOpen ? '🟢 Submissions are OPEN' : '🔴 Submissions are CLOSED'}
                            </button>
                        </div>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                            <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '8px', color: 'var(--text-muted)' }}>Submission Deadline</label>
                            <input 
                                type="datetime-local" 
                                value={deadline} 
                                onChange={(e) => setDeadline(e.target.value)}
                                style={inputStyle}
                            />
                        </div>
                    </div>

                    {/* Form Fields Config */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid var(--card-border)', paddingBottom: '12px' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Submission Form Fields</h3>
                        <button type="button" onClick={addField} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: 'var(--hover-bg)', color: 'var(--fg)', borderRadius: '12px', border: '1px solid var(--card-border)', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', zIndex: 10 }}>
                            <Plus size={16} /> Add Field
                        </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '32px' }}>
                        {fields.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>No fields added. Add some fields for participants to submit.</p>}
                        
                        {fields.map((field, index) => (
                            <div key={field.id} style={{ background: 'var(--bg)', border: '1px solid var(--card-border)', borderRadius: '16px', padding: '20px', position: 'relative' }}>
                                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                                    <div style={{ flex: 2, minWidth: '250px' }}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '6px', color: 'var(--text-muted)' }}>Field Label</label>
                                        <input 
                                            type="text" 
                                            value={field.label} 
                                            onChange={(e) => updateField(field.id, { label: e.target.value })}
                                            style={inputStyle}
                                            placeholder="e.g. GitHub Link"
                                        />
                                    </div>
                                    <div style={{ flex: 1, minWidth: '150px' }}>
                                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '6px', color: 'var(--text-muted)' }}>Field Type</label>
                                        <select 
                                            value={field.type} 
                                            onChange={(e) => updateField(field.id, { type: e.target.value })}
                                            style={inputStyle}
                                        >
                                            <option value="text">Text input</option>
                                            <option value="url">URL Link</option>
                                        </select>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '26px' }}>
                                        <input 
                                            type="checkbox" 
                                            id={`req_${field.id}`}
                                            checked={field.required}
                                            onChange={(e) => updateField(field.id, { required: e.target.checked })}
                                            style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                        />
                                        <label htmlFor={`req_${field.id}`} style={{ fontSize: '0.9rem', cursor: 'pointer', userSelect: 'none' }}>Required</label>
                                    </div>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => removeField(field.id)}
                                    style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', zIndex: 10 }}
                                    title="Remove Field"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <button 
                        onClick={handleSave} 
                        disabled={saving}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '16px', background: 'var(--primary)', color: '#fff', borderRadius: '16px', fontWeight: 'bold', fontSize: '1.1rem', border: 'none', cursor: 'pointer', boxShadow: '0 8px 24px rgba(139, 92, 246, 0.3)', transition: 'transform 0.2s' }}
                    >
                        <Save size={20} />
                        {saving ? 'Saving...' : 'Save Submission Configuration'}
                    </button>
                </div>
            </main>
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
