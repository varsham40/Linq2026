'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile } from '@/types';

export default function DashboardPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [redirecting, setRedirecting] = useState(false);

    useEffect(() => {
        if (authLoading) return;

        if (!user) {
            router.push('/login');
            return;
        }

        const routeUser = async () => {
            setRedirecting(true);
            try {
                const docRef = doc(db, 'users', user.uid);
                const snap = await getDoc(docRef);

                if (snap.exists()) {
                    const data = snap.data() as UserProfile;
                    const role = data.role;

                    if (role === 'college_admin') {
                        router.push('/dashboard/college-admin');
                    } else if (role === 'club_admin') {
                        router.push('/dashboard/club-admin');
                    } else {
                        router.push('/dashboard/student');
                    }
                } else {
                    // Fallback if no profile
                    router.push('/onboarding');
                }
            } catch (e) {
                console.error(e);
            }
        };

        routeUser();

    }, [user, authLoading, router]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-muted-foreground animate-pulse text-lg">Taking you to your dashboard...</p>
            </div>
        </div>
    );
}
