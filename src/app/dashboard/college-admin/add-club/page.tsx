'use client';
import { useAuth } from '@/lib/auth-context';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClub } from '@/lib/club-utils';
import Navbar from '@/components/Navbar';

export default function AddClubPage() {
    const { user } = useAuth();
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        adminEmail: '',
        logoURL: ''
    });

    const handleSubmit = async () => {
        if (!user) return;
        if (!formData.name || !formData.adminEmail) {
            alert("Club Name and Admin Email are required.");
            return;
        }
        setLoading(true);

        try {
            // Fetch User Profile to get College ID
            const { doc, getDoc } = await import('firebase/firestore');
            const { db } = await import('@/lib/firebase');

            const userSnap = await getDoc(doc(db, 'users', user.uid));
            const userData = userSnap.data();
            const collegeId = userData?.homeCollegeId || "CMRIT";

            await createClub({
                name: formData.name,
                description: formData.description,
                collegeId: collegeId,
                logoURL: formData.logoURL,
                adminIds: []
            }, formData.adminEmail);

            router.push('/dashboard/college-admin');
        } catch (e) {
            console.error(e);
            alert("Failed to create club.");
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = {
        width: '100%',
        padding: '16px',
        backgroundColor: '#121214',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        color: '#fff',
        outline: 'none',
        fontSize: '1rem',
        transition: 'border-color 0.2s',
    };

    const labelStyle = {
        display: 'block',
        fontSize: '0.9rem',
        fontWeight: '600',
        color: 'rgba(255,255,255,0.7)',
        marginBottom: '8px'
    };

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#09090b', color: '#fff', fontFamily: 'var(--font-inter)' }}>
            <Navbar />
            <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 24px', paddingTop: '160px', paddingBottom: '80px' }}>

                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '40px' }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '10px' }}>Add New Club</h1>
                    <p style={{ opacity: 0.6, marginBottom: '40px' }}>Create a club entity and assign a Club Admin to manage it.</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div>
                            <label style={labelStyle}>Club Name *</label>
                            <input
                                style={inputStyle}
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Robotics Club"
                            />
                        </div>

                        <div>
                            <label style={labelStyle}>Club Admin Email *</label>
                            <input
                                style={inputStyle}
                                value={formData.adminEmail}
                                onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                                placeholder="Student email (must be signed up)"
                            />
                            <p style={{ fontSize: '0.8rem', opacity: 0.5, marginTop: '8px' }}>This user will be granted Club Admin permissions immediately.</p>
                        </div>

                        <div>
                            <label style={labelStyle}>Description</label>
                            <textarea
                                style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Club mission and activities..."
                            />
                        </div>

                        <div>
                            <label style={labelStyle}>Logo URL</label>
                            <input
                                style={inputStyle}
                                value={formData.logoURL}
                                onChange={(e) => setFormData({ ...formData, logoURL: e.target.value })}
                                placeholder="https://..."
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '16px', marginTop: '20px' }}>
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                style={{
                                    padding: '16px 32px',
                                    background: '#3b82f6',
                                    color: '#fff',
                                    borderRadius: '12px',
                                    fontWeight: 'bold',
                                    border: 'none',
                                    cursor: 'pointer',
                                    flex: 1,
                                    opacity: loading ? 0.7 : 1,
                                    fontSize: '1rem'
                                }}
                            >
                                {loading ? 'Creating Club...' : 'Create Club'}
                            </button>
                            <button onClick={() => router.back()} style={{ padding: '16px 32px', background: 'rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
