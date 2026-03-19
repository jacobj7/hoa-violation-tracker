export type UserRole =
  | "admin"
  | "board_member"
  | "property_manager"
  | "resident"
  | "guest";

export type UserStatus = "active" | "inactive" | "suspended" | "pending";

export type PropertyType =
  | "single_family"
  | "townhouse"
  | "condo"
  | "apartment"
  | "commercial";

export type PropertyStatus =
  | "occupied"
  | "vacant"
  | "for_sale"
  | "for_rent"
  | "under_renovation";

export type ViolationStatus =
  | "open"
  | "under_review"
  | "notice_sent"
  | "hearing_scheduled"
  | "resolved"
  | "appealed"
  | "closed";

export type ViolationSeverity = "low" | "medium" | "high" | "critical";

export type EvidenceType = "photo" | "video" | "document" | "audio" | "other";

export type NoticeType =
  | "warning"
  | "courtesy"
  | "formal"
  | "final"
  | "hearing_notice"
  | "resolution";

export type NoticeStatus =
  | "draft"
  | "sent"
  | "delivered"
  | "acknowledged"
  | "failed";

export type FineStatus =
  | "pending"
  | "issued"
  | "paid"
  | "waived"
  | "disputed"
  | "overdue"
  | "collections";

export type HearingStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "postponed";

export type HearingOutcome =
  | "violation_upheld"
  | "violation_dismissed"
  | "fine_reduced"
  | "fine_waived"
  | "compliance_plan"
  | "pending";

export type AppealStatus =
  | "submitted"
  | "under_review"
  | "approved"
  | "denied"
  | "withdrawn"
  | "pending_hearing";

export interface Community {
  id: string;
  name: string;
  description: string | null;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  total_units: number;
  established_date: string | null;
  timezone: string;
  currency: string;
  is_active: boolean;
  settings: string | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  community_id: string | null;
  email: string;
  email_verified: string | null;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  phone_verified: boolean;
  avatar_url: string | null;
  role: UserRole;
  status: UserStatus;
  bio: string | null;
  date_of_birth: string | null;
  move_in_date: string | null;
  move_out_date: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  notification_preferences: string | null;
  last_login_at: string | null;
  password_hash: string | null;
  reset_token: string | null;
  reset_token_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Property {
  id: string;
  community_id: string;
  unit_number: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  zip_code: string;
  property_type: PropertyType;
  status: PropertyStatus;
  bedrooms: number | null;
  bathrooms: number | null;
  square_footage: number | null;
  lot_size: number | null;
  year_built: number | null;
  parking_spaces: number | null;
  parking_spot_numbers: string | null;
  monthly_hoa_fee: number | null;
  special_assessment: number | null;
  owner_id: string | null;
  tenant_id: string | null;
  lease_start_date: string | null;
  lease_end_date: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Violation {
  id: string;
  community_id: string;
  property_id: string;
  reported_by_user_id: string;
  assigned_to_user_id: string | null;
  violation_code: string | null;
  title: string;
  description: string;
  category: string;
  severity: ViolationSeverity;
  status: ViolationStatus;
  location_details: string | null;
  occurred_at: string | null;
  reported_at: string;
  inspection_date: string | null;
  due_date: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  repeat_violation: boolean;
  repeat_count: number;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Evidence {
  id: string;
  violation_id: string;
  uploaded_by_user_id: string;
  evidence_type: EvidenceType;
  file_name: string;
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  description: string | null;
  taken_at: string | null;
  location: string | null;
  is_primary: boolean;
  is_public: boolean;
  metadata: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notice {
  id: string;
  violation_id: string;
  community_id: string;
  sent_by_user_id: string;
  recipient_user_id: string;
  notice_type: NoticeType;
  status: NoticeStatus;
  subject: string;
  body: string;
  template_id: string | null;
  sent_via_email: boolean;
  sent_via_sms: boolean;
  sent_via_mail: boolean;
  sent_via_portal: boolean;
  sent_at: string | null;
  delivered_at: string | null;
  acknowledged_at: string | null;
  compliance_deadline: string | null;
  tracking_number: string | null;
  attachments: string | null;
  created_at: string;
  updated_at: string;
}

export interface Fine {
  id: string;
  violation_id: string;
  community_id: string;
  property_id: string;
  issued_to_user_id: string;
  issued_by_user_id: string;
  amount: number;
  currency: string;
  status: FineStatus;
  description: string | null;
  fine_date: string;
  due_date: string;
  paid_at: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  waived_at: string | null;
  waived_by_user_id: string | null;
  waive_reason: string | null;
  late_fee_applied: boolean;
  late_fee_amount: number | null;
  total_amount_due: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Hearing {
  id: string;
  violation_id: string;
  community_id: string;
  scheduled_by_user_id: string;
  presiding_officer_user_id: string | null;
  status: HearingStatus;
  outcome: HearingOutcome | null;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number;
  location: string | null;
  is_virtual: boolean;
  meeting_url: string | null;
  meeting_id: string | null;
  attendees: string | null;
  agenda: string | null;
  minutes: string | null;
  outcome_notes: string | null;
  outcome_date: string | null;
  follow_up_required: boolean;
  follow_up_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Appeal {
  id: string;
  violation_id: string;
  fine_id: string | null;
  hearing_id: string | null;
  community_id: string;
  submitted_by_user_id: string;
  reviewed_by_user_id: string | null;
  status: AppealStatus;
  grounds: string;
  description: string;
  supporting_documents: string | null;
  submitted_at: string;
  review_deadline: string | null;
  reviewed_at: string | null;
  decision: string | null;
  decision_notes: string | null;
  decision_date: string | null;
  hearing_requested: boolean;
  hearing_id_assigned: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ViolationWithRelations extends Violation {
  property?: Property;
  reported_by?: User;
  assigned_to?: User;
  evidence?: Evidence[];
  notices?: Notice[];
  fines?: Fine[];
  hearings?: Hearing[];
  appeals?: Appeal[];
}

export interface PropertyWithRelations extends Property {
  community?: Community;
  owner?: User;
  tenant?: User;
  violations?: Violation[];
}

export interface FineWithRelations extends Fine {
  violation?: Violation;
  property?: Property;
  issued_to?: User;
  issued_by?: User;
}

export interface HearingWithRelations extends Hearing {
  violation?: Violation;
  scheduled_by?: User;
  presiding_officer?: User;
}

export interface AppealWithRelations extends Appeal {
  violation?: Violation;
  fine?: Fine;
  hearing?: Hearing;
  submitted_by?: User;
  reviewed_by?: User;
}

export interface DashboardStats {
  total_violations: number;
  open_violations: number;
  resolved_violations: number;
  total_fines: number;
  pending_fines: number;
  collected_fines: number;
  total_properties: number;
  occupied_properties: number;
  upcoming_hearings: number;
  pending_appeals: number;
}

export interface ViolationFilters {
  status?: ViolationStatus;
  severity?: ViolationSeverity;
  category?: string;
  property_id?: string;
  assigned_to_user_id?: string;
  reported_by_user_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface FineFilters {
  status?: FineStatus;
  property_id?: string;
  issued_to_user_id?: string;
  date_from?: string;
  date_to?: string;
  min_amount?: number;
  max_amount?: number;
  page?: number;
  per_page?: number;
}
