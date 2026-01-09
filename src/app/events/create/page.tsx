'use client';

import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchMyClub } from '@/lib/club-utils';
import { Club, EventScope } from '@/types';
import Navbar from '@/components/Navbar';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function CreateEventPage() {
    const { user } = useAuth();
    const router = useRouter();

    const [club, setClub] = useState<Club | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        scope: 'COLLEGE_ONLY' as EventScope,
        startDate: '',
        startTime: '',
        endDate: '',
        endTime: '',
        venue: '',
        posterURL: ''
    });

    useEffect(() => {
        if (!user) return;
        fetchMyClub(user.uid).then((c) => {
            if (!c) {
                alert("You need to register a club first.");
                router.push('/dashboard/club-admin');
                return;
            }
            setClub(c);
            setLoading(false);
        });
    }, [user, router]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async () => {
        if (!club || !user) return;

        // Basic Validation
        if (!formData.title || !formData.startDate || !formData.venue) {
            alert("Please fill all required fields.");
            return;
        }

        setSaving(true);

        try {
            // Construct Timestamps
            const startTimestamp = new Date(`${formData.startDate}T${formData.startTime}`).getTime();
            const endTimestamp = new Date(`${formData.endDate}T${formData.endTime}`).getTime();

            const eventData = {
                clubId: club.id,
                collegeId: club.collegeId,
                title: formData.title,
                description: formData.description,
                scope: formData.scope,
                startTime: startTimestamp,
                endTime: endTimestamp,
                venue: formData.venue,
                posterURL: formData.posterURL,
                createdBy: user.uid,
                createdAt: Date.now(),
                attendeeCount: 0
            };

            await addDoc(collection(db, 'events'), eventData);
            router.push('/dashboard/club-admin');

        } catch (error) {
            console.error("Error creating event:", error);
            alert("Failed to create event.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>;

    const inputStyle = {
        width: '100%',
        padding: '12px 16px',
        backgroundColor: '#121214',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        color: '#fff',
        outline: 'none',
        fontSize: '0.95rem',
        transition: 'border-color 0.2s',
        marginTop: '8px'
    };

    const labelStyle = {
        display: 'block',
        fontSize: '0.9rem',
        fontWeight: '600',
        color: 'rgba(255,255,255,0.7)'
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#09090b', color: '#fff', fontFamily: 'var(--font-inter)' }}>
            <Navbar />
            <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 24px', paddingTop: '140px', paddingBottom: '80px' }}>

                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '40px' }}>

                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '10px' }}>Host New Event</h1>
                    <p style={{ opacity: 0.6, marginBottom: '40px' }}>Organization: <span style={{ color: '#3b82f6', fontWeight: 'bold' }}>{club?.name}</span></p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                        {/* Title */}
                        <div>
                            <label style={labelStyle}>Event Title *</label>
                            <input name="title" style={inputStyle} placeholder="e.g. Hackathon 2026" onChange={handleChange} value={formData.title} />
                        </div>

                        {/* Scope & Venue */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                            <div>
                                <label style={labelStyle}>Scope</label>
                                <select name="scope" style={inputStyle} onChange={handleChange} value={formData.scope}>
                                    <option value="COLLEGE_ONLY">College Only</option>
                                    <option value="GLOBAL">Global (All Colleges)</option>
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Venue *</label>
                                <input name="venue" style={inputStyle} placeholder="e.g. Auditorium" onChange={handleChange} value={formData.venue} />
                            </div>
                        </div>

                        {/* Date & Time */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div>
                                <label style={labelStyle}>Start Date *</label>
                                <input name="startDate" type="date" style={inputStyle} onChange={handleChange} value={formData.startDate} />
                            </div>
                            <div>
                                <label style={labelStyle}>Start Time *</label>
                                <input name="startTime" type="time" style={inputStyle} onChange={handleChange} value={formData.startTime} />
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div>
                                <label style={labelStyle}>End Date</label>
                                <input name="endDate" type="date" style={inputStyle} onChange={handleChange} value={formData.endDate} />
                            </div>
                            <div>
                                <label style={labelStyle}>End Time</label>
                                <input name="endTime" type="time" style={inputStyle} onChange={handleChange} value={formData.endTime} />
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <label style={labelStyle}>Description</label>
                            <textarea name="description" style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }} placeholder="Event details..." onChange={handleChange} value={formData.description} />
                        </div>

                        {/* Poster */}
                        <div>
                            <label style={labelStyle}>Poster Image URL</label>
                            <input name="posterURL" style={inputStyle} placeholder="https://..." onChange={handleChange} value={formData.posterURL} />
                            <p style={{ fontSize: '0.8rem', opacity: 0.5, marginTop: '8px' }}>Paste a link to an image. If left blank, a random cover will be assigned.</p>
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: '16px', marginTop: '20px' }}>
                            <button onClick={handleSubmit} disabled={saving} style={{ padding: '14px 32px', background: '#3b82f6', color: '#fff', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer', flex: 1, opacity: saving ? 0.7 : 1 }}>
                                {saving ? 'Creating Event...' : 'Publish Event'}
                            </button>
                            <button onClick={() => router.back()} style={{ padding: '14px 32px', background: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                                Cancel
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
