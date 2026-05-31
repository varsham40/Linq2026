'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { doc, setDoc, collection, query, where, getDocs, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { UserProfile, Role } from '@/types';
import { updateProfile, createUserWithEmailAndPassword } from 'firebase/auth';

export default function SignupPage() {
    const { signUpWithEmail, signInWithGoogle } = useAuth();
    const router = useRouter();

    const [role, setRole] = useState<'student' | 'club_admin' | 'club_member' | 'college_admin'>('student');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [modalMessage, setModalMessage] = useState('');

    // Extra fields for club_member
    const [clubName, setClubName] = useState('');
    const [adminEmail, setAdminEmail] = useState('');

    // Form States
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        institution: '',
        rollNumber: '', // Student only
        branch: '', // Student only
        clubName: '', // Club Admin only (Legacy)
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const createProfile = async (user: any, clubId: string | null = null, roleTitle: string | null = null) => {
        // Auto-register college if it doesn't exist (for College/Club Admins)
        if ((role === 'college_admin' || role === 'club_admin') && formData.institution) {
            const collegeId = formData.institution.trim().replace(/\s+/g, '_');
            const collegeRef = doc(db, 'colleges', collegeId);
            const collegeSnap = await getDoc(collegeRef);

            if (!collegeSnap.exists()) {
                await setDoc(collegeRef, {
                    id: collegeId,
                    name: formData.institution,
                    createdAt: Date.now()
                });
            }
        }

        const userRef = doc(db, 'users', user.uid);
        const profile: UserProfile = {
            uid: user.uid,
            email: user.email!,
            displayName: `${formData.firstName} ${formData.lastName}`.trim() || user.displayName || 'User',
            photoURL: user.photoURL || null,
            role: role as Role,
            homeCollegeId: formData.institution, // In real app, verify against 'colleges' collection
            createdAt: Date.now(),
        };

        const extendedProfile = {
            ...profile,
            ...(role === 'student' && { rollNumber: formData.rollNumber, branch: formData.branch }),
            ...(role === 'club_admin' && { clubName: formData.clubName }),
            ...(role === 'club_member' && { clubId: clubId, designation: roleTitle }),
        };

        if (role === 'club_admin' && clubId) {
            const { arrayUnion, updateDoc: firestoreUpdateDoc } = await import('firebase/firestore');
            await firestoreUpdateDoc(doc(db, 'clubs', clubId), {
                adminIds: arrayUnion(user.uid)
            });
        }

        await setDoc(userRef, extendedProfile);
    };

    const handleManualSignup = async () => {
        const { email, password, firstName, lastName, institution } = formData;
        const name = `${firstName} ${lastName}`.trim();

        if (!email || !password || !institution || !name) {
            setError("Please fill in all required fields.");
            return;
        }

        if (role === 'club_member' && (!clubName || !adminEmail)) {
            setError("Please enter Club Name and Admin Email for verification.");
            return;
        }

        setLoading(true);
        setError('');

        try {
            let clubId = '';
            let designation = '';

            // Validation for Club Member
            if (role === 'club_member') {
                // Modified Lookup Strategy:
                // 1. Find Club by Name (Public)
                // 2. Check Whitelist (Allowed via Rule)
                // We perform this instead of looking up Admin User first, because unauthenticated users cannot query 'users' collection.

                const clubsRef = collection(db, 'clubs');
                // Fetch clubs and filter client-side for case-insensitive match
                // Note: In a production app with many clubs, use backend search or indexed 'name_lowercase'
                const clubsSnap = await getDocs(clubsRef);

                const matchingClubs = clubsSnap.docs.filter(d =>
                    d.data().name.toLowerCase().trim() === clubName.toLowerCase().trim()
                );

                if (matchingClubs.length === 0) {
                    setError(`Club '${clubName}' not found. Please check the spelling.`);
                    setLoading(false);
                    return;
                }

                // Check whitelist for each matching club (in case of duplicate names, though rare)
                let confirmedClubId = '';
                let confirmedRole = '';

                for (const clubDoc of matchingClubs) {
                    const cId = clubDoc.id;
                    const whitelistQuery = query(collection(db, `clubs/${cId}/whitelisted_emails`), where('email', '==', email));
                    const whitelistSnap = await getDocs(whitelistQuery);

                    if (!whitelistSnap.empty) {
                        confirmedClubId = cId;
                        confirmedRole = whitelistSnap.docs[0].data().role;
                        break;
                    }
                }

                if (!confirmedClubId) {
                    setError("You are not invited to join this club (or the Club Admin hasn't whitelisted this email yet).");
                    setLoading(false);
                    return;
                }

                clubId = confirmedClubId;
                designation = confirmedRole;
            }

            // Validation for Club Admin
            if (role === 'club_admin') {
                const clubsRef = collection(db, 'clubs');
                const q = query(clubsRef,
                    where('adminEmail', '==', email),
                    where('collegeId', '==', institution)
                );
                const clubsSnap = await getDocs(q);

                if (clubsSnap.empty) {
                    setModalMessage(`Access Denied: Your email is not authorized as a Club Admin for "${institution}". Please verify your email or contact your College Admin.`);
                    setShowModal(true);
                    setLoading(false);
                    return;
                }
                clubId = clubsSnap.docs[0].id;
            }

            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await updateProfile(user, { displayName: name });

            await createProfile(user, clubId, designation);

            // Redirect to Onboarding to complete profile (Bio, Phone, etc.)
            router.push('/onboarding');
        } catch (err: any) {
            console.error(err);
            if (err.code === 'auth/email-already-in-use') {
                setError("This email is already registered. Please log in instead.");
            } else {
                setError(err.message || "Failed to sign up");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignup = async () => {
        if (!formData.institution) {
            setError("Please enter your Institution Name before continuing with Google.");
            return;
        }
        setLoading(true);
        setError('');

        try {
            const user = await signInWithGoogle();
            if (user) {
                await createProfile(user);
                router.push('/onboarding');
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Google sign in failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div style={{
                position: 'absolute', bottom: '0', right: '50%', transform: 'translate(50%, 50%)',
                width: '600px', height: '600px', background: 'var(--accent)', opacity: 0.1,
                filter: 'blur(100px)', borderRadius: '50%', zIndex: -1
            }} />

            <div className="glass-panel auth-card" style={{ maxWidth: '480px' }}>
                <h1 style={{ fontSize: '1.8rem', marginBottom: '1.5rem' }}>Create Account</h1>

                {/* Role Toggles */}
                <div style={{ display: 'flex', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '12px', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '5px', width: '100%' }}>
                        {(['student', 'club_member', 'club_admin', 'college_admin'] as const).map(r => (
                            <button
                                key={r}
                                type="button"
                                onClick={() => setRole(r)}
                                style={{
                                    padding: '8px 4px',
                                    borderRadius: '8px',
                                    border: role === r ? '1px solid #3b82f6' : '1px solid transparent',
                                    background: role === r ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                                    color: '#fff',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer',
                                    fontWeight: role === r ? 'bold' : 'normal'
                                }}
                            >
                                {r.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </button>
                        ))}
                    </div>
                </div>

                {role === 'club_member' && (
                    <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)', marginBottom: '20px' }}>
                        <p style={{ fontSize: '0.9rem', color: '#34d399', marginBottom: '10px', fontWeight: 'bold' }}>Verify Invitation</p>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Club Name</label>
                            <input
                                className="input-fld"
                                placeholder="e.g. Coding Club"
                                value={clubName}
                                onChange={(e) => setClubName(e.target.value)}
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Club Admin Email</label>
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

                {error && <div style={{ color: '#f87171', fontSize: '0.9rem', marginBottom: '1rem', background: 'rgba(248,113,113,0.1)', padding: '0.5rem', borderRadius: '8px' }}>{error}</div>}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', textAlign: 'left' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                        <input name="firstName" placeholder="First Name" className="input-fld" onChange={handleInputChange} />
                        <input name="lastName" placeholder="Last Name" className="input-fld" onChange={handleInputChange} />
                    </div>

                    <input name="email" type="email" placeholder="Email Address" className="input-fld" onChange={handleInputChange} />
                    <input name="password" type="password" placeholder="Create Password" className="input-fld" onChange={handleInputChange} />

                    <input name="institution" placeholder="Institution Name (Required)" className="input-fld" style={{ borderColor: !formData.institution ? 'rgba(255,255,255,0.1)' : 'var(--glass-border)' }} onChange={handleInputChange} />

                    {/* Role Specific Fields */}
                    {role === 'student' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                            <input name="rollNumber" placeholder="Roll Number" className="input-fld" onChange={handleInputChange} />
                            <input name="branch" placeholder="Branch (e.g. CSE)" className="input-fld" onChange={handleInputChange} />
                        </div>
                    )}

                    {role === 'club_admin' && (
                        <input name="clubName" placeholder="Club Name (e.g. Coding Club)" className="input-fld" onChange={handleInputChange} />
                    )}

                    {role === 'college_admin' && (
                        <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', padding: '0 0.5rem' }}>
                            * You will be registered as the administrator for this institution. Verification may be required.
                        </div>
                    )}

                    <button onClick={handleManualSignup} className="btn btn-primary w-full" style={{ marginTop: '0.5rem' }}>
                        {loading ? 'Creating...' : 'Sign Up'}
                    </button>
                    {!loading && <p style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '8px' }}>Password must be at least 6 characters</p>}
                </div>

                {/* Separator */}
                <div style={{ position: 'relative', margin: '1.5rem 0', opacity: 0.5 }}>
                    <hr style={{ borderColor: 'var(--glass-border)' }} />
                    <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: '#18181b', padding: '0 10px', fontSize: '0.8rem' }}>OR</span>
                </div>

                {/* Secondary Google Option */}
                <button
                    onClick={handleGoogleSignup}
                    className="btn"
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'white', gap: '0.8rem' }}
                >
                    <svg width="18" height="18" viewBox="0 0 24 24" style={{ opacity: 0.8 }}>
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continue with Google
                </button>

                <p style={{ marginTop: '2rem', fontSize: '0.9rem', opacity: 0.6 }}>
                    Already have an account? <Link href="/login" style={{ color: 'var(--primary)' }}>Log in</Link>
                </p>
            </div>

            {/* Error Modal */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
                    <div style={{ background: '#18181b', border: '1px solid #ef4444', borderRadius: '24px', padding: '40px', maxWidth: '500px', width: '100%', textAlign: 'center', boxShadow: '0 0 40px rgba(239, 68, 68, 0.2)' }}>
                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'grid', placeItems: 'center', margin: '0 auto 24px' }}>
                            <span style={{ fontSize: '2rem', fontWeight: 'bold' }}>!</span>
                        </div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '16px', color: '#fff' }}>Authorization Failed</h2>
                        <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '32px', lineHeight: '1.6' }}>{modalMessage}</p>
                        <button
                            onClick={() => setShowModal(false)}
                            style={{ width: '100%', padding: '16px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '1rem' }}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
