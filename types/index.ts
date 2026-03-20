export type UserRole = "admin" | "inspector" | "resident" | "board_member";

export type ViolationStatus =
  | "open"
  | "pending"
  | "resolved"
  | "closed"
  | "appealed";

export type ViolationSeverity = "low" | "medium" | "high" | "critical";

export type InspectionStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";

export type FineStatus = "pending" | "paid" | "waived" | "overdue" | "disputed";

export type HearingStatus =
  | "scheduled"
  | "completed"
  | "cancelled"
  | "postponed";

export type HearingOutcome = "upheld" | "dismissed" | "reduced" | "pending";

export type AuditAction =
  | "created"
  | "updated"
  | "deleted"
  | "status_changed"
  | "assigned"
  | "commented"
  | "fine_issued"
  | "fine_paid"
  | "hearing_scheduled"
  | "hearing_completed"
  | "inspection_scheduled"
  | "inspection_completed";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  avatarUrl?: string;
  communityId?: string;
  propertyIds?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Community {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone?: string;
  email?: string;
  website?: string;
  managementCompany?: string;
  totalUnits: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Property {
  id: string;
  communityId: string;
  address: string;
  unit?: string;
  city: string;
  state: string;
  zip: string;
  ownerName: string;
  ownerEmail?: string;
  ownerPhone?: string;
  tenantName?: string;
  tenantEmail?: string;
  tenantPhone?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  community?: Community;
  violations?: Violation[];
}

export interface Violation {
  id: string;
  communityId: string;
  propertyId: string;
  reportedById: string;
  assignedToId?: string;
  title: string;
  description: string;
  category: string;
  severity: ViolationSeverity;
  status: ViolationStatus;
  dueDate?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  imageUrls?: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  property?: Property;
  community?: Community;
  reportedBy?: User;
  assignedTo?: User;
  inspections?: Inspection[];
  fines?: Fine[];
  hearings?: Hearing[];
  auditEntries?: AuditEntry[];
}

export interface Inspection {
  id: string;
  violationId: string;
  inspectorId: string;
  propertyId: string;
  scheduledAt: Date;
  completedAt?: Date;
  status: InspectionStatus;
  findings?: string;
  recommendations?: string;
  imageUrls?: string[];
  followUpRequired: boolean;
  followUpDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  violation?: Violation;
  inspector?: User;
  property?: Property;
}

export interface Fine {
  id: string;
  violationId: string;
  propertyId: string;
  issuedById: string;
  amount: number;
  currency: string;
  status: FineStatus;
  dueDate: Date;
  paidAt?: Date;
  waivedAt?: Date;
  waivedById?: string;
  waivedReason?: string;
  description?: string;
  referenceNumber?: string;
  createdAt: Date;
  updatedAt: Date;
  violation?: Violation;
  property?: Property;
  issuedBy?: User;
  waivedBy?: User;
}

export interface Hearing {
  id: string;
  violationId: string;
  propertyId: string;
  scheduledById: string;
  scheduledAt: Date;
  location?: string;
  virtualMeetingUrl?: string;
  status: HearingStatus;
  outcome?: HearingOutcome;
  notes?: string;
  attendees?: string[];
  recordingUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  violation?: Violation;
  property?: Property;
  scheduledBy?: User;
}

export interface AuditEntry {
  id: string;
  entityType:
    | "violation"
    | "inspection"
    | "fine"
    | "hearing"
    | "property"
    | "user";
  entityId: string;
  action: AuditAction;
  performedById: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  performedBy?: User;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ViolationFilters {
  communityId?: string;
  propertyId?: string;
  status?: ViolationStatus | ViolationStatus[];
  severity?: ViolationSeverity | ViolationSeverity[];
  category?: string;
  assignedToId?: string;
  reportedById?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

export interface DashboardStats {
  totalViolations: number;
  openViolations: number;
  resolvedViolations: number;
  pendingInspections: number;
  overdueViolations: number;
  totalFinesIssued: number;
  totalFinesCollected: number;
  upcomingHearings: number;
  violationsByCategory: Record<string, number>;
  violationsBySeverity: Record<ViolationSeverity, number>;
  violationsByStatus: Record<ViolationStatus, number>;
  recentActivity: AuditEntry[];
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
