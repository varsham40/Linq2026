'use client';

import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile, Certificate } from '@/types';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import Navbar from '@/components/Navbar';

export default function ProfilePage() {
    const { user } = useAuth();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [certificates, setCertificates] = useState<Certificate[]>([]);

    // Edit States
    const [editBio, setEditBio] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editBranch, setEditBranch] = useState('');
    const [editInterests, setEditInterests] = useState<string[]>([]);
    const [newInterest, setNewInterest] = useState('');

    useEffect(() => {
        if (!user) return;
        const fetchProfile = async () => {
            try {
                const ref = doc(db, 'users', user.uid);
                const snap = await getDoc(ref);
                if (snap.exists()) {
                    const data = snap.data() as UserProfile;
                    setProfile(data);
                    // Init edit states
                    setEditBio(data.bio || '');
                    setEditPhone(data.phone || '');
                    setEditBranch(data.branch || '');
                    setEditInterests(data.interests || []);

                }

                // Fetch Certificates (as proof of attendance)
                const certsRef = collection(db, `users/${user.uid}/certificates`);
                const certsSnap = await getDocs(certsRef);
                const certs = certsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Certificate[];
                setCertificates(certs);

            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, [user]);

    const handleSave = async () => {
        if (!user) return;
        try {
            const ref = doc(db, 'users', user.uid);
            await updateDoc(ref, {
                bio: editBio,
                phone: editPhone,
                branch: editBranch,
                interests: editInterests
            });
            setProfile((prev) => prev ? ({ ...prev, bio: editBio, phone: editPhone, branch: editBranch, interests: editInterests }) : null);
            setIsEditing(false);
        } catch (e) {
            console.error("Error updating profile", e);
        }
    };

    const addInterest = () => {
        if (newInterest && !editInterests.includes(newInterest)) {
            setEditInterests([...editInterests, newInterest]);
            setNewInterest('');
        }
    };

    const removeInterest = (item: string) => {
        setEditInterests(editInterests.filter(i => i !== item));
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    if (!user || !profile) return <div className="min-h-screen flex items-center justify-center">Profile not found.</div>;

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
            <Navbar />

            <div className="container padding-y">
                <div className="glass-panel" style={{ maxWidth: '800px', margin: '0 auto', overflow: 'hidden' }}>

                    {/* Header / Banner */}
                    <div style={{ height: '150px', background: 'linear-gradient(to right, var(--primary), var(--accent))', position: 'relative' }}>
                        <div style={{
                            position: 'absolute', bottom: '-40px', left: '40px',
                            width: '100px', height: '100px', borderRadius: '50%',
                            background: '#18181b', border: '4px solid #18181b',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            overflow: 'hidden'
                        }}>
                            {user.photoURL ? (
                                <img src={user.photoURL} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <span style={{ fontSize: '2.5rem' }}>👤</span>
                            )}
                        </div>
                    </div>

                    <div style={{ marginTop: '50px', padding: '0 40px 40px 40px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '2rem' }}>
                            <div>
                                <h1 style={{ fontSize: '2rem' }}>{profile.displayName}</h1>
                                <div style={{ opacity: 0.7, marginBottom: '0.5rem' }}>{profile.email}</div>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <span style={{ padding: '0.2rem 0.8rem', borderRadius: '20px', background: 'rgba(255,255,255,0.1)', fontSize: '0.8rem', textTransform: 'capitalize' }}>
                                        {profile.role?.replace('_', ' ')}
                                    </span>
                                    <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>at <strong>{profile.homeCollegeId}</strong></span>
                                </div>
                            </div>

                            {!isEditing && (
                                <button onClick={() => setIsEditing(true)} className="btn" style={{ background: 'rgba(255,255,255,0.1)' }}>
                                    Edit Profile
                                </button>
                            )}
                        </div>

                        <hr style={{ borderColor: 'var(--glass-border)', marginBottom: '2rem' }} />

                        {isEditing ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Bio</label>
                                    <textarea
                                        className="input-fld"
                                        value={editBio}
                                        onChange={(e) => setEditBio(e.target.value)}
                                        style={{ minHeight: '100px' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Phone</label>
                                    <input
                                        className="input-fld"
                                        value={editPhone}
                                        onChange={(e) => setEditPhone(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Branch / Department</label>
                                    <input
                                        className="input-fld"
                                        value={editBranch}
                                        onChange={(e) => setEditBranch(e.target.value)}
                                        placeholder="e.g. CSE, ISE, ECE"
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Interests</label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                        {editInterests.map(i => (
                                            <span key={i} style={{ padding: '0.3rem 0.8rem', background: 'var(--primary)', borderRadius: '20px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                {i} <button onClick={() => removeInterest(i)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>×</button>
                                            </span>
                                        ))}
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <input
                                            className="input-fld"
                                            style={{ margin: 0 }}
                                            value={newInterest}
                                            onChange={(e) => setNewInterest(e.target.value)}
                                            placeholder="Add interest..."
                                        />
                                        <button onClick={addInterest} className="btn" style={{ background: 'rgba(255,255,255,0.1)' }}>Add</button>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                    <button onClick={handleSave} className="btn btn-primary">Save Changes</button>
                                    <button onClick={() => setIsEditing(false)} className="btn" style={{ background: 'transparent' }}>Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                    <div>
                                        <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>About</h3>
                                        <p style={{ opacity: 0.8, lineHeight: '1.6' }}>
                                            {profile.bio || "No bio added yet."}
                                        </p>
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '1.2rem', marginBottom: '0.8rem' }}>Interests</h3>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            {profile.interests && profile.interests.length > 0 ? profile.interests.map(tag => (
                                                <span key={tag} style={{ padding: '0.3rem 0.8rem', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', fontSize: '0.85rem', border: '1px solid var(--glass-border)' }}>
                                                    {tag}
                                                </span>
                                            )) : <span style={{ opacity: 0.5 }}>No interests added.</span>}
                                        </div>

                                        <div style={{ marginTop: '2rem' }}>
                                            <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Contact</h3>
                                            <div style={{ opacity: 0.8 }}>
                                                {profile.phone ? `📞 ${profile.phone}` : "No phone number linked."}
                                            </div>
                                            <div style={{ opacity: 0.8, marginTop: '8px' }}>
                                                {profile.branch ? `🎓 ${profile.branch}` : "No branch details."}
                                            </div>
                                        </div>
                                    </div>
                                </div>


                                {/* Attended Events Section */}
                                <div style={{ marginTop: '30px', borderTop: '1px solid var(--glass-border)', paddingTop: '30px' }}>
                                    <h3 style={{ fontSize: '1.2rem', marginBottom: '16px' }}>Attended Events & Certifications ({certificates.length})</h3>
                                    {certificates.length > 0 ? (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                                            {certificates.map(cert => (
                                                <div key={cert.id} style={{ padding: '16px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '4px' }}>{cert.eventName}</div>
                                                    <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>{new Date(cert.eventDate).toLocaleDateString()}</div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p style={{ opacity: 0.5 }}>No events attended yet.</p>
                                    )}
                                </div>

                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>

    );
}
