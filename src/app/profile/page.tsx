'use client';

import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile, Certificate } from '@/types';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import Navbar from '@/components/Navbar';
import { User as UserIcon, Heart, Phone, Building2, Calendar, Award, ExternalLink, GraduationCap, Edit2 } from 'lucide-react';

const PLACEHOLDER_IMAGES = [
    "https://images.unsplash.com/photo-1504384308090-c54be630cd9f?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1544531586-fde5298cdd40?auto=format&fit=crop&w=800&q=80",
    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80"
];

const getEventImage = (id: string) => {
    const index = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % PLACEHOLDER_IMAGES.length;
    return PLACEHOLDER_IMAGES[index];
};

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
        <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg)', color: 'var(--fg)', fontFamily: 'var(--font-inter)', transition: 'background-color 0.3s ease, color 0.3s ease' }}>
            <Navbar />
            <style dangerouslySetInnerHTML={{
                __html: `
                @media (max-width: 900px) {
                    .profile-grid { grid-template-columns: 1fr !important; }
                    .banner-content { flex-direction: column !important; align-items: center !important; text-align: center !important; }
                    .banner-actions { padding-top: 24px !important; }
                }
            `}} />

            <main style={{ maxWidth: '1600px', margin: '0 auto', padding: '100px 24px 80px' }}>

                {/* Top Banner Card */}
                <div style={{ background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--card-border)', overflow: 'hidden', marginBottom: '24px' }}>
                    <div style={{ height: '160px', background: 'linear-gradient(to right, #1e1b4b, #312e81, #4c1d95)' }}></div>
                    <div className="banner-content" style={{ padding: '0 32px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>

                        <div className="banner-content" style={{ display: 'flex', gap: '24px' }}>
                            <div style={{
                                width: '140px', height: '140px', borderRadius: '50%', background: 'var(--card-bg)',
                                border: '6px solid var(--card-bg)', marginTop: '-70px', overflow: 'hidden', flexShrink: 0
                            }}>
                                {user.photoURL ? (
                                    <img src={user.photoURL} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', background: 'var(--primary)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: '3rem', fontWeight: 'bold' }}>
                                        {profile.displayName.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div style={{ paddingTop: '16px' }}>
                                <h1 style={{ fontSize: '1.8rem', fontWeight: 'bold', marginBottom: '4px', color: 'var(--fg)', fontFamily: 'var(--font-outfit)' }}>{profile.displayName}</h1>
                                <div style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '16px' }}>{profile.email}</div>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'var(--hover-bg)', border: '1px solid var(--glass-border)', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-muted)' }}>
                                    <GraduationCap size={18} />
                                    <span style={{ textTransform: 'capitalize' }}>{profile.role?.replace('_', ' ')}</span> at {profile.homeCollegeId}
                                </div>
                            </div>
                        </div>

                        <div className="banner-actions" style={{ paddingTop: '16px' }}>
                            {isEditing ? (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={handleSave} style={{ padding: '10px 20px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Save</button>
                                    <button onClick={() => setIsEditing(false)} style={{ padding: '10px 20px', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--card-border)', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                                </div>
                            ) : (
                                <button onClick={() => setIsEditing(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: '#c4b5fd', color: '#1e1b4b', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', transition: 'opacity 0.2s' }}>
                                    <Edit2 size={16} /> Edit Profile
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2-Column Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: '24px', alignItems: 'start' }} className="profile-grid">

                    {/* Left Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                        {/* About Card */}
                        <div style={{ background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--card-border)', padding: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                                <div style={{ padding: '8px', background: 'var(--hover-bg)', borderRadius: '8px', color: 'var(--text-muted)' }}><UserIcon size={20} /></div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--fg)' }}>About</h3>
                            </div>
                            {isEditing ? (
                                <textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} style={{ width: '100%', minHeight: '100px', padding: '12px', background: 'var(--input-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--fg)', outline: 'none' }} placeholder="Write something about yourself..." />
                            ) : (
                                <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', fontSize: '0.95rem' }}>{profile.bio || "I'm a passionate computer science student with a keen interest in software development and emerging technologies. Always eager to learn and collaborate on innovative projects."}</p>
                            )}
                        </div>

                        {/* Interests Card */}
                        <div style={{ background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--card-border)', padding: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                                <div style={{ padding: '8px', background: 'var(--hover-bg)', borderRadius: '8px', color: 'var(--text-muted)' }}><Heart size={20} /></div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--fg)' }}>Interests</h3>
                            </div>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                                {(isEditing ? editInterests : profile.interests)?.map(tag => (
                                    <span key={tag} style={{ padding: '6px 16px', background: 'var(--hover-bg)', color: 'var(--fg)', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {tag}
                                        {isEditing && <button onClick={() => removeInterest(tag)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1 }}>×</button>}
                                    </span>
                                ))}
                                {(!profile.interests || profile.interests.length === 0) && !isEditing && <span style={{ color: 'var(--text-muted)' }}>No interests added.</span>}
                            </div>

                            {isEditing && (
                                <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                                    <input value={newInterest} onChange={(e) => setNewInterest(e.target.value)} style={{ flex: 1, padding: '10px', background: 'var(--input-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--fg)', outline: 'none' }} placeholder="Add interest..." />
                                    <button onClick={addInterest} style={{ padding: '0 16px', background: 'var(--hover-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--fg)', cursor: 'pointer', fontWeight: 'bold' }}>Add</button>
                                </div>
                            )}
                        </div>

                        {/* Contact Card */}
                        <div style={{ background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--card-border)', padding: '24px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                                <div style={{ padding: '8px', background: 'var(--hover-bg)', borderRadius: '8px', color: 'var(--text-muted)' }}><Building2 size={20} /></div>
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--fg)' }}>Contact</h3>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{ padding: '10px', background: 'var(--hover-bg)', borderRadius: '50%', color: 'var(--text-muted)' }}><Phone size={18} /></div>
                                    {isEditing ? (
                                        <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} style={{ flex: 1, padding: '8px', background: 'var(--input-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--fg)', outline: 'none' }} placeholder="+91 98765 43210" />
                                    ) : (
                                        <span style={{ color: 'var(--fg)', fontWeight: '500', fontSize: '0.95rem' }}>{profile.phone || "+91 98765 43210"}</span>
                                    )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{ padding: '10px', background: 'var(--hover-bg)', borderRadius: '50%', color: 'var(--text-muted)' }}><Building2 size={18} /></div>
                                    {isEditing ? (
                                        <input value={editBranch} onChange={(e) => setEditBranch(e.target.value)} style={{ flex: 1, padding: '8px', background: 'var(--input-bg)', border: '1px solid var(--card-border)', borderRadius: '8px', color: 'var(--fg)', outline: 'none' }} placeholder="CMRIT Campus" />
                                    ) : (
                                        <span style={{ color: 'var(--fg)', fontWeight: '500', fontSize: '0.95rem' }}>{profile.branch || `${profile.homeCollegeId} Campus`}</span>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Right Column */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                        {/* Attended Events Card */}
                        <div style={{ background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--card-border)', padding: '32px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ padding: '8px', background: 'var(--hover-bg)', borderRadius: '8px', color: 'var(--text-muted)' }}><Calendar size={20} /></div>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--fg)' }}>Attended Events</h3>
                                </div>
                                <a href="/dashboard/student" style={{ color: 'var(--text-muted)', fontWeight: 'bold', fontSize: '0.9rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>View All &rarr;</a>
                            </div>

                            {certificates.length > 0 ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                                    {certificates.slice(0, 2).map(cert => (
                                        <div key={cert.id} style={{ background: 'var(--hover-bg)', borderRadius: '12px', overflow: 'hidden' }}>
                                            <div style={{ height: '140px', background: 'var(--glass-border)' }}>
                                                <img src={getEventImage(cert.eventId || cert.id)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>
                                            <div style={{ padding: '16px' }}>
                                                <h4 style={{ color: 'var(--fg)', fontWeight: 'bold', fontSize: '1rem', marginBottom: '8px' }}>{cert.eventName}</h4>
                                                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                    <Calendar size={14} /> {new Date(cert.eventDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p style={{ color: 'var(--text-muted)' }}>No events attended yet.</p>
                            )}
                        </div>

                        {/* Certifications Card */}
                        <div style={{ background: 'var(--card-bg)', borderRadius: '16px', border: '1px solid var(--card-border)', padding: '32px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ padding: '8px', background: 'var(--hover-bg)', borderRadius: '8px', color: 'var(--text-muted)' }}><Award size={20} /></div>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--fg)' }}>Certifications</h3>
                                </div>
                                <a href="/dashboard/student" style={{ color: 'var(--text-muted)', fontWeight: 'bold', fontSize: '0.9rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>View All &rarr;</a>
                            </div>

                            {certificates.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {certificates.slice(0, 3).map(cert => (
                                        <div key={cert.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', background: 'var(--hover-bg)', borderRadius: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                                <div style={{ width: '48px', height: '48px', background: 'var(--glass-border)', borderRadius: '12px', display: 'grid', placeItems: 'center', color: '#c084fc' }}>
                                                    <Award size={24} />
                                                </div>
                                                <div>
                                                    <h4 style={{ color: 'var(--fg)', fontWeight: 'bold', fontSize: '0.95rem', marginBottom: '4px' }}>{cert.eventName} Certificate</h4>
                                                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                                        linq Platform &bull; Issued {new Date(cert.eventDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                                                    </div>
                                                </div>
                                            </div>
                                            <a href={cert.downloadURL} target="_blank" style={{ color: 'var(--text-muted)', padding: '8px', background: 'var(--glass-border)', borderRadius: '8px', cursor: 'pointer' }}>
                                                <ExternalLink size={20} />
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p style={{ color: 'var(--text-muted)' }}>No certifications earned yet.</p>
                            )}
                        </div>

                    </div>
                </div>
            </main>
        </div>

    );
}
