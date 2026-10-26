import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { authService } from "@/lib/services/authService";
import { connectToDatabase, mongoose } from "@/lib/mongoose";

const providers: any[] = [
  CredentialsProvider({
    name: "Credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
      role: { label: "Role", type: "text" },
    },
    async authorize(credentials) {
      try {
        const rawEmail = (credentials?.email || "").trim().toLowerCase();
        const rawPassword = credentials?.password || "";
        const rawRole = (credentials?.role || "unified").trim();

        if (!rawEmail || !rawPassword) {
          throw new Error("Email and password are required");
        }

        // Call our unified login API
        const res = await authService.login({
          email: rawEmail,
          password: rawPassword,
          role: rawRole,
        });

        // Check response structure
        if (res && res.accessToken && res.user) {
          return {
            id: res.user.id.toString(),
            name: res.user.name,
            email: res.user.email,
            token: res.accessToken,
            role: res.user.roleName || "customer",
            user_id: res.user.id,
            refreshToken: res.refreshToken,
            affiliateId: res.user.affiliateId,
            affiliateType: res.user.affiliateType,
            stripeCustomerId: res.user.stripeCustomerId || null,
          };
        }

        return null;
      } catch (error: any) {
        console.error("Authorization error:", error);
        throw new Error(error.message || "Login failed");
      }
    },
  }),
];

// Conditionally enable Google Provider if client credentials exist in environment
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

export const authOptions: any = {
  providers,

  pages: {
    signIn: "/account/login",
    error: "/account/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 1 day
  },

  callbacks: {
    async signIn({ user, account }: any) {
      if (account?.provider === "google") {
        try {
          await connectToDatabase();
          const db = mongoose.connection.db;
          if (db) {
            const email = (user.email || "").toLowerCase().trim();
            let dbUser = await db.collection("users").findOne({ email });

            if (!dbUser) {
              const lastUser = await db
                .collection("users")
                .find()
                .sort({ id: -1 })
                .limit(1)
                .toArray();
              const nextId = (lastUser[0]?.id || 0) + 1;
              const customerRole = await db.collection("roles").findOne({ name: "customer" });

              await db.collection("users").insertOne({
                id: nextId,
                name: user.name || "Customer",
                email,
                password: "",
                roleId: customerRole?.id || 2,
                isGuest: false,
                isVerified: true,
                googleId: account.providerAccountId || account.idToken,
                createdAt: new Date(),
                updatedAt: new Date(),
              });

              dbUser = await db.collection("users").findOne({ email });
            }

            const userRole = await db.collection("roles").findOne({ id: dbUser?.roleId });
            user.role = userRole?.name || "customer";
            user.user_id = dbUser?.id;
            user.id = dbUser?.id?.toString();
          }
        } catch (e) {
          console.error("Google signIn callback error:", e);
        }
      }
      return true;
    },

    async jwt({ token, user, trigger, session }: any) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.token = user.token;
        token.role = user.role;
        token.user_id = user.user_id;
        token.affiliateId = user.affiliateId;
        token.affiliateType = user.affiliateType;
        token.stripeCustomerId = user.stripeCustomerId;
      }

      if (trigger === "update" && session?.user) {
        token.stripeCustomerId = session.user.stripeCustomerId;
      }

      return token;
    },

    async session({ session, token }: any) {
      session.user = {
        id: token.id,
        name: token.name,
        email: token.email,
        token: token.token,
        role: token.role,
        user_id: token.user_id,
        affiliateId: token.affiliateId,
        affiliateType: token.affiliateType,
        stripeCustomerId: token.stripeCustomerId,
      };
      return session;
    },

    async redirect({ url, baseUrl }: any) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (url.startsWith(baseUrl)) return url;
      return baseUrl;
    },
  },

  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
