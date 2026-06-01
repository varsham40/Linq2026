'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { Event, ProjectSubmission } from '@/types';
import { UploadCloud, ChevronRight, X, FileCheck } from 'lucide-react';
import Toast from './Toast';

interface Props {
    event: Event;
    user: { uid: string, displayName: string };
    registration: any;
}

export default function SoloSubmission({ event, user, registration }: Props) {
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [submitData, setSubmitData] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    // Existing Submission State
    const [existingSubmission, setExistingSubmission] = useState<ProjectSubmission | null>(null);
    const [showViewModal, setShowViewModal] = useState(false);

    // Deadlines
    const isRegDeadlinePassed = !!(event.registrationDeadline && Date.now() > event.registrationDeadline);
    const isSubDeadlinePassed = !!(event.submissionConfig?.deadline && Date.now() > event.submissionConfig.deadline);

    useEffect(() => {
        if (!event || !user) return;
        
        const unsub = onSnapshot(doc(db, `events/${event.id}/submissions`, user.uid), (docSnap) => {
            if (docSnap.exists()) {
                setExistingSubmission(docSnap.data() as ProjectSubmission);
            } else {
                setExistingSubmission(null);
            }
        });

        return () => unsub();
    }, [event, user]);

    const handleSubmitProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!event.submissionConfig) return;
        
        for (const field of event.submissionConfig.fields) {
            if (field.required && !submitData[field.id]) {
                setToast({ message: `Please fill out: ${field.label}`, type: 'error' });
                return;
            }
        }

        setSubmitting(true);
        try {
            const submission: ProjectSubmission = {
                id: user.uid,
                eventId: event.id,
                isTeamSubmission: false,
                submitterId: user.uid,
                submitterName: user.displayName,
                data: submitData,
                submittedAt: Date.now()
            };

            await setDoc(doc(db, `events/${event.id}/submissions`, user.uid), submission);
            setToast({ message: 'Project submitted successfully!', type: 'success' });
            setShowSubmitModal(false);
        } catch (err) {
            console.error(err);
            setToast({ message: 'Failed to submit project.', type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    if (!event.submissionConfig?.isOpen) return null;

    const inputStyle = {
        width: '100%', padding: '12px 16px', backgroundColor: 'var(--input-bg)',
        border: '1px solid var(--card-border)', borderRadius: '12px', color: 'var(--fg)', fontSize: '0.95rem'
    };

    return (
        <div style={{ marginTop: '40px' }}>
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--primary)', borderRadius: '24px', padding: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 8px 32px rgba(139, 92, 246, 0.15)' }}>
                <div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--fg)', marginBottom: '8px' }}>Project Submission</h3>
                    {existingSubmission ? (
                        <p style={{ color: '#10b981', fontWeight: 'bold' }}>✅ Project submitted successfully!</p>
                    ) : !registration?.attended ? (
                        <p style={{ color: '#ef4444' }}>You must check-in and attend the event to submit a project.</p>
                    ) : (
                        <p style={{ color: 'var(--text-muted)' }}>Submit your work before the deadline.</p>
                    )}
                </div>
                {existingSubmission ? (
                    <button 
                        onClick={() => setShowViewModal(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: 'var(--hover-bg)', color: 'var(--fg)', borderRadius: '12px', border: '1px solid var(--primary)', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                        <FileCheck size={20} /> View Submission
                    </button>
                ) : (
                    <button 
                        onClick={() => setShowSubmitModal(true)}
                        disabled={isSubDeadlinePassed || !registration?.attended}
                        style={{ 
                            display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', 
                            background: (isSubDeadlinePassed || !registration?.attended) ? 'var(--card-border)' : 'var(--primary)', 
                            color: (isSubDeadlinePassed || !registration?.attended) ? 'var(--text-muted)' : '#fff', 
                            borderRadius: '12px', border: 'none', fontWeight: 'bold', 
                            cursor: (isSubDeadlinePassed || !registration?.attended) ? 'not-allowed' : 'pointer', 
                            boxShadow: (isSubDeadlinePassed || !registration?.attended) ? 'none' : '0 4px 12px rgba(139, 92, 246, 0.3)' 
                        }}
                    >
                        <UploadCloud size={20} /> {isSubDeadlinePassed ? 'Submission Closed' : !registration?.attended ? 'Must Attend Event' : 'Submit Project'}
                    </button>
                )}
            </div>

            {/* Submit Project Modal */}
            {showSubmitModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '24px', padding: '32px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: '900', fontFamily: 'var(--font-outfit)' }}>Submit Project</h3>
                            <button onClick={() => setShowSubmitModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24} /></button>
                        </div>
                        
                        <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.95rem' }}>
                            Please provide the details below for your project submission.
                        </p>

                        <form onSubmit={handleSubmitProject} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {event.submissionConfig.fields.map(field => (
                                <div key={field.id}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '8px', color: 'var(--fg)' }}>
                                        {field.label}
                                        {field.required && <span style={{ color: '#ef4444' }}>*</span>}
                                    </label>
                                    <input 
                                        type={field.type === 'url' ? 'url' : 'text'}
                                        required={field.required}
                                        value={submitData[field.id] || ''}
                                        onChange={(e) => setSubmitData({ ...submitData, [field.id]: e.target.value })}
                                        placeholder={`Enter ${field.label.toLowerCase()}`}
                                        style={inputStyle}
                                    />
                                </div>
                            ))}

                            <div style={{ marginTop: '16px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => setShowSubmitModal(false)} style={{ padding: '12px 24px', background: 'var(--hover-bg)', color: 'var(--fg)', borderRadius: '12px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" disabled={submitting} style={{ padding: '12px 24px', background: 'var(--primary)', color: '#fff', borderRadius: '12px', border: 'none', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {submitting ? 'Submitting...' : 'Submit Project'} <ChevronRight size={18} />
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Submission Modal */}
            {showViewModal && existingSubmission && event.submissionConfig && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '24px', padding: '32px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: '900', fontFamily: 'var(--font-outfit)' }}>Your Submission</h3>
                            <button onClick={() => setShowViewModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24} /></button>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {event.submissionConfig.fields.map(field => {
                                const val = existingSubmission.data[field.id];
                                if (!val) return null;
                                return (
                                    <div key={field.id}>
                                        <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '8px' }}>
                                            {field.label}
                                        </div>
                                        {field.type === 'url' ? (
                                            <a href={val.startsWith('http') ? val : `https://${val}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontWeight: 'bold', textDecoration: 'none', wordBreak: 'break-all' }}>
                                                {val}
                                            </a>
                                        ) : (
                                            <div style={{ fontSize: '0.95rem', color: 'var(--fg)', background: 'var(--input-bg)', padding: '12px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                                                {val}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        
                        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            Submitted by: {existingSubmission.submitterName} at {new Date(existingSubmission.submittedAt).toLocaleString()}
                        </div>
                    </div>
                </div>
            )}

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
}
