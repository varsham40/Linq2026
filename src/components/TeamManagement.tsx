'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, onSnapshot, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Event, Registration, Team, TeamRequest, ProjectSubmission } from '@/types';
import { Users, UserPlus, Mail, LogOut, UploadCloud, ChevronRight, X } from 'lucide-react';
import Toast from './Toast';
import ConfirmModal from './ConfirmModal';

interface Props {
    event: Event;
    user: { uid: string, displayName: string, email: string };
    registration: Registration;
}

export default function TeamManagement({ event, user, registration }: Props) {
    const [myTeam, setMyTeam] = useState<Team | null>(null);
    const [pendingRequests, setPendingRequests] = useState<TeamRequest[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Create Team Form
    const [teamName, setTeamName] = useState('');
    const [creating, setCreating] = useState(false);

    // Invite Form
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviting, setInviting] = useState(false);

    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [confirmAction, setConfirmAction] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void, isDestructive?: boolean} | null>(null);
    
    // Transfer Leadership Modal
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [transferToUid, setTransferToUid] = useState<string>('');
    
    // Submission Modal
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [submitData, setSubmitData] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);
    
    // Existing Submission State
    const [existingSubmission, setExistingSubmission] = useState<ProjectSubmission | null>(null);
    const [showViewModal, setShowViewModal] = useState(false);

    // Deadlines
    const isRegDeadlinePassed = !!(event.registrationDeadline && Date.now() > event.registrationDeadline);
    const isSubDeadlinePassed = !!(event.submissionConfig?.deadline && Date.now() > event.submissionConfig.deadline);

    useEffect(() => {
        if (!event || !user) return;

        // Subscribe to Teams where user is a member
        const teamsRef = collection(db, `events/${event.id}/teams`);
        const qTeam = query(teamsRef, where('memberIds', 'array-contains', user.uid));
        
        const unsubTeam = onSnapshot(qTeam, (snap) => {
            if (!snap.empty) {
                setMyTeam({ id: snap.docs[0].id, ...snap.docs[0].data() } as Team);
            } else {
                setMyTeam(null);
            }
        });

        // Subscribe to Pending Requests for this user
        const reqRef = collection(db, `events/${event.id}/teamRequests`);
        const qReq = query(reqRef, where('receiverId', '==', user.uid), where('status', '==', 'PENDING'));
        
        const unsubReq = onSnapshot(qReq, (snap) => {
            const reqs = snap.docs.map(d => ({ id: d.id, ...d.data() } as TeamRequest));
            setPendingRequests(reqs);
            setLoading(false);
        });

        return () => {
            unsubTeam();
            unsubReq();
        };
    }, [event, user]);

    // Separate effect for listening to submission changes once myTeam is loaded
    useEffect(() => {
        if (!event || !myTeam) return;
        
        const unsubSub = onSnapshot(doc(db, `events/${event.id}/submissions`, myTeam.id), (docSnap) => {
            if (docSnap.exists()) {
                setExistingSubmission(docSnap.data() as ProjectSubmission);
            } else {
                setExistingSubmission(null);
            }
        });

        return () => unsubSub();
    }, [event, myTeam]);

    const handleCreateTeam = async () => {
        if (!teamName.trim()) {
            setToast({ message: 'Team name is required.', type: 'error' });
            return;
        }

        setCreating(true);
        try {
            const teamData: Omit<Team, 'id'> = {
                eventId: event.id,
                name: teamName.trim(),
                leaderId: user.uid,
                memberIds: [user.uid],
                members: [{ uid: user.uid, name: user.displayName, email: user.email }],
                status: (event.minTeamSize || 1) <= 1 ? 'COMPLETE' : 'INCOMPLETE',
                createdAt: Date.now()
            };

            await addDoc(collection(db, `events/${event.id}/teams`), teamData);
            setToast({ message: 'Team created successfully!', type: 'success' });
            setTeamName('');
        } catch (e) {
            console.error(e);
            setToast({ message: 'Failed to create team.', type: 'error' });
        } finally {
            setCreating(false);
        }
    };

    const handleSendInvite = async () => {
        if (!inviteEmail.trim() || !myTeam) return;

        if (myTeam.memberIds.length >= (event.maxTeamSize || 4)) {
            setToast({ message: 'Team is already at maximum size.', type: 'error' });
            return;
        }

        setInviting(true);
        try {
            const regRef = collection(db, `events/${event.id}/registrations`);
            const qReg = query(regRef, where('userEmail', '==', inviteEmail.trim().toLowerCase()));
            const regSnap = await getDocs(qReg);

            if (regSnap.empty) {
                setToast({ message: 'No registered participant found with this email.', type: 'error' });
                setInviting(false);
                return;
            }

            const targetUserReg = regSnap.docs[0].data() as Registration;

            if (myTeam.memberIds.includes(targetUserReg.userId)) {
                setToast({ message: 'User is already in your team.', type: 'error' });
                setInviting(false);
                return;
            }

            const reqData: Omit<TeamRequest, 'id'> = {
                teamId: myTeam.id,
                teamName: myTeam.name,
                eventId: event.id,
                senderId: user.uid,
                senderName: user.displayName,
                receiverId: targetUserReg.userId,
                receiverEmail: targetUserReg.userEmail,
                status: 'PENDING',
                createdAt: Date.now()
            };

            await addDoc(collection(db, `events/${event.id}/teamRequests`), reqData);
            setToast({ message: 'Invite sent!', type: 'success' });
            setInviteEmail('');
        } catch (e) {
            console.error(e);
            setToast({ message: 'Failed to send invite.', type: 'error' });
        } finally {
            setInviting(false);
        }
    };

    const handleAcceptInvite = async (request: TeamRequest) => {
        try {
            const teamSnap = await getDoc(doc(db, `events/${event.id}/teams`, request.teamId));
            if (!teamSnap.exists()) return;
            const teamData = teamSnap.data() as Team;

            if (teamData.memberIds.length >= (event.maxTeamSize || 4)) {
                setToast({ message: 'This team is already full.', type: 'error' });
                await updateDoc(doc(db, `events/${event.id}/teamRequests`, request.id), { status: 'DECLINED' });
                return;
            }

            const updatedMemberIds = [...teamData.memberIds, user.uid];
            const updatedMembers = [...teamData.members, { uid: user.uid, name: user.displayName, email: user.email }];
            const newStatus = updatedMemberIds.length >= (event.minTeamSize || 1) ? 'COMPLETE' : 'INCOMPLETE';

            await updateDoc(doc(db, `events/${event.id}/teams`, request.teamId), {
                memberIds: updatedMemberIds,
                members: updatedMembers,
                status: newStatus
            });

            await deleteDoc(doc(db, `events/${event.id}/teamRequests`, request.id));
            setToast({ message: 'Joined team successfully!', type: 'success' });
        } catch (e) {
            console.error(e);
            setToast({ message: 'Failed to join team.', type: 'error' });
        }
    };

    const handleDeclineInvite = async (requestId: string) => {
        try {
            await deleteDoc(doc(db, `events/${event.id}/teamRequests`, requestId));
            setToast({ message: 'Invite declined.', type: 'success' });
        } catch (e) {
            console.error(e);
        }
    };

    const handleRemoveMember = (memberUid: string) => {
        setConfirmAction({
            isOpen: true,
            title: 'Remove Member',
            message: 'Are you sure you want to remove this member from the team?',
            isDestructive: true,
            onConfirm: async () => {
                try {
                    const updatedMemberIds = myTeam!.memberIds.filter(id => id !== memberUid);
                    const updatedMembers = myTeam!.members.filter(m => m.uid !== memberUid);
                    const newStatus = updatedMemberIds.length >= (event.minTeamSize || 1) ? 'COMPLETE' : 'INCOMPLETE';
                    
                    await updateDoc(doc(db, `events/${event.id}/teams`, myTeam!.id), {
                        memberIds: updatedMemberIds,
                        members: updatedMembers,
                        status: newStatus
                    });
                    setToast({ message: 'Member removed.', type: 'success' });
                } catch (e) {
                    console.error(e);
                    setToast({ message: 'Failed to remove member.', type: 'error' });
                }
            }
        });
    };

    // --- LEAVE TEAM LOGIC ---
    const handleLeaveTeam = () => {
        if (!myTeam) return;

        if (myTeam.leaderId === user.uid) {
            // Leader leaving: needs to transfer or disband
            setShowTransferModal(true);
        } else {
            // Regular member leaving
            setConfirmAction({
                isOpen: true,
                title: 'Leave Team',
                message: 'Are you sure you want to leave this team?',
                isDestructive: true,
                onConfirm: async () => {
                    try {
                        const updatedMemberIds = myTeam.memberIds.filter(id => id !== user.uid);
                        const updatedMembers = myTeam.members.filter(m => m.uid !== user.uid);
                        const newStatus = updatedMemberIds.length >= (event.minTeamSize || 1) ? 'COMPLETE' : 'INCOMPLETE';
                        
                        await updateDoc(doc(db, `events/${event.id}/teams`, myTeam.id), {
                            memberIds: updatedMemberIds,
                            members: updatedMembers,
                            status: newStatus
                        });
                        setToast({ message: 'You have left the team.', type: 'success' });
                    } catch (e) {
                        console.error(e);
                        setToast({ message: 'Failed to leave team.', type: 'error' });
                    }
                }
            });
        }
    };

    const handleTransferOrDisband = async (action: 'transfer' | 'disband') => {
        if (!myTeam) return;
        
        try {
            if (action === 'disband') {
                await deleteDoc(doc(db, `events/${event.id}/teams`, myTeam.id));
                setToast({ message: 'Team disbanded successfully.', type: 'success' });
            } else if (action === 'transfer') {
                if (!transferToUid) {
                    setToast({ message: 'Please select a member to transfer leadership to.', type: 'error' });
                    return;
                }
                const updatedMemberIds = myTeam.memberIds.filter(id => id !== user.uid);
                const updatedMembers = myTeam.members.filter(m => m.uid !== user.uid);
                const newStatus = updatedMemberIds.length >= (event.minTeamSize || 1) ? 'COMPLETE' : 'INCOMPLETE';
                
                await updateDoc(doc(db, `events/${event.id}/teams`, myTeam.id), {
                    leaderId: transferToUid,
                    memberIds: updatedMemberIds,
                    members: updatedMembers,
                    status: newStatus
                });
                setToast({ message: 'Leadership transferred and you have left the team.', type: 'success' });
            }
            setShowTransferModal(false);
        } catch (e) {
            console.error(e);
            setToast({ message: 'An error occurred.', type: 'error' });
        }
    };

    // --- SUBMISSION LOGIC ---
    const handleSubmitProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!myTeam || !event.submissionConfig) return;
        
        // Validate required fields
        for (const field of event.submissionConfig.fields) {
            if (field.required && !submitData[field.id]) {
                setToast({ message: `Please fill out: ${field.label}`, type: 'error' });
                return;
            }
        }

        setSubmitting(true);
        try {
            const submission: ProjectSubmission = {
                id: myTeam.id,
                eventId: event.id,
                isTeamSubmission: true,
                submitterId: user.uid,
                submitterName: user.displayName,
                teamId: myTeam.id,
                teamName: myTeam.name,
                data: submitData,
                submittedAt: Date.now()
            };

            await setDoc(doc(db, `events/${event.id}/submissions`, myTeam.id), submission);
            setToast({ message: 'Project submitted successfully!', type: 'success' });
            setShowSubmitModal(false);
        } catch (err) {
            console.error(err);
            setToast({ message: 'Failed to submit project.', type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div style={{ padding: '20px', color: 'var(--text-muted)' }}>Loading team info...</div>;

    const inputStyle = {
        width: '100%', padding: '12px 16px', backgroundColor: 'var(--input-bg)',
        border: '1px solid var(--card-border)', borderRadius: '12px', color: 'var(--fg)', fontSize: '0.95rem'
    };

    return (
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '16px', padding: '32px', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                <div style={{ padding: '8px', background: 'var(--hover-bg)', borderRadius: '8px', color: 'var(--primary)' }}>
                    <Users size={20} />
                </div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--fg)' }}>My Team</h2>
            </div>

            {!myTeam ? (
                // Not in a team
                <div className="mobile-grid-1" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                    {/* Create Team */}
                    <div>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 'bold', marginBottom: '16px' }}>Create a New Team</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <input 
                                type="text" 
                                placeholder="Enter team name" 
                                value={teamName} 
                                onChange={(e) => setTeamName(e.target.value)}
                                style={inputStyle}
                                disabled={isRegDeadlinePassed}
                            />
                            <button 
                                onClick={handleCreateTeam} 
                                disabled={creating || isRegDeadlinePassed}
                                style={{ padding: '12px', background: isRegDeadlinePassed ? 'var(--card-border)' : 'var(--primary)', color: isRegDeadlinePassed ? 'var(--text-muted)' : '#fff', borderRadius: '12px', border: 'none', fontWeight: 'bold', cursor: isRegDeadlinePassed ? 'not-allowed' : 'pointer' }}
                            >
                                {isRegDeadlinePassed ? 'Registration Closed' : (creating ? 'Creating...' : 'Create Team')}
                            </button>
                        </div>
                    </div>

                    {/* Pending Invites */}
                    <div className="team-split" style={{ borderLeft: '1px solid var(--card-border)', paddingLeft: '32px' }}>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 'bold', marginBottom: '16px' }}>Pending Invites ({pendingRequests.length})</h3>
                        {isRegDeadlinePassed ? (
                            <p style={{ color: '#ef4444', fontSize: '0.9rem', fontWeight: 'bold' }}>Team formations are closed as the deadline has passed.</p>
                        ) : pendingRequests.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No pending invites.</p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {pendingRequests.map(req => (
                                    <div key={req.id} style={{ background: 'var(--hover-bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                                        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{req.teamName}</div>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>Invited by {req.senderName}</div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={() => handleAcceptInvite(req)} style={{ flex: 1, padding: '8px', background: 'var(--primary)', color: '#fff', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Accept</button>
                                            <button onClick={() => handleDeclineInvite(req.id)} style={{ flex: 1, padding: '8px', background: 'transparent', color: 'var(--fg)', borderRadius: '8px', border: '1px solid var(--card-border)', fontWeight: 'bold', cursor: 'pointer' }}>Decline</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                // In a team
                <div>
                    <div className="mobile-flex-col" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid var(--card-border)' }}>
                        <div>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '4px' }}>{myTeam.name}</h3>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <span style={{ padding: '4px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 'bold', background: myTeam.status === 'COMPLETE' ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)', color: myTeam.status === 'COMPLETE' ? '#22c55e' : '#f59e0b' }}>
                                    {myTeam.status}
                                </span>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                    {myTeam.memberIds.length} / {event.maxTeamSize} Members (Min {event.minTeamSize})
                                </span>
                            </div>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                            {event.submissionConfig?.isOpen && myTeam.status === 'COMPLETE' && (
                                existingSubmission ? (
                                    <button 
                                        onClick={() => setShowViewModal(true)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', background: 'var(--hover-bg)', color: 'var(--fg)', borderRadius: '12px', border: '1px solid var(--primary)', fontWeight: 'bold', cursor: 'pointer' }}
                                    >
                                        <UploadCloud size={16} /> View Submission
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => setShowSubmitModal(true)}
                                        disabled={isSubDeadlinePassed || !registration?.attended}
                                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', background: (isSubDeadlinePassed || !registration?.attended) ? 'var(--card-border)' : 'var(--primary)', color: (isSubDeadlinePassed || !registration?.attended) ? 'var(--text-muted)' : '#fff', borderRadius: '12px', border: 'none', fontWeight: 'bold', cursor: (isSubDeadlinePassed || !registration?.attended) ? 'not-allowed' : 'pointer' }}
                                    >
                                        <UploadCloud size={16} /> {isSubDeadlinePassed ? 'Submission Closed' : !registration?.attended ? 'Must Attend Event' : 'Submit Project'}
                                    </button>
                                )
                            )}
                            <button 
                                onClick={handleLeaveTeam}
                                disabled={isRegDeadlinePassed}
                                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', background: isRegDeadlinePassed ? 'var(--card-border)' : 'rgba(239, 68, 68, 0.1)', color: isRegDeadlinePassed ? 'var(--text-muted)' : '#ef4444', borderRadius: '12px', border: 'none', fontWeight: 'bold', cursor: isRegDeadlinePassed ? 'not-allowed' : 'pointer' }}
                                title={isRegDeadlinePassed ? 'Teams are confirmed' : 'Leave Team'}
                            >
                                <LogOut size={16} /> Leave Team
                            </button>
                        </div>
                    </div>

                    {existingSubmission && (
                        <div style={{ marginBottom: '24px', padding: '12px 20px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', borderRadius: '12px', color: '#10b981', fontSize: '0.9rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            ✅ Project submitted successfully by {existingSubmission.submitterName}!
                        </div>
                    )}

                    <div className="mobile-grid-1" style={{ display: 'grid', gridTemplateColumns: myTeam.leaderId === user.uid ? '2fr 1fr' : '1fr', gap: '32px' }}>
                        {/* Members List */}
                        <div>
                            <h4 style={{ fontSize: '1.05rem', fontWeight: 'bold', marginBottom: '16px' }}>Members</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {myTeam.members.map(member => (
                                    <div key={member.uid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--input-bg)', padding: '16px', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                                        <div>
                                            <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                {member.name}
                                                {member.uid === myTeam.leaderId && <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: 'var(--primary)', color: '#fff', borderRadius: '4px', textTransform: 'uppercase' }}>Leader</span>}
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{member.email}</div>
                                        </div>
                                        {myTeam.leaderId === user.uid && member.uid !== user.uid && (
                                            <button 
                                                onClick={() => handleRemoveMember(member.uid)} 
                                                disabled={isRegDeadlinePassed}
                                                style={{ padding: '8px', background: isRegDeadlinePassed ? 'var(--card-border)' : 'rgba(239, 68, 68, 0.1)', color: isRegDeadlinePassed ? 'var(--text-muted)' : '#ef4444', borderRadius: '8px', border: 'none', cursor: isRegDeadlinePassed ? 'not-allowed' : 'pointer' }}
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Invite Section (Only for Leader) */}
                        {myTeam.leaderId === user.uid && (
                            <div className="team-split" style={{ borderLeft: '1px solid var(--card-border)', paddingLeft: '32px' }}>
                                <h4 style={{ fontSize: '1.05rem', fontWeight: 'bold', marginBottom: '16px' }}>Invite Member</h4>
                                {isRegDeadlinePassed ? (
                                    <div style={{ padding: '16px', background: 'var(--hover-bg)', borderRadius: '12px', color: '#ef4444', fontSize: '0.9rem', textAlign: 'center', fontWeight: 'bold' }}>
                                        Team formations are closed.
                                    </div>
                                ) : myTeam.memberIds.length >= (event.maxTeamSize || 4) ? (
                                    <div style={{ padding: '16px', background: 'var(--hover-bg)', borderRadius: '12px', color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
                                        Team is full!
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        <div style={{ position: 'relative' }}>
                                            <Mail size={18} style={{ position: 'absolute', left: '16px', top: '14px', color: 'var(--text-muted)' }} />
                                            <input 
                                                type="email" 
                                                placeholder="Participant's registered email" 
                                                value={inviteEmail} 
                                                onChange={e => setInviteEmail(e.target.value)}
                                                style={{...inputStyle, paddingLeft: '44px'}}
                                            />
                                        </div>
                                        <button 
                                            onClick={handleSendInvite}
                                            disabled={inviting}
                                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', background: 'var(--fg)', color: 'var(--bg)', borderRadius: '12px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
                                        >
                                            <UserPlus size={18} />
                                            {inviting ? 'Sending...' : 'Send Invite'}
                                        </button>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                                            Users must be registered for this event individually before they can be invited to a team.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Transfer Leadership / Leave Modal */}
            {showTransferModal && myTeam && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '24px', padding: '32px', width: '90%', maxWidth: '500px', boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Leave Team</h3>
                            <button onClick={() => setShowTransferModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.95rem' }}>
                            You are the leader of this team. If you leave, you must either transfer leadership to another member or disband the team completely.
                        </p>
                        
                        {myTeam.members.length > 1 && (
                            <div style={{ marginBottom: '24px', padding: '16px', background: 'var(--input-bg)', borderRadius: '12px', border: '1px solid var(--card-border)' }}>
                                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '8px' }}>Transfer Leadership To:</label>
                                <select 
                                    value={transferToUid} 
                                    onChange={(e) => setTransferToUid(e.target.value)}
                                    style={inputStyle}
                                >
                                    <option value="">Select a member</option>
                                    {myTeam.members.filter(m => m.uid !== user.uid).map(m => (
                                        <option key={m.uid} value={m.uid}>{m.name} ({m.email})</option>
                                    ))}
                                </select>
                                <button 
                                    onClick={() => handleTransferOrDisband('transfer')}
                                    disabled={!transferToUid}
                                    style={{ width: '100%', padding: '12px', marginTop: '12px', background: 'var(--primary)', color: '#fff', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: transferToUid ? 'pointer' : 'not-allowed', opacity: transferToUid ? 1 : 0.5 }}
                                >
                                    Transfer & Leave
                                </button>
                            </div>
                        )}

                        <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            <h4 style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#ef4444', marginBottom: '8px' }}>Danger Zone</h4>
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>This action will delete the team completely for all members.</p>
                            <button 
                                onClick={() => handleTransferOrDisband('disband')}
                                style={{ width: '100%', padding: '12px', background: '#ef4444', color: '#fff', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
                            >
                                Disband Team
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Submission Modal */}
            {showSubmitModal && event.submissionConfig && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '24px', padding: '32px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: '900', fontFamily: 'var(--font-outfit)' }}>Submit Project</h3>
                            <button onClick={() => setShowSubmitModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24} /></button>
                        </div>
                        
                        <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '0.95rem' }}>
                            Please provide the details below for your team's project submission. Only one submission is recorded per team.
                        </p>

                        <form onSubmit={handleSubmitProject} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {event.submissionConfig.fields.map(field => (
                                <div key={field.id}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '8px', color: 'var(--fg)' }}>
                                        {field.label}
                                        {field.required && <span style={{ color: '#ef4444' }}>*</span>}
                                    </label>
                                    <input 
                                        type={field.type === 'url' ? 'url' : 'text'}
                                        required={field.required}
                                        value={submitData[field.id] || ''}
                                        onChange={(e) => setSubmitData({ ...submitData, [field.id]: e.target.value })}
                                        placeholder={`Enter ${field.label.toLowerCase()}`}
                                        style={inputStyle}
                                    />
                                </div>
                            ))}

                            <div style={{ marginTop: '16px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => setShowSubmitModal(false)} style={{ padding: '12px 24px', background: 'var(--hover-bg)', color: 'var(--fg)', borderRadius: '12px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" disabled={submitting} style={{ padding: '12px 24px', background: 'var(--primary)', color: '#fff', borderRadius: '12px', border: 'none', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {submitting ? 'Submitting...' : 'Submit Project'} <ChevronRight size={18} />
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Submission Modal */}
            {showViewModal && existingSubmission && event.submissionConfig && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '24px', padding: '32px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 48px rgba(0,0,0,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: '900', fontFamily: 'var(--font-outfit)' }}>Your Submission</h3>
                            <button onClick={() => setShowViewModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={24} /></button>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {event.submissionConfig.fields.map(field => {
                                const val = existingSubmission.data[field.id];
                                if (!val) return null;
                                return (
                                    <div key={field.id}>
                                        <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '8px' }}>
                                            {field.label}
                                        </div>
                                        {field.type === 'url' ? (
                                            <a href={val.startsWith('http') ? val : `https://${val}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontWeight: 'bold', textDecoration: 'none', wordBreak: 'break-all' }}>
                                                {val}
                                            </a>
                                        ) : (
                                            <div style={{ fontSize: '0.95rem', color: 'var(--fg)', background: 'var(--input-bg)', padding: '12px', borderRadius: '8px', border: '1px solid var(--card-border)' }}>
                                                {val}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        
                        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            Submitted by: {existingSubmission.submitterName} at {new Date(existingSubmission.submittedAt).toLocaleString()}
                        </div>
                    </div>
                </div>
            )}

            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            {confirmAction && (
                <ConfirmModal 
                    isOpen={confirmAction.isOpen}
                    title={confirmAction.title}
                    message={confirmAction.message}
                    onConfirm={confirmAction.onConfirm}
                    onCancel={() => setConfirmAction(null)}
                    isDestructive={confirmAction.isDestructive}
                />
            )}
        </div>
    );
}
