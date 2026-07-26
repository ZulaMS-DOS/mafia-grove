import NextAuth from 'next-auth'
import DiscordProvider from 'next-auth/providers/discord'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const authOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID || '',
      clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
      // Îi cerem lui Discord să ne dea și comunitățile (guilds) la logare
      authorization: { params: { scope: 'identify email guilds' } },
    }),
  ],
  session: {
    strategy: 'jwt' as const,
  },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  callbacks: {
    async signIn({ account }: any) {
      // Permitem trecerea inițială pentru a evita erorile de rețea în browser
      return true
    },
    async jwt({ token, account, profile }: any) {
      if (account && profile) {
        token.discordId = profile.id
        token.userRoles = (profile as any).roles || []
      }
      return token
    },
    async session({ session, token }: any) {
      if (session?.user && token?.discordId) {
        // Preluăm rolurile permise din setările Railway
        const allowedRolesString = process.env.DISCORD_LEADERSHIP_ROLES || '';
        const allowedRoles = allowedRolesString.split(',').map(r => String(r).trim());

        // Verificăm gradele trimise direct în token-ul securizat de Discord
        const userRoles: string[] = token.userRoles || [];
        const hasMinimumAccess = userRoles.some((roleId: string) => allowedRoles.includes(roleId));

        try {
          const dbUser = await prisma.user.findUnique({
            where: { discordId: token.discordId }
          })

          if (!dbUser) {
            const newUser = await prisma.user.create({
              data: {
                discordId: token.discordId,
                username: session.user.name || 'Discord User',
                avatar: session.user.image || null,
                roleIds: userRoles,
                points: 0,
                banned: false
              }
            })
            session.user.id = newUser.id
            session.user.roleIds = newUser.roleIds
          } else {
            const updatedUser = await prisma.user.update({
              where: { discordId: token.discordId },
              data: { roleIds: userRoles }
            })
            session.user.id = updatedUser.id
            session.user.roleIds = updatedUser.roleIds
          }
        } catch (error) {
          console.error("Eroare la sincronizarea bazei de date:", error)
        }

        // Dacă după verificare utilizatorul nu are grad, îi punem marcajul de redirecționare
        if (!hasMinimumAccess) {
          session.user.noGradeRedirect = true;
        }
      }
      return session
    },
    async redirect({ baseUrl }: { baseUrl: string }) {
      return baseUrl
    },
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
