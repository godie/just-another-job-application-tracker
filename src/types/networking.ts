export type NetworkRelationshipType =
  | 'recruiter'
  | 'hiring_manager'
  | 'referrer'
  | 'former_colleague'
  | 'mentor'
  | 'peer'
  | 'other';

export type InteractionChannel =
  | 'email'
  | 'linkedin'
  | 'phone'
  | 'video'
  | 'in_person'
  | 'event'
  | 'other';

export type InteractionStatus = 'planned' | 'completed';

export type ResourceType = 'application' | 'opportunity';

export type ReferralStatus =
  | 'planned'
  | 'requested'
  | 'introduced'
  | 'submitted'
  | 'declined'
  | 'completed';

export interface NetworkContact {
  id: string;
  name: string;
  company?: string;
  role?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
  location?: string;
  relationshipType: NetworkRelationshipType;
  tags: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface NetworkInteraction {
  id: string;
  contactId: string;
  occurredAt: string;
  channel: InteractionChannel;
  summary: string;
  notes: string;
  status: InteractionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface FollowUpTask {
  id: string;
  contactId: string;
  title: string;
  dueAt: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContactLink {
  id: string;
  contactId: string;
  resourceType: ResourceType;
  resourceId: string;
  createdAt: string;
}

export interface Referral {
  id: string;
  contactId: string;
  resourceType: ResourceType;
  resourceId: string;
  status: ReferralStatus;
  requestedAt: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface NetworkingWorkspace {
  schemaVersion: 1;
  contacts: NetworkContact[];
  interactions: NetworkInteraction[];
  followUpTasks: FollowUpTask[];
  contactLinks: ContactLink[];
  referrals: Referral[];
}
