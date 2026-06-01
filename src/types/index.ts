export type Role = 'platform_admin' | 'college_admin' | 'club_admin' | 'club_member' | 'student';

export interface UserProfile {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
    role: Role;
    homeCollegeId?: string; // Reference to the college they belong to
    bio?: string;
    phone?: string;
    branch?: string; // e.g., "CSE", "ECE"
    interests?: string[];
    createdAt: number;
}

export interface EventAnnouncement {
    id: string;
    message: string;
    postedAt: number;
    authorName: string;
    authorId?: string;
}

export interface College {
    id: string;
    name: string;
    domain: string; // e.g., "college.edu"
    logoURL?: string;
    website?: string;
    createdAt: number;
}

export interface Club {
    id: string;
    collegeId: string;
    name: string;
    description: string;
    logoURL?: string;
    socialMedia?: {
        instagram?: string;
        linkedin?: string;
        twitter?: string;
        website?: string;
    };
    adminIds: string[]; // UIDs of students who manage this club
    adminEmail?: string; // Email of the primary admin for whitelisting
    createdAt: number;
}

export interface ClubMember {
    uid: string;
    email: string;
    displayName: string;
    role: 'member' | 'lead';
    joinedAt: number;
}

export interface WhitelistedMember {
    id: string; // email
    email: string;
    role: string; // "Event Lead", "Member", etc.
    clubId: string;
    addedAt: number;
    addedBy: string; // admin uid
}

export type EventScope = 'COLLEGE' | 'GLOBAL';

export interface Event {
    id: string;
    clubId: string;
    collegeId: string;
    title: string;
    description: string;
    scope: EventScope;
    startTime: number;
    endTime: number;
    venue: string;
    posterURL?: string;
    registrationFields: RegistrationField[]; // Custom fields
    createdAt: number;
    attendeeCount?: number;
    registrationCount?: number;
    createdBy?: string;
    status?: 'UPCOMING' | 'LIVE' | 'ENDED';
    certificatesIssued?: boolean;
    registrationDeadline?: number;
    isTeamEvent?: boolean;
    minTeamSize?: number;
    maxTeamSize?: number;
    submissionConfig?: {
        isOpen: boolean;
        deadline: number;
        fields: { id: string; label: string; type: 'text' | 'url'; required: boolean }[];
    };
}

export interface Certificate {
    id: string;
    eventId: string;
    eventName: string;
    eventDate: number;
    issuedAt: number;
    studentName: string;
    studentEmail: string;
    collegeName: string;
    clubName?: string;
    clubId?: string;
    collegeId?: string;
    downloadURL: string;
}

export interface RegistrationField {
    id: string;
    label: string;
    type: 'text' | 'number' | 'email' | 'select';
    required: boolean;
    options?: string[]; // For select type
}

export type RegistrationStatus = 'REGISTERED' | 'ATTENDED' | 'MISSED';

export interface Registration {
    id: string; // distinct from userId, specific to this registration
    eventId: string;
    userId: string;
    userEmail: string;
    userName: string;
    userCollegeId?: string; // If from another college
    userBranch?: string;
    status: RegistrationStatus;
    checkInTime?: number;
    customData?: Record<string, any>; // Responses to registrationFields
    registeredAt: number;
    attended?: boolean;
}

export interface Feedback {
    id: string; // userId
    eventId: string;
    userId: string;
    userName: string;
    rating: number; // 1-5
    comment: string;
    createdAt: number;
}

export type NotificationType = 'GENERAL' | 'URGENT' | 'EVENT';

export interface Notification {
    id: string;
    title: string;
    message: string;
    clubId: string;
    clubName: string;
    type: NotificationType;
    createdAt: number;
    authorId?: string;
    authorName?: string;
}

export interface Team {
    id: string;
    eventId: string;
    name: string;
    leaderId: string;
    memberIds: string[]; // includes leaderId
    members: { uid: string; name: string; email: string }[];
    status: 'INCOMPLETE' | 'COMPLETE';
    createdAt: number;
}

export interface TeamRequest {
    id: string;
    teamId: string;
    teamName: string;
    eventId: string;
    senderId: string;
    senderName: string;
    receiverId: string;
    receiverEmail: string;
    status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
    createdAt: number;
}

export interface ProjectSubmission {
    id: string; // User ID or Team ID
    eventId: string;
    isTeamSubmission: boolean;
    submitterId: string; // The user who submitted
    submitterName?: string;
    teamId?: string;
    teamName?: string;
    data: Record<string, string>; // Responses to the fields
    submittedAt: number;
}
