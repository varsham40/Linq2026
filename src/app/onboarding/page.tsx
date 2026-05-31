'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile, Role } from '@/types';

export default function OnboardingPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // State for missing core fields (fallback)
    const [needsCoreInfo, setNeedsCoreInfo] = useState(false);
    const [role, setRole] = useState<Role | null>(null);
    const [institution, setInstitution] = useState('');

    // State for secondary fields (New Onboarding)
    const [bio, setBio] = useState('');
    const [interests, setInterests] = useState<string[]>([]);
    const [phone, setPhone] = useState('');

    // Club Verification State
    const [clubName, setClubName] = useState('');
    const [adminEmail, setAdminEmail] = useState('');

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

        // Validation
        if (!bio.trim() || !phone.trim()) {
            setError("Please fill in your Bio and Phone Number to continue.");
            return;
        }
        setError('');

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

                let clubId: string | null = null;
                let designation: string | null = null;

                // CLUB MEMBER VERIFICATION LOGIC
                if (role === 'club_member') {
                    if (!clubName || !adminEmail) {
                        setError("Please enter Club Name and Admin Email for verification.");
                        setLoading(false);
                        return;
                    }

                    const clubsRef = collection(db, 'clubs');
                    const clubsSnap = await getDocs(clubsRef);
                    const matchingClubs = clubsSnap.docs.filter(d =>
                        d.data().name.toLowerCase().trim() === clubName.toLowerCase().trim()
                    );

                    if (matchingClubs.length === 0) {
                        setError(`Club '${clubName}' not found. Please check spelling.`);
                        setLoading(false);
                        return;
                    }

                    let confirmedClubId = '';
                    let confirmedRole = '';

                    for (const clubDoc of matchingClubs) {
                        const cId = clubDoc.id;
                        const whitelistQuery = query(collection(db, `clubs/${cId}/whitelisted_emails`), where('email', '==', user.email));
                        const whitelistSnap = await getDocs(whitelistQuery);

                        if (!whitelistSnap.empty) {
                            confirmedClubId = cId;
                            confirmedRole = whitelistSnap.docs[0].data().role;
                            break;
                        }
                    }

                    if (!confirmedClubId) {
                        setError("You are not invited to join this club (check whitelist or club info).");
                        setLoading(false);
                        return;
                    }

                    clubId = confirmedClubId;
                    designation = confirmedRole;
                }

                // Auto-register college if it doesn't exist (for College/Club Admins)
                if ((role === 'college_admin' || role === 'club_admin') && institution) {
                    const collegeId = institution.trim().replace(/\s+/g, '_');
                    const collegeRef = doc(db, 'colleges', collegeId);
                    const collegeSnap = await getDoc(collegeRef);
                    if (!collegeSnap.exists()) {
                        await setDoc(collegeRef, {
                            id: institution,
                            name: institution,
                            createdAt: Date.now()
                        });
                        console.log(`Auto-created college: ${institution}`);
                    }
                }

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
                        ...updateData,
                        ...(role === 'club_member' && { clubId: clubId, designation: designation }) // Add club data
                    };
                    await setDoc(userRef, newProfile);
                } else {
                    // Update existing partial
                    await setDoc(userRef, {
                        role,
                        homeCollegeId: institution,
                        ...updateData,
                        ...(role === 'club_member' && { clubId: clubId, designation: designation })
                    }, { merge: true });
                }
            } else {
                // Just simple update
                await setDoc(userRef, updateData, { merge: true });
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
                                {(['student', 'club_admin', 'club_member', 'college_admin'] as Role[]).map((r) => (
                                    <button key={r} onClick={() => setRole(r)} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: role === r ? '1px solid var(--primary)' : '1px solid var(--glass-border)', background: role === r ? 'rgba(59,130,246,0.2)' : 'transparent', color: 'white' }}>
                                        {r.replace('_', ' ')}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Existing Institution Input */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Institution</label>
                            <input value={institution} onChange={e => setInstitution(e.target.value)} placeholder="College Name" className="input-fld" />
                        </div>

                        {/* NEW: Club Verification Inputs */}
                        {role === 'club_member' && (
                            <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)', marginBottom: '10px' }}>
                                <p style={{ fontSize: '0.9rem', color: '#34d399', marginBottom: '10px', fontWeight: 'bold' }}>Verify Invitation</p>
                                <div style={{ marginBottom: '15px' }}>
                                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Club Name</label>
                                    <input
                                        className="input-fld"
                                        placeholder="e.g. Coding Club"
                                        value={clubName}
                                        onChange={(e) => setClubName(e.target.value)}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem' }}>Club Admin Email</label>
                                    <input
                                        className="input-fld"
                                        placeholder="admin@college.edu"
                                        value={adminEmail}
                                        onChange={(e) => setAdminEmail(e.target.value)}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            </div>
                        )}
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
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Phone</label>
                        <input
                            type="tel"
                            value={phone} onChange={e => setPhone(e.target.value)}
                            placeholder="+91..."
                            className="input-fld"
                        />
                    </div>
                </div>

                {error && (
                    <div style={{ color: '#f87171', marginBottom: '1rem', background: 'rgba(248,113,113,0.1)', padding: '0.8rem', borderRadius: '8px', fontSize: '0.9rem' }}>
                        {error}
                    </div>
                )}

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
