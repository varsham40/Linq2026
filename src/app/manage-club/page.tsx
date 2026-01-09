'use client';

import { useAuth } from '@/lib/auth-context';
import { useEffect, useState } from 'react';
import { fetchMyClub, createClub } from '@/lib/club-utils';
import { Club } from '@/types';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function ManageClubPage() {
    const { user } = useAuth();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [isNew, setIsNew] = useState(false);
    const [clubId, setClubId] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        collegeId: '', // Ideally fetched from user profile
        logoURL: ''
    });

    useEffect(() => {
        if (!user) return;

        // Auto-fill collegeId from user profile if available (omitted for brevity, assume manual or context)
        // Actually, let's try to get profile data? For now, manual entry for flexibility.

        fetchMyClub(user.uid).then((c) => {
            if (c) {
                setFormData({
                    name: c.name,
                    description: c.description,
                    collegeId: c.collegeId,
                    logoURL: c.logoURL || ''
                });
                setClubId(c.id);
                setIsNew(false);
            } else {
                setIsNew(true);
            }
            setLoading(false);
        });
    }, [user]);

    const handleSubmit = async () => {
        if (!user) return;
        setLoading(true);

        try {
            if (isNew) {
                await createClub({
                    name: formData.name,
                    description: formData.description,
                    collegeId: formData.collegeId,
                    logoURL: formData.logoURL,
                    adminIds: [user.uid]
                });
            } else if (clubId) {
                const ref = doc(db, 'clubs', clubId);
                await updateDoc(ref, {
                    name: formData.name,
                    description: formData.description,
                    logoURL: formData.logoURL
                });
            }
            router.push('/dashboard/club-admin');
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;
    if (loading && !isNew) return <div>Loading...</div>;

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="container padding-y flex justify-center">
                <div className="glass-panel p-8 w-full max-w-2xl">
                    <h1 className="text-2xl font-bold mb-6">{isNew ? 'Register Your Club' : 'Edit Club Details'}</h1>

                    <div className="flex flex-col gap-4">
                        <div>
                            <label className="block mb-2 text-sm font-medium">Club Name</label>
                            <input
                                className="input-fld"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Coding Club"
                            />
                        </div>

                        <div>
                            <label className="block mb-2 text-sm font-medium">Description</label>
                            <textarea
                                className="input-fld"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="What is this club about?"
                                style={{ minHeight: '100px' }}
                            />
                        </div>

                        <div>
                            <label className="block mb-2 text-sm font-medium">College Name/ID</label>
                            <input
                                className="input-fld"
                                value={formData.collegeId}
                                onChange={(e) => setFormData({ ...formData, collegeId: e.target.value })}
                                placeholder="e.g. IIT Delhi"
                                disabled={!isNew} // Lock college after creation
                            />
                        </div>

                        <div>
                            <label className="block mb-2 text-sm font-medium">Logo URL (Optional)</label>
                            <input
                                className="input-fld"
                                value={formData.logoURL}
                                onChange={(e) => setFormData({ ...formData, logoURL: e.target.value })}
                                placeholder="https://..."
                            />
                        </div>

                        <button onClick={handleSubmit} className="btn btn-primary mt-4">
                            {loading ? 'Saving...' : (isNew ? 'Register Club' : 'Save Changes')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
