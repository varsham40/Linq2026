import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
    try {
        const { uid, clubId } = await req.json();

        if (!uid || !clubId) {
            return NextResponse.json({ error: 'Missing UID or Club ID' }, { status: 400 });
        }

        // Verify requestor is authenticated and authorized
        // In a real app, we should verify the ID Token from the header
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        const requestorUid = decodedToken.uid;

        // Verify Requestor owns the club
        const clubSnap = await adminDb.collection('clubs').doc(clubId).get();
        if (!clubSnap.exists) {
            return NextResponse.json({ error: 'Club not found' }, { status: 404 });
        }

        const clubData = clubSnap.data();
        if (!clubData?.adminIds.includes(requestorUid)) {
            return NextResponse.json({ error: 'Forbidden: You are not an admin of this club' }, { status: 403 });
        }

        // 1. Delete from Auth
        await adminAuth.deleteUser(uid);

        // 2. Delete from Firestore (User Profile)
        await adminDb.collection('users').doc(uid).delete();

        // 3. Delete from Club Member list (Clean up)
        await adminDb.collection('clubs').doc(clubId).collection('members').doc(uid).delete();

        // 4. Also remove from whitelisted_emails of that club to prevent re-join?
        // Let's find the email to remove it from whitelist if we implement whitelist.
        // For now, simple user deletion.

        return NextResponse.json({ success: true, message: 'User permanently deleted' });

    } catch (error) {
        console.error("Delete User Error:", error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
