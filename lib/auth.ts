import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const client = await pool.connect();
        try {
          const result = await client.query(
            "SELECT id, email, role, community_id, password_hash FROM users WHERE email = $1",
            [credentials.email],
          );

          const user = result.rows[0];

          if (!user) {
            throw new Error("No user found with this email");
          }

          const isPasswordValid = await compare(
            credentials.password,
            user.password_hash,
          );

          if (!isPasswordValid) {
            throw new Error("Invalid password");
          }

          return {
            id: String(user.id),
            email: user.email,
            role: user.role,
            community_id: user.community_id,
          };
        } finally {
          client.release();
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.role = (user as any).role;
        token.community_id = (user as any).community_id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        (session.user as any).role = token.role;
        (session.user as any).community_id = token.community_id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
