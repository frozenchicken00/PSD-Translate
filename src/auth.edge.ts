import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"

// Edge-compatible NextAuth configuration (no Prisma adapter)
// This is used for middleware and other Edge runtime environments
export const { auth: edgeAuth } = NextAuth({
  providers: [GitHub, Google],
  // No adapter for Edge runtime - uses JWT instead of database
  session: {
    strategy: "jwt"
  },
  callbacks: {
    // Add user ID to the session token for use in Edge 
    jwt: ({ token, user }) => {
      if (user) {
        token.id = user.id
      }
      return token
    },
    // Make user ID available in the session
    session: ({ session, token }) => ({
      ...session,
      user: {
        ...session.user,
        id: token.id as string,
      },
    }),
  },
  pages: {
    signOut: '/signin'
  },
}) 