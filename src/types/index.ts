export type Role = 'platform_admin' | 'college_admin' | 'club_admin' | 'student';

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
    adminIds: string[]; // UIDs of students who manage this club
    createdAt: number;
}

export type EventScope = 'COLLEGE_ONLY' | 'GLOBAL';

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
    createdBy?: string;
    status?: 'UPCOMING' | 'LIVE' | 'ENDED';
    certificatesIssued?: boolean;
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
