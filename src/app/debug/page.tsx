'use client';
import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function DebugPage() {
    const [admins, setAdmins] = useState<any[]>([]);
    const [colList, setColList] = useState<any[]>([]);

    useEffect(() => {
        const fetch = async () => {
            const q = query(collection(db, 'users'), where('role', '==', 'college_admin'));
            const snap = await getDocs(q);
            setAdmins(snap.docs.map(d => ({ id: d.id, ...d.data() })));

            const cSnap = await getDocs(collection(db, 'colleges'));
            setColList(cSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        };
        fetch();
    }, []);

    return (
        <div className="p-10 bg-black text-white min-h-screen">
            <h1 className="text-2xl font-bold mb-4">Debug College Admins</h1>
            <pre className="bg-gray-800 p-4 rounded overflow-auto">
                {JSON.stringify(admins, null, 2)}
            </pre>
            <h2 className="text-xl font-bold mt-8 mb-2">Colleges Collection</h2>
            <pre className="bg-gray-800 p-4 rounded overflow-auto">
                {JSON.stringify(colList, null, 2)}
            </pre>
        </div>
    );
}
