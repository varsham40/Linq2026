'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore'; // Added updateDoc
import { db } from '@/lib/firebase';
import { UserProfile, Role } from '@/types';

export default function OnboardingPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // State for missing core fields (fallback)
    const [needsCoreInfo, setNeedsCoreInfo] = useState(false);
    const [role, setRole] = useState<Role | null>(null);
    const [institution, setInstitution] = useState('');

    // State for secondary fields (New Onboarding)
    const [bio, setBio] = useState('');
    const [interests, setInterests] = useState<string[]>([]);
    const [phone, setPhone] = useState('');

    useEffect(() => {
        if (!user) return;

        const checkProfile = async () => {
            try {
                const docRef = doc(db, 'users', user.uid);
                const snap = await getDoc(docRef);

                if (snap.exists()) {
                    const data = snap.data() as UserProfile;
                    if (!data.role || !data.homeCollegeId) {
                        setNeedsCoreInfo(true);
                    } else {
                        // Core info exists, proceed to Profile Completion only
                        setNeedsCoreInfo(false);
                    }
                } else {
                    // No profile at all (should be rare if coming from Signup, but possible from Login)
                    setNeedsCoreInfo(true);
                }
            } catch (e) {
                console.error(e);
            }
        };
        checkProfile();
    }, [user]);

    const toggleInterest = (interest: string) => {
        if (interests.includes(interest)) {
            setInterests(interests.filter(i => i !== interest));
        } else {
            setInterests([...interests, interest]);
        }
    };

    const handleSubmit = async () => {
        if (!user) return;
        setLoading(true);

        try {
            const userRef = doc(db, 'users', user.uid);

            // If we needed core info, we must set it.
            // If we already have it, we just update bio/interests.

            const updateData: any = {
                bio,
                interests,
                phone,
                onboardingCompleted: true
            };

            if (needsCoreInfo) {
                if (!role || !institution) return; // Validation
                // If creating fresh or updating core
                const snap = await getDoc(userRef);
                if (!snap.exists()) {
                    // Create full profile
                    const newProfile: UserProfile = {
                        uid: user.uid,
                        email: user.email!,
                        displayName: user.displayName || 'User',
                        createdAt: Date.now(),
                        role: role,
                        homeCollegeId: institution,
                        ...updateData
                    };
                    await setDoc(userRef, newProfile);
                } else {
                    // Update existing partial
                    await updateDoc(userRef, { role, homeCollegeId: institution, ...updateData });
                }
            } else {
                // Just simple update
                await updateDoc(userRef, updateData);
            }

            router.push('/');
        } catch (error) {
            console.error("Error updating profile:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <div className="glass-panel" style={{ width: '100%', maxWidth: '700px', padding: '3rem', position: 'relative' }}>

                <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                    {needsCoreInfo ? "Complete Your Profile" : "Personalize Your Feed"}
                </h1>
                <p style={{ opacity: 0.7, marginBottom: '2rem' }}>
                    {needsCoreInfo ? "We need a few more details." : "Add a bio and interests to get better event recommendations."}
                </p>

                {/* FALLBACK: Only show Role/Institution if missing */}
                {needsCoreInfo && (
                    <div style={{ paddingBottom: '2rem', marginBottom: '2rem', borderBottom: '1px solid var(--glass-border)' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Core Details</h3>
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Role</label>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {(['student', 'club_admin', 'college_admin'] as Role[]).map((r) => (
                                    <button key={r} onClick={() => setRole(r)} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: role === r ? '1px solid var(--primary)' : '1px solid var(--glass-border)', background: role === r ? 'rgba(59,130,246,0.2)' : 'transparent', color: 'white' }}>
                                        {r.replace('_', ' ')}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Institution</label>
                            <input value={institution} onChange={e => setInstitution(e.target.value)} placeholder="College Name" className="input-fld" />
                        </div>
                    </div>
                )}

                {/* NEW SECTION: Bio & Interests */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Bio</label>
                        <textarea
                            value={bio} onChange={e => setBio(e.target.value)}
                            placeholder="Tell us about yourself..."
                            className="input-fld"
                            style={{ minHeight: '100px', resize: 'vertical' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Interests</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {['Coding', 'Music', 'Sports', 'Art', 'Debate', 'Gaming', 'Startups', 'Dance'].map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => toggleInterest(tag)}
                                    style={{
                                        padding: '0.4rem 1rem', borderRadius: '50px', fontSize: '0.85rem', cursor: 'pointer',
                                        background: interests.includes(tag) ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                        border: 'none', color: 'white', transition: 'all 0.2s'
                                    }}
                                >
                                    {tag}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Phone (Optional)</label>
                        <input
                            type="tel"
                            value={phone} onChange={e => setPhone(e.target.value)}
                            placeholder="+91..."
                            className="input-fld"
                        />
                    </div>
                </div>

                <button
                    disabled={loading}
                    onClick={handleSubmit}
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '2rem' }}
                >
                    {loading ? 'Saving...' : 'Finish Profile'}
                </button>
            </div>
        </div>
    );
}
