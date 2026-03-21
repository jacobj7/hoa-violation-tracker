export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "board_member" | "resident" | "property_manager";
  communityId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Community {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  description: string | null;
  logoUrl: string | null;
  settings: CommunitySettings;
  createdAt: string;
  updatedAt: string;
}

export interface CommunitySettings {
  currency: string;
  timezone: string;
  violationGracePeriodDays: number;
  fineEscalationEnabled: boolean;
  autoNoticeEnabled: boolean;
  maxDisputeDays: number;
}

export interface Property {
  id: string;
  communityId: string;
  address: string;
  unit: string | null;
  lotNumber: string | null;
  ownerId: string | null;
  residentId: string | null;
  propertyType: "single_family" | "condo" | "townhouse" | "commercial";
  status: "active" | "inactive" | "foreclosure";
  createdAt: string;
  updatedAt: string;
}

export interface ViolationType {
  id: string;
  communityId: string;
  name: string;
  description: string;
  category: string;
  defaultFineAmount: number;
  escalationFineAmount: number | null;
  escalationAfterDays: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Violation {
  id: string;
  communityId: string;
  propertyId: string;
  violationTypeId: string;
  reportedById: string;
  assignedToId: string | null;
  status: "open" | "pending_review" | "resolved" | "escalated" | "dismissed";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  notes: string | null;
  incidentDate: string;
  dueDate: string | null;
  resolvedDate: string | null;
  evidenceUrls: string[];
  createdAt: string;
  updatedAt: string;
  property?: Property;
  violationType?: ViolationType;
  reportedBy?: User;
  fines?: Fine[];
  notices?: Notice[];
}

export interface Notice {
  id: string;
  communityId: string;
  violationId: string;
  propertyId: string;
  recipientId: string;
  sentById: string;
  type: "warning" | "formal_notice" | "final_notice" | "legal_notice";
  status: "draft" | "sent" | "delivered" | "failed";
  subject: string;
  body: string;
  sentAt: string | null;
  deliveredAt: string | null;
  aiGenerated: boolean;
  createdAt: string;
  updatedAt: string;
  violation?: Violation;
  recipient?: User;
}

export interface Dispute {
  id: string;
  communityId: string;
  violationId: string;
  filedById: string;
  reviewedById: string | null;
  status: "pending" | "under_review" | "approved" | "rejected" | "withdrawn";
  reason: string;
  evidence: string | null;
  evidenceUrls: string[];
  reviewNotes: string | null;
  resolution: string | null;
  filedAt: string;
  reviewedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  violation?: Violation;
  filedBy?: User;
  reviewedBy?: User | null;
}

export interface Fine {
  id: string;
  communityId: string;
  violationId: string;
  propertyId: string;
  issuedToId: string;
  issuedById: string;
  amount: number;
  status: "pending" | "paid" | "waived" | "disputed" | "overdue";
  dueDate: string;
  paidDate: string | null;
  waivedDate: string | null;
  waivedById: string | null;
  waivedReason: string | null;
  notes: string | null;
  isEscalated: boolean;
  createdAt: string;
  updatedAt: string;
  violation?: Violation;
  issuedTo?: User;
  property?: Property;
}

export interface AuditLog {
  id: string;
  communityId: string;
  userId: string | null;
  entityType:
    | "violation"
    | "notice"
    | "dispute"
    | "fine"
    | "property"
    | "user"
    | "community"
    | "violation_type";
  entityId: string;
  action: "create" | "update" | "delete" | "status_change" | "send" | "payment";
  previousValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  user?: User | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  message: string;
  code: string;
  details?: Record<string, unknown>;
}

export interface DashboardStats {
  totalViolations: number;
  openViolations: number;
  resolvedViolations: number;
  escalatedViolations: number;
  pendingDisputes: number;
  totalFinesAmount: number;
  collectedFinesAmount: number;
  pendingFinesAmount: number;
  recentViolations: Violation[];
  violationsByType: ViolationTypeCount[];
  violationsByStatus: ViolationStatusCount[];
  finesByMonth: FinesByMonth[];
}

export interface ViolationTypeCount {
  violationTypeName: string;
  count: number;
}

export interface ViolationStatusCount {
  status: string;
  count: number;
}

export interface FinesByMonth {
  month: string;
  total: number;
  collected: number;
}

export interface NoticeGenerationRequest {
  violationId: string;
  noticeType: Notice["type"];
  recipientId: string;
  additionalContext?: string;
}

export interface NoticeGenerationResponse {
  subject: string;
  body: string;
}

export type ViolationStatus = Violation["status"];
export type ViolationSeverity = Violation["severity"];
export type NoticeType = Notice["type"];
export type NoticeStatus = Notice["status"];
export type DisputeStatus = Dispute["status"];
export type FineStatus = Fine["status"];
export type UserRole = User["role"];
export type PropertyType = Property["propertyType"];
export type PropertyStatus = Property["status"];
export type AuditEntityType = AuditLog["entityType"];
export type AuditAction = AuditLog["action"];
