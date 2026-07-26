import NextAuth from 'next-auth'
import DiscordProvider from 'next-auth/providers/discord'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const authOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID || '',
      clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
      authorization: { params: { scope: 'identify email guilds.members.read' } },
    }),
  ],
  session: {
    strategy: 'jwt' as const,
  },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  callbacks: {
    async signIn({ profile, account }: any) {
      if (account?.provider === 'discord' && profile) {
        // 1. Preluăm gradele autorizate din variabila ta din Railway
        const allowedRolesString = process.env.DISCORD_LEADERSHIP_ROLES || '';
        const allowedRoles = allowedRolesString.split(',').map(r => r.trim());

        // 2. Citim rolurile utilizatorului trimise securizat de Discord la logare
        // Next-Auth v4 pune rolurile din token-ul Discord direct în profile.roles
        const userRoles = profile.roles || [];

        // 3. Verificăm dacă utilizatorul deține cel puțin un grad autorizat
        const hasMinimumAccess = userRoles.some((roleId: string) => allowedRoles.includes(roleId));

        if (!hasMinimumAccess) {
          // Dacă NU are gradul, îl trimitem direct către pagina ta cu cheia 'no_grade'
          return '/auth/error?error=no_grade';
        }

        try {
          // Dacă are gradul, îl salvăm sau îi actualizăm datele în PostgreSQL
          const existingUser = await prisma.user.findUnique({
            where: { discordId: profile.id }
          })

          if (!existingUser) {
            await prisma.user.create({
              data: {
                discordId: profile.id,
                username: profile.username || profile.global_name || 'Discord User',
                avatar: profile.image || profile.image_url || profile.avatar || null,
                roleIds: userRoles,
                points: 0,
                banned: false
              }
            })
          } else {
            // Îi actualizăm rolurile în baza de date în caz că a primit grade noi pe Discord
            await prisma.user.update({
              where: { discordId: profile.id },
              data: { roleIds: userRoles }
            })
          }
        } catch (error) {
          console.error("Eroare la procesarea utilizatorului Prisma:", error)
        }
      }
      return true
    },
    async jwt({ token, account, profile }: any) {
      if (account && profile) {
        token.discordId = profile.id
      }
      return token
    },
    async session({ session, token }: any) {
      if (session?.user && token?.discordId) {
        const dbUser = await prisma.user.findUnique({
          where: { discordId: token.discordId }
        })
        if (dbUser) {
          session.user.id = dbUser.id
          session.user.username = dbUser.username
          session.user.roleIds = dbUser.roleIds
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
