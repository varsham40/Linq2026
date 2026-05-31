'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
    User,
    onAuthStateChanged,
    signInWithPopup,
    GoogleAuthProvider,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut
} from 'firebase/auth';
import { auth } from './firebase';
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    signInWithGoogle: () => Promise<User | null>;
    logout: () => Promise<void>;
    signUpWithEmail: (email: string, password: string) => Promise<User>;
    signInWithEmail: (email: string, password: string) => Promise<User>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
    signInWithGoogle: async () => null,
    logout: async () => { },
    signUpWithEmail: async () => { throw new Error("Not implemented") },
    signInWithEmail: async () => { throw new Error("Not implemented") },
});

import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { UserProfile } from '@/types';

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setLoading(true);
            if (user) {
                // Check if user profile exists in Firestore
                const userRef = doc(db, 'users', user.uid);
                try {
                    const userSnap = await getDoc(userRef);

                    if (userSnap.exists()) {
                        setProfile(userSnap.data() as UserProfile);
                    } else {
                        setProfile(null);
                    }

                    // If user profile doesn't exist or onboarding not completed
                    if (!userSnap.exists() || !userSnap.data()?.onboardingCompleted) {
                        const currentPath = pathname || window.location.pathname;

                        // Avoid redirect loop if already on onboarding or signup
                        if (currentPath !== '/onboarding' && currentPath !== '/signup') {
                            router.replace('/onboarding');
                        }
                    }
                } catch (err) {
                    console.error("Error checking user profile:", err);
                }
            } else {
                setProfile(null);
            }
            setUser(user);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [router, pathname]);

    const signUpWithEmail = async (email: string, pass: string) => {
        try {
            const result = await createUserWithEmailAndPassword(auth, email, pass);
            return result.user;
        } catch (error) {
            console.error("Error signing up", error);
            throw error;
        }
    };

    const signInWithEmail = async (email: string, pass: string) => {
        try {
            const { signInWithEmailAndPassword } = await import('firebase/auth');
            const result = await signInWithEmailAndPassword(auth, email, pass);
            return result.user;
        } catch (error) {
            console.error("Error signing in", error);
            throw error;
        }
    };

    const signInWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            // The auth state listener will handle the redirection logic
            return result.user;
        } catch (error) {
            console.error("Error signing in with Google", error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await firebaseSignOut(auth);
            setProfile(null);
            router.push('/');
        } catch (error) {
            console.error("Error signing out", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, profile, loading, signInWithGoogle, logout, signUpWithEmail, signInWithEmail }}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
