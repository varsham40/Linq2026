'use client';

import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Club, EventScope, Event } from '@/types';
import Navbar from '@/components/Navbar';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Toast from '@/components/Toast';

export default function EditEventPage({ params }: { params: Promise<{ eventId: string }> }) {
    const { user } = useAuth();
    const router = useRouter();

    const [eventId, setEventId] = useState<string>('');
    const [event, setEvent] = useState<Event | null>(null);
    const [club, setClub] = useState<Club | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        scope: 'COLLEGE' as EventScope,
        startDate: '',
        startTime: '',
        endDate: '',
        endTime: '',
        registrationEndDate: '',
        registrationEndTime: '',
        venue: '',
        posterURL: '',
        isTeamEvent: false,
        minTeamSize: 1,
        maxTeamSize: 4
    });

    useEffect(() => {
        params.then(p => {
            setEventId(p.eventId);
        });
    }, [params]);

    useEffect(() => {
        if (!user || !eventId) return;

        const fetchData = async () => {
            try {
                // Fetch Event
                const eventSnap = await getDoc(doc(db, 'events', eventId));
                if (!eventSnap.exists()) {
                    setToast({ message: 'Event not found', type: 'error' });
                    setTimeout(() => router.push('/dashboard'), 1500);
                    return;
                }

                const eventData = { id: eventSnap.id, ...eventSnap.data() } as Event;
                setEvent(eventData);

                // Fetch Club
                if (eventData.clubId) {
                    const clubSnap = await getDoc(doc(db, 'clubs', eventData.clubId));
                    if (clubSnap.exists()) {
                        const clubData = { id: clubSnap.id, ...clubSnap.data() } as Club;
                        setClub(clubData);

                        // Check authorization
                        if (clubData.adminIds?.includes(user.uid)) {
                            setIsAuthorized(true);

                            // Pre-fill form
                            const startDate = new Date(eventData.startTime);
                            const endDate = new Date(eventData.endTime);
                            const deadlineDate = eventData.registrationDeadline ? new Date(eventData.registrationDeadline) : null;

                            setFormData({
                                title: eventData.title,
                                description: eventData.description || '',
                                scope: eventData.scope || 'COLLEGE_ONLY',
                                startDate: startDate.toISOString().split('T')[0],
                                startTime: startDate.toTimeString().slice(0, 5),
                                endDate: endDate.toISOString().split('T')[0],
                                endTime: endDate.toTimeString().slice(0, 5),
                                registrationEndDate: deadlineDate ? deadlineDate.toISOString().split('T')[0] : '',
                                registrationEndTime: deadlineDate ? deadlineDate.toTimeString().slice(0, 5) : '',
                                venue: eventData.venue,
                                posterURL: eventData.posterURL || '',
                                isTeamEvent: eventData.isTeamEvent || false,
                                minTeamSize: eventData.minTeamSize || 1,
                                maxTeamSize: eventData.maxTeamSize || 4
                            });
                        } else {
                            setToast({ message: 'You are not authorized to edit this event', type: 'error' });
                            setTimeout(() => router.push('/dashboard'), 1500);
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching event:', error);
                setToast({ message: 'Failed to load event', type: 'error' });
                setTimeout(() => router.push('/dashboard'), 1500);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [user, eventId, router]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleSubmit = async () => {
        if (!event || !user || !isAuthorized) return;

        // Basic Validation
        if (!formData.title || !formData.startDate || !formData.venue) {
            setToast({ message: 'Please fill all required fields.', type: 'error' });
            return;
        }

        setSaving(true);

        try {
            // Construct Timestamps
            const startTimestamp = new Date(`${formData.startDate}T${formData.startTime}`).getTime();
            const endTimestamp = new Date(`${formData.endDate}T${formData.endTime}`).getTime();
            const deadlineTimestamp = formData.registrationEndDate && formData.registrationEndTime 
                ? new Date(`${formData.registrationEndDate}T${formData.registrationEndTime}`).getTime()
                : startTimestamp;

            const updateData = {
                title: formData.title,
                description: formData.description,
                scope: formData.scope,
                startTime: startTimestamp,
                endTime: endTimestamp,
                registrationDeadline: deadlineTimestamp,
                venue: formData.venue,
                posterURL: formData.posterURL,
                updatedAt: Date.now(),
                updatedBy: user.uid,
                isTeamEvent: formData.isTeamEvent,
                minTeamSize: formData.isTeamEvent ? Number(formData.minTeamSize) : null,
                maxTeamSize: formData.isTeamEvent ? Number(formData.maxTeamSize) : null
            };

            await updateDoc(doc(db, 'events', event.id), updateData);
            setToast({ message: 'Event updated successfully!', type: 'success' });
            setTimeout(() => router.push(`/events/${event.id}`), 1500);

        } catch (error) {
            console.error('Error updating event:', error);
            setToast({ message: 'Failed to update event.', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg)' }}>Loading...</div>;
    if (!isAuthorized) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg)' }}>Not authorized</div>;

    const inputStyle = {
        width: '100%',
        padding: '12px 16px',
        backgroundColor: 'var(--input-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: '12px',
        color: 'var(--fg)',
        fontSize: '0.95rem'
    };

    const labelStyle = {
        display: 'block',
        marginBottom: '8px',
        fontSize: '0.9rem',
        fontWeight: 'bold' as const,
        color: 'var(--text-muted)'
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', color: 'var(--fg)', fontFamily: 'var(--font-inter)' }}>
            <Navbar />

            <main style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px 80px' }}>
                <div style={{ marginBottom: '40px' }}>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '10px' }}>Edit Event</h1>
                    <p style={{ opacity: 0.6 }}>Update event details for {club?.name}</p>
                </div>

                <div style={{ background: 'var(--card-bg)', padding: '40px', borderRadius: '24px', border: '1px solid var(--card-border)' }}>
                    <div style={{ display: 'grid', gap: '24px' }}>

                        {/* Title */}
                        <div>
                            <label style={labelStyle}>Event Title *</label>
                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                placeholder="e.g. Tech Talk 2024"
                                style={inputStyle}
                            />
                        </div>

                        {/* Description */}
                        <div>
                            <label style={labelStyle}>Description</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Tell attendees what this event is about..."
                                style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' as const }}
                            />
                        </div>

                        {/* Scope */}
                        <div>
                            <label style={labelStyle}>Event Scope *</label>
                            <select
                                name="scope"
                                value={formData.scope}
                                onChange={handleChange}
                                style={inputStyle}
                            >
                                <option value="COLLEGE">College Only</option>
                                <option value="GLOBAL">Global (Open to All)</option>
                            </select>
                        </div>

                        {/* Date & Time Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div>
                                <label style={labelStyle}>Start Date *</label>
                                <input
                                    type="date"
                                    name="startDate"
                                    value={formData.startDate}
                                    onChange={handleChange}
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>Start Time *</label>
                                <input
                                    type="time"
                                    name="startTime"
                                    value={formData.startTime}
                                    onChange={handleChange}
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>End Date *</label>
                                <input
                                    type="date"
                                    name="endDate"
                                    value={formData.endDate}
                                    onChange={handleChange}
                                    style={inputStyle}
                                />
                            </div>
                            <div>
                                <label style={labelStyle}>End Time *</label>
                                <input
                                    type="time"
                                    name="endTime"
                                    value={formData.endTime}
                                    onChange={handleChange}
                                    style={inputStyle}
                                />
                            </div>
                        </div>

                        {/* Registration Deadline */}
                        <div>
                            <label style={{...labelStyle, marginBottom: '16px'}}>Registration Deadline (Optional)</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div>
                                    <label style={labelStyle}>Deadline Date</label>
                                    <input
                                        type="date"
                                        name="registrationEndDate"
                                        value={formData.registrationEndDate}
                                        onChange={handleChange}
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Deadline Time</label>
                                    <input
                                        type="time"
                                        name="registrationEndTime"
                                        value={formData.registrationEndTime}
                                        onChange={handleChange}
                                        style={inputStyle}
                                    />
                                </div>
                            </div>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>If left blank, registrations will close at the event start time.</p>
                        </div>

                        {/* Venue */}
                        <div>
                            <label style={labelStyle}>Venue *</label>
                            <input
                                type="text"
                                name="venue"
                                value={formData.venue}
                                onChange={handleChange}
                                placeholder="e.g. Main Auditorium"
                                style={inputStyle}
                            />
                        </div>

                        {/* Poster URL */}
                        <div>
                            <label style={labelStyle}>Poster Image URL (Optional)</label>
                            <input
                                type="url"
                                name="posterURL"
                                value={formData.posterURL}
                                onChange={handleChange}
                                placeholder="https://example.com/poster.jpg"
                                style={inputStyle}
                            />
                        </div>

                        {/* Team Event Settings */}
                        <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '24px', marginTop: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <div>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: 'var(--fg)', margin: 0 }}>Team Event Settings</h3>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>Allow participants to form teams for this event.</p>
                                </div>
                                <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '28px' }}>
                                    <input type="checkbox" name="isTeamEvent" checked={formData.isTeamEvent} onChange={handleChange} style={{ opacity: 0, width: 0, height: 0 }} />
                                    <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: formData.isTeamEvent ? '#3b82f6' : 'var(--card-border)', transition: '.4s', borderRadius: '34px' }}>
                                        <span style={{ position: 'absolute', content: '""', height: '20px', width: '20px', left: formData.isTeamEvent ? '26px' : '4px', bottom: '4px', backgroundColor: 'white', transition: '.4s', borderRadius: '50%' }}></span>
                                    </span>
                                </label>
                            </div>

                            {formData.isTeamEvent && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', animation: 'fadeIn 0.2s ease-out' }}>
                                    <div>
                                        <label style={labelStyle}>Minimum Team Size</label>
                                        <input name="minTeamSize" type="number" min="1" style={inputStyle} onChange={handleChange} value={formData.minTeamSize} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Maximum Team Size</label>
                                        <input name="maxTeamSize" type="number" min="1" style={inputStyle} onChange={handleChange} value={formData.maxTeamSize} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                            <button
                                onClick={handleSubmit}
                                disabled={saving}
                                style={{
                                    flex: 1,
                                    padding: '14px',
                                    borderRadius: '12px',
                                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                    color: '#fff',
                                    border: 'none',
                                    fontWeight: 'bold',
                                    fontSize: '1rem',
                                    cursor: saving ? 'not-allowed' : 'pointer',
                                    opacity: saving ? 0.6 : 1
                                }}
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button
                                onClick={() => router.back()}
                                style={{
                                    padding: '14px 24px',
                                    borderRadius: '12px',
                                    background: 'var(--card-bg)',
                                    color: 'var(--fg)',
                                    border: '1px solid var(--card-border)',
                                    fontWeight: 'bold',
                                    fontSize: '1rem',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>

                {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            </main>
        </div>
    );
}
