'use client';

import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchMyClub } from '@/lib/club-utils';
import { Club, EventScope } from '@/types';
import Navbar from '@/components/Navbar';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Info, Calendar, FileText, MapPin, Image as ImageIcon, Rocket, CloudUpload } from 'lucide-react';

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
        scope: 'GLOBAL' as EventScope,
        startDate: '',
        startTime: '',
        endDate: '',
        endTime: '',
        registrationEndDate: '',
        registrationEndTime: '',
        venue: '',
        posterURL: ''
    });

    useEffect(() => {
        if (!user) return;
        fetchMyClub(user.uid).then((c) => {
            if (!c) {
                alert("You need to register a club first.");
                router.push('/dashboard');
                return;
            }
            setClub(c);
            setLoading(false);
        });
    }, [user, router]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleScopeToggle = (scope: EventScope) => {
        setFormData({ ...formData, scope });
    };

    const handleSubmit = async () => {
        if (!club || !user) return;

        if (!formData.title || !formData.startDate || !formData.venue || !formData.startTime) {
            alert("Please fill all required fields (Title, Venue, Start Date & Time).");
            return;
        }

        setSaving(true);

        try {
            const startTimestamp = new Date(`${formData.startDate}T${formData.startTime}`).getTime();
            let endTimestamp = startTimestamp;
            if (formData.endDate && formData.endTime) {
                endTimestamp = new Date(`${formData.endDate}T${formData.endTime}`).getTime();
            }

            const eventData = {
                clubId: club.id,
                collegeId: club.collegeId,
                title: formData.title,
                description: formData.description,
                scope: formData.scope,
                startTime: startTimestamp,
                endTime: endTimestamp,
                registrationDeadline: formData.registrationEndDate && formData.registrationEndTime 
                    ? new Date(`${formData.registrationEndDate}T${formData.registrationEndTime}`).getTime()
                    : startTimestamp, // default to start time if not provided
                venue: formData.venue,
                posterURL: formData.posterURL,
                createdBy: user.uid,
                createdAt: Date.now(),
                attendeeCount: 0
            };

            await addDoc(collection(db, 'events'), eventData);
            router.push('/dashboard');
        } catch (error) {
            console.error("Error creating event:", error);
            alert("Failed to create event.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--fg)', background: 'var(--bg)' }}>Loading...</div>;

    const inputStyle = {
        width: '100%',
        padding: '16px 16px',
        backgroundColor: 'var(--input-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: '12px',
        color: 'var(--fg)',
        outline: 'none',
        fontSize: '0.95rem',
        fontWeight: '500',
        transition: 'border-color 0.2s',
        marginTop: '8px'
    };

    const labelStyle = {
        display: 'block',
        fontSize: '0.75rem',
        fontWeight: 'bold',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.5px',
        color: 'var(--text-muted)'
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', color: 'var(--fg)', fontFamily: 'var(--font-inter)', transition: 'background-color 0.3s ease, color 0.3s ease' }}>
            <Navbar />
            
            <style dangerouslySetInnerHTML={{__html: `
                .form-card {
                    background: var(--card-bg);
                    border: 2px solid var(--card-border);
                    border-radius: 16px;
                    padding: 32px;
                    margin-bottom: 24px;
                }
                .icon-box {
                    width: 36px; height: 36px;
                    border-radius: 10px;
                    display: flex; align-items: center; justify-content: center;
                    background: rgba(192, 132, 252, 0.15);
                    color: var(--primary);
                }
                .section-header {
                    display: flex; align-items: center; gap: 12px;
                    margin-bottom: 32px;
                }
                .section-title {
                    font-size: 1.25rem; font-weight: bold; font-family: var(--font-outfit);
                }
                .input-wrapper {
                    position: relative;
                }
                .input-icon {
                    position: absolute; left: 16px; top: 50%; transform: translateY(-50%);
                    color: var(--text-muted); pointer-events: none;
                }
                .input-with-icon {
                    padding-left: 48px !important;
                }
                .scope-toggle {
                    display: flex; background: var(--input-bg); border-radius: 12px; padding: 4px; margin-top: 8px; border: 1px solid var(--card-border);
                }
                .scope-btn {
                    flex: 1; padding: 12px; text-align: center; border-radius: 8px; font-weight: bold; cursor: pointer; transition: all 0.2s; border: none; font-size: 0.95rem;
                }
                .scope-btn.active {
                    background: rgba(192, 132, 252, 0.2); color: var(--primary);
                }
                .scope-btn.inactive {
                    background: transparent; color: var(--text-muted);
                }
                .scope-btn.inactive:hover {
                    color: var(--fg);
                }
            `}} />

            <main style={{ maxWidth: '800px', margin: '0 auto', padding: '120px 24px 80px' }}>

                <div style={{ marginBottom: '40px' }}>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', fontFamily: 'var(--font-outfit)', marginBottom: '8px' }}>Host New Event</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem' }}>Create an exclusive experience for your community.</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

                    {/* Card 1: Basic Info */}
                    <div className="form-card">
                        <div className="section-header">
                            <div className="icon-box"><Info size={20} /></div>
                            <h2 className="section-title">Basic Info</h2>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div>
                                <label style={labelStyle}>Event Title</label>
                                <input name="title" style={inputStyle} placeholder="e.g. Hackathon 2026" onChange={handleChange} value={formData.title} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div>
                                    <label style={labelStyle}>Scope</label>
                                    <div className="scope-toggle">
                                        <button 
                                            className={`scope-btn ${formData.scope === 'GLOBAL' ? 'active' : 'inactive'}`} 
                                            onClick={() => handleScopeToggle('GLOBAL')}
                                        >
                                            Global
                                        </button>
                                        <button 
                                            className={`scope-btn ${formData.scope === 'COLLEGE' ? 'active' : 'inactive'}`} 
                                            onClick={() => handleScopeToggle('COLLEGE')}
                                        >
                                            College
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label style={labelStyle}>Venue</label>
                                    <div className="input-wrapper">
                                        <MapPin size={18} className="input-icon" />
                                        <input name="venue" style={{...inputStyle, paddingLeft: '48px'}} placeholder="e.g. Innovation Lab, Block A" onChange={handleChange} value={formData.venue} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card 2: Schedule */}
                    <div className="form-card">
                        <div className="section-header">
                            <div className="icon-box"><Calendar size={20} /></div>
                            <h2 className="section-title">Schedule</h2>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div>
                                    <label style={labelStyle}>Start Date</label>
                                    <input name="startDate" type="date" style={inputStyle} onChange={handleChange} value={formData.startDate} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Start Time</label>
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
                            <div style={{ borderTop: '1px solid var(--card-border)', paddingTop: '24px', marginTop: '8px' }}>
                                <h3 style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--fg)', marginBottom: '16px' }}>Registration Deadline (Optional)</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                    <div>
                                        <label style={labelStyle}>Deadline Date</label>
                                        <input name="registrationEndDate" type="date" style={inputStyle} onChange={handleChange} value={formData.registrationEndDate} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Deadline Time</label>
                                        <input name="registrationEndTime" type="time" style={inputStyle} onChange={handleChange} value={formData.registrationEndTime} />
                                    </div>
                                </div>
                                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>If left blank, registrations will close at the event start time.</p>
                            </div>
                        </div>
                    </div>

                    {/* Card 3: Details & Media */}
                    <div className="form-card">
                        <div className="section-header">
                            <div className="icon-box"><FileText size={20} /></div>
                            <h2 className="section-title">Details & Media</h2>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            <div>
                                <label style={labelStyle}>Description</label>
                                <textarea name="description" style={{ ...inputStyle, minHeight: '140px', resize: 'vertical' }} placeholder="Describe your event's mission, perks, and schedule..." onChange={handleChange} value={formData.description} />
                            </div>

                            <div>
                                <label style={labelStyle}>Poster Image URL</label>
                                <div className="input-wrapper">
                                    <ImageIcon size={18} className="input-icon" />
                                    <input name="posterURL" style={{...inputStyle, paddingLeft: '48px'}} placeholder="https://cloud.linq.io/assets/poster-v1.jpg" onChange={handleChange} value={formData.posterURL} />
                                </div>
                            </div>

                            {/* Preview Placeholder */}
                            <div style={{ width: '100%', height: '200px', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--card-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: 'var(--text-muted)', overflow: 'hidden' }}>
                                {formData.posterURL ? (
                                    <img src={formData.posterURL} alt="Poster Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                ) : (
                                    <>
                                        <CloudUpload size={32} />
                                        <div style={{ fontSize: '0.85rem', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>Preview Loaded</div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Submit Area */}
                    <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                        <button onClick={handleSubmit} disabled={saving} style={{ width: '100%', padding: '18px 32px', background: 'var(--accent)', backgroundImage: 'linear-gradient(to right, var(--primary), var(--accent))', color: '#fff', borderRadius: '16px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', boxShadow: '0 10px 25px rgba(147, 51, 234, 0.4)', transition: 'transform 0.2s', opacity: saving ? 0.7 : 1 }}>
                            <Rocket size={22} />
                            {saving ? 'Publishing Event...' : 'Publish Event'}
                        </button>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>By publishing, you agree to linq's Community Guidelines.</p>
                    </div>

                </div>
            </main>
        </div>
    );
}
