export type ViolationStatus =
  | "open"
  | "in_progress"
  | "resolved"
  | "closed"
  | "appealed";

export type NoticeSentMethod = "email" | "mail" | "hand_delivered" | "posted";

export type AuditEventType =
  | "violation_created"
  | "violation_updated"
  | "violation_status_changed"
  | "notice_sent"
  | "notice_generated"
  | "property_created"
  | "property_updated"
  | "user_login"
  | "user_logout"
  | "user_created"
  | "user_updated"
  | "comment_added"
  | "document_uploaded"
  | "appeal_submitted"
  | "appeal_resolved";

export type UserRole = "admin" | "inspector" | "supervisor" | "readonly";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  last_login_at?: Date | null;
}

export interface Property {
  id: string;
  parcel_number: string;
  address_line1: string;
  address_line2?: string | null;
  city: string;
  state: string;
  zip_code: string;
  owner_name: string;
  owner_email?: string | null;
  owner_phone?: string | null;
  owner_mailing_address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  zoning_code?: string | null;
  property_type?: string | null;
  lot_size_sqft?: number | null;
  year_built?: number | null;
  notes?: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ViolationCategory {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  severity: "low" | "medium" | "high" | "critical";
  default_fine_amount?: number | null;
  escalation_days?: number | null;
  parent_category_id?: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Violation {
  id: string;
  violation_number: string;
  property_id: string;
  category_id: string;
  assigned_inspector_id?: string | null;
  status: ViolationStatus;
  title: string;
  description: string;
  observed_at: Date;
  reported_at: Date;
  due_date?: Date | null;
  resolved_at?: Date | null;
  closed_at?: Date | null;
  fine_amount?: number | null;
  total_fines_accrued?: number | null;
  compliance_notes?: string | null;
  internal_notes?: string | null;
  location_description?: string | null;
  repeat_violation: boolean;
  appeal_submitted: boolean;
  appeal_submitted_at?: Date | null;
  appeal_resolved_at?: Date | null;
  appeal_outcome?: string | null;
  created_by_id?: string | null;
  created_at: Date;
  updated_at: Date;
  // Joined fields
  property?: Property;
  category?: ViolationCategory;
  assigned_inspector?: User;
  created_by?: User;
  notices?: Notice[];
}

export interface Notice {
  id: string;
  violation_id: string;
  generated_by_id?: string | null;
  notice_type: string;
  subject: string;
  body: string;
  recipient_name: string;
  recipient_email?: string | null;
  recipient_address?: string | null;
  sent_method?: NoticeSentMethod | null;
  sent_at?: Date | null;
  delivered_at?: Date | null;
  delivery_confirmed: boolean;
  delivery_confirmation_notes?: string | null;
  ai_generated: boolean;
  ai_model_used?: string | null;
  ai_prompt_tokens?: number | null;
  ai_completion_tokens?: number | null;
  template_id?: string | null;
  created_at: Date;
  updated_at: Date;
  // Joined fields
  violation?: Violation;
  generated_by?: User;
}

export interface AuditEvent {
  id: string;
  event_type: AuditEventType;
  user_id?: string | null;
  entity_type: string;
  entity_id: string;
  description: string;
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
  ip_address?: string | null;
  user_agent?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: Date;
  // Joined fields
  user?: User;
}

export interface NoticeTemplate {
  id: string;
  name: string;
  notice_type: string;
  subject_template: string;
  body_template: string;
  category_id?: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface ViolationComment {
  id: string;
  violation_id: string;
  user_id: string;
  comment: string;
  is_internal: boolean;
  created_at: Date;
  updated_at: Date;
  // Joined fields
  user?: User;
}

export interface ViolationDocument {
  id: string;
  violation_id: string;
  uploaded_by_id?: string | null;
  file_name: string;
  file_type: string;
  file_size_bytes: number;
  storage_path: string;
  description?: string | null;
  created_at: Date;
  // Joined fields
  uploaded_by?: User;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface ViolationFilters {
  status?: ViolationStatus | ViolationStatus[];
  category_id?: string;
  property_id?: string;
  assigned_inspector_id?: string;
  severity?: ViolationCategory["severity"];
  date_from?: Date;
  date_to?: Date;
  search?: string;
  repeat_violation?: boolean;
  appeal_submitted?: boolean;
}

export interface DashboardStats {
  total_violations: number;
  open_violations: number;
  in_progress_violations: number;
  resolved_violations: number;
  overdue_violations: number;
  violations_this_month: number;
  violations_last_month: number;
  total_fines_accrued: number;
  notices_sent_this_month: number;
  top_violation_categories: Array<{
    category_name: string;
    count: number;
  }>;
  violations_by_status: Array<{
    status: ViolationStatus;
    count: number;
  }>;
}
