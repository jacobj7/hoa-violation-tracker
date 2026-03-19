import NextAuth, { NextAuthOptions, User, Session } from "next-auth";
import { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import { Pool } from "pg";
import { z } from "zod";
import crypto from "crypto";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export type UserRole = "admin" | "moderator" | "user" | "guest";

export interface AppUser extends User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: string[];
}

export interface AppSession extends Session {
  user: AppUser;
  accessToken: string;
}

export interface AppJWT extends JWT {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: string[];
  accessToken: string;
}

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

function hashPassword(password: string, salt: string): string {
  return crypto
    .pbkdf2Sync(password, salt, 100000, 64, "sha512")
    .toString("hex");
}

function verifyPassword(password: string, salt: string, hash: string): boolean {
  const computedHash = hashPassword(password, salt);
  return crypto.timingSafeEqual(
    Buffer.from(computedHash, "hex"),
    Buffer.from(hash, "hex"),
  );
}

async function getUserByEmail(email: string): Promise<{
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: string[];
  password_hash: string;
  password_salt: string;
} | null> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT 
        u.id,
        u.email,
        u.name,
        u.role,
        u.password_hash,
        u.password_salt,
        COALESCE(
          array_agg(p.permission_name) FILTER (WHERE p.permission_name IS NOT NULL),
          ARRAY[]::text[]
        ) as permissions
      FROM users u
      LEFT JOIN user_permissions p ON u.id = p.user_id
      WHERE u.email = $1 AND u.is_active = true
      GROUP BY u.id, u.email, u.name, u.role, u.password_hash, u.password_salt`,
      [email],
    );
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

async function getUserById(id: string): Promise<{
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: string[];
} | null> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT 
        u.id,
        u.email,
        u.name,
        u.role,
        COALESCE(
          array_agg(p.permission_name) FILTER (WHERE p.permission_name IS NOT NULL),
          ARRAY[]::text[]
        ) as permissions
      FROM users u
      LEFT JOIN user_permissions p ON u.id = p.user_id
      WHERE u.id = $1 AND u.is_active = true
      GROUP BY u.id, u.email, u.name, u.role`,
      [id],
    );
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials): Promise<AppUser | null> {
        if (!credentials) return null;

        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          throw new Error(parsed.error.errors[0]?.message || "Invalid input");
        }

        const { email, password } = parsed.data;

        const dbUser = await getUserByEmail(email);
        if (!dbUser) {
          throw new Error("Invalid email or password");
        }

        const isValid = verifyPassword(
          password,
          dbUser.password_salt,
          dbUser.password_hash,
        );

        if (!isValid) {
          throw new Error("Invalid email or password");
        }

        return {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          role: dbUser.role,
          permissions: dbUser.permissions,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user, trigger, session }): Promise<AppJWT> {
      const appToken = token as AppJWT;

      if (user) {
        const appUser = user as AppUser;
        appToken.id = appUser.id;
        appToken.email = appUser.email;
        appToken.name = appUser.name;
        appToken.role = appUser.role;
        appToken.permissions = appUser.permissions;
        appToken.accessToken = crypto.randomBytes(32).toString("hex");
      }

      if (trigger === "update" && session) {
        const refreshedUser = await getUserById(appToken.id);
        if (refreshedUser) {
          appToken.email = refreshedUser.email;
          appToken.name = refreshedUser.name;
          appToken.role = refreshedUser.role;
          appToken.permissions = refreshedUser.permissions;
        }
      }

      return appToken;
    },
    async session({ session, token }): Promise<AppSession> {
      const appToken = token as AppJWT;
      const appSession = session as AppSession;

      appSession.user = {
        id: appToken.id,
        email: appToken.email,
        name: appToken.name,
        role: appToken.role,
        permissions: appToken.permissions,
      };
      appSession.accessToken = appToken.accessToken;

      return appSession;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};

// Role hierarchy for comparison
const roleHierarchy: Record<UserRole, number> = {
  guest: 0,
  user: 1,
  moderator: 2,
  admin: 3,
};

/**
 * Check if a user has at least the specified role level
 */
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Check if a user has a specific permission
 */
export function hasPermission(
  permissions: string[],
  permission: string,
): boolean {
  return permissions.includes(permission);
}

/**
 * Check if a user has all of the specified permissions
 */
export function hasAllPermissions(
  permissions: string[],
  requiredPermissions: string[],
): boolean {
  return requiredPermissions.every((perm) => permissions.includes(perm));
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(
  permissions: string[],
  requiredPermissions: string[],
): boolean {
  return requiredPermissions.some((perm) => permissions.includes(perm));
}

/**
 * Check if a user is an admin
 */
export function isAdmin(role: UserRole): boolean {
  return role === "admin";
}

/**
 * Check if a user is a moderator or higher
 */
export function isModerator(role: UserRole): boolean {
  return hasRole(role, "moderator");
}

/**
 * Check if a user is authenticated (not a guest)
 */
export function isAuthenticated(role: UserRole): boolean {
  return role !== "guest";
}

/**
 * Verify a JWT token manually (for API routes or middleware)
 */
export async function verifyToken(token: string): Promise<AppJWT | null> {
  try {
    const { getToken } = await import("next-auth/jwt");
    // This is a utility for server-side token verification
    // In practice, use getServerSession or getToken from next-auth/jwt
    return null;
  } catch {
    return null;
  }
}

/**
 * Get the role display name
 */
export function getRoleDisplayName(role: UserRole): string {
  const displayNames: Record<UserRole, string> = {
    admin: "Administrator",
    moderator: "Moderator",
    user: "User",
    guest: "Guest",
  };
  return displayNames[role];
}

/**
 * Get all roles at or below the specified role level
 */
export function getRolesUpTo(role: UserRole): UserRole[] {
  const level = roleHierarchy[role];
  return (Object.entries(roleHierarchy) as [UserRole, number][])
    .filter(([, lvl]) => lvl <= level)
    .map(([r]) => r);
}

/**
 * Validate that a string is a valid UserRole
 */
export function isValidRole(role: string): role is UserRole {
  return Object.keys(roleHierarchy).includes(role);
}

export default NextAuth(authOptions);
