export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "inspector" | "owner" | "viewer";
  createdAt: Date;
  updatedAt: Date;
}

export interface Owner {
  id: string;
  userId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  mailingAddress?: string;
  mailingCity?: string;
  mailingState?: string;
  mailingZip?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Property {
  id: string;
  ownerId: string;
  owner?: Owner;
  address: string;
  city: string;
  state: string;
  zip: string;
  parcelNumber?: string;
  propertyType:
    | "residential"
    | "commercial"
    | "industrial"
    | "mixed_use"
    | "vacant_land";
  lotSize?: number;
  buildingSize?: number;
  yearBuilt?: number;
  zoning?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ViolationCategory {
  id: string;
  name: string;
  code: string;
  description?: string;
  defaultFineAmount?: number;
  severity: "low" | "medium" | "high" | "critical";
  createdAt: Date;
  updatedAt: Date;
}

export interface Violation {
  id: string;
  propertyId: string;
  property?: Property;
  categoryId: string;
  category?: ViolationCategory;
  inspectorId: string;
  inspector?: User;
  title: string;
  description: string;
  status: "open" | "in_progress" | "resolved" | "closed" | "appealed";
  severity: "low" | "medium" | "high" | "critical";
  inspectionDate: Date;
  dueDate?: Date;
  resolvedDate?: Date;
  photos?: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Fine {
  id: string;
  violationId: string;
  violation?: Violation;
  propertyId: string;
  property?: Property;
  ownerId: string;
  owner?: Owner;
  amount: number;
  paidAmount: number;
  status: "pending" | "partial" | "paid" | "waived" | "appealed" | "overdue";
  issuedDate: Date;
  dueDate: Date;
  paidDate?: Date;
  waivedDate?: Date;
  waivedReason?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notice {
  id: string;
  violationId?: string;
  violation?: Violation;
  fineId?: string;
  fine?: Fine;
  propertyId: string;
  property?: Property;
  ownerId: string;
  owner?: Owner;
  type:
    | "warning"
    | "citation"
    | "final_notice"
    | "hearing_notice"
    | "compliance_notice"
    | "lien_notice";
  status: "draft" | "sent" | "delivered" | "returned" | "failed";
  subject: string;
  body: string;
  sentAt?: Date;
  deliveredAt?: Date;
  sentVia?: "email" | "mail" | "hand_delivery" | "certified_mail";
  trackingNumber?: string;
  generatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  userId?: string;
  user?: User;
  action: string;
  entityType:
    | "user"
    | "property"
    | "owner"
    | "violation"
    | "fine"
    | "notice"
    | "violation_category";
  entityId: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
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

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
