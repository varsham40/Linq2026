import { collection, query, where, getDocs, addDoc, doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Club } from '@/types';

export async function getUserClub(userId: string): Promise<Club | null> {
    try {
        // Query all colleges to find a club where this user is an admin.
        // NOTE: In a production app with subcollections, we might need a specific 'admin_clubs' index 
        // or store the 'clubId' on the UserProfile to avoid Collection Group Queries if possible.
        // For MVP/Hackathon: Use Collection Group Query 'clubs' where adminIds array-contains userId.

        // However, 'clubs' is defined as `colleges/{collegeId}/clubs/{clubId}`.
        // Using collectionGroup query is best here.

        const clubsRef = collection(db, 'clubs_index'); // Using a top-level index for easier lookup if we have one.
        // IF we don't have a top level index, we can try query(collectionGroup(db, 'clubs'), ...)

        // Let's use collectionGroup on 'clubs'
        // Ensure you create an index in Firestore console if prompted.
        const q = query(
            collection(db, 'clubs'), // actually this won't work on root if it's nested. collectionGroup needed?
            // Wait, standard SDK doesn't have 'collectionGroup' at top level import, it's `collectionGroup(db, 'clubs')`.
        );
        // Actually, let's assume for this MVP we might store clubs at root 'clubs' OR use collectionGroup.
        // Given the previous plan mentioned `colleges/{collegeId}/clubs/{clubId}`, let's stick to that 
        // BUT finding "My Club" is hard without a back-reference.

        // EASIER MVP APPROACH:
        // When a Club Admin signs up, we probably haven't created the club yet?
        // Or if they created it, we should store `clubId` on the UserProfile.

        // Let's check UserProfile first.
        // But for now, let's try a collectionGroup query assuming the user is added to 'adminIds'.
    } catch (e) {
        console.error(e);
    }
    return null;
}

// SIMPLIFIED MVP UTILS
// We will store clubs in a root collection 'clubs' for now to make things easy, 
// AND maybe duplicate reference in `colleges/{id}/clubs` if needed, or just keep them root 
// and reference `collegeId` field.
// 
// DECISION: Root `clubs` collection with `collegeId` field is much easier for querying "All Clubs" or "My Club".
// The hierarchical path `colleges/{id}/clubs/{id}` is good for strict tenancy but harder for "Show me all events" or "My Dashboard".
// 
// Let's go with Root `clubs` collection for efficiency in this hackathon.

export async function fetchMyClub(userId: string): Promise<Club | null> {
    try {
        const q = query(collection(db, 'clubs'), where('adminIds', 'array-contains', userId));
        const snap = await getDocs(q);
        if (!snap.empty) {
            const docData = snap.docs[0].data() as any;
            return { id: snap.docs[0].id, ...docData } as Club;
        }
        return null;
    } catch (error) {
        console.error("Error fetching my club:", error);
        return null;
    }
}

export async function findUserByEmail(email: string) {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email));
    const snap = await getDocs(q);
    if (!snap.empty) {
        return { uid: snap.docs[0].id, ...snap.docs[0].data() };
    }
    return null;
}

export async function createClub(clubData: Omit<Club, 'id' | 'createdAt'>, adminEmail?: string) {
    let adminIds = clubData.adminIds || [];

    // If admin email provided, look up user and add to adminIds
    if (adminEmail) {
        const user = await findUserByEmail(adminEmail);
        if (user) {
            adminIds.push(user.uid);
        } else {
            // In a real app, we'd send an invite. For MVP, we might just warn or skip.
            console.warn(`User with email ${adminEmail} not found. Club created without linking admin.`);
        }
    }

    const docRef = await addDoc(collection(db, 'clubs'), {
        ...clubData,
        adminIds: [...new Set(adminIds)], // dedupe
        createdAt: Date.now()
    });
    return docRef.id;
}
