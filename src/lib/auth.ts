import AuthOptions from 'next-auth'
import DiscordProvider from 'next-auth/providers/discord'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export const authOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID || '',
      clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
      // Îi cerem lui Discord să ne dea automat și comunitățile (guilds) la logare securizată
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
      return true
    },
    async jwt({ token, account, profile }: any) {
      if (account && profile) {
        token.discordId = profile.id
        // Next-Auth preia nativ rolurile din profilul Discord în token
        token.userRoles = (profile as any).roles || []
      }
      return token
    },
    async session({ session, token }: any) {
      if (session?.user && token?.discordId) {
        const userRoles = token.userRoles || []

        try {
          // Sincronizăm baza de date cu gradele reale luate de la Discord
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
            ;(session.user as any).id = newUser.id
            ;(session.user as any).roleIds = newUser.roleIds
          } else {
            const updatedUser = await prisma.user.update({
              where: { discordId: token.discordId },
              data: { roleIds: userRoles }
            })
            ;(session.user as any).id = updatedUser.id
            ;(session.user as any).roleIds = updatedUser.roleIds
          }
        } catch (error) {
          console.error("Eroare la scrierea gradelor în baza de date:", error)
        }

        // Injectăm stabil matricea de roluri în sesiune
        ;(session.user as any).roleIds = userRoles
        ;(session.user as any).username = session.user.name
      }
      return session
    },
    async redirect({ baseUrl }: { baseUrl: string }) {
      return baseUrl
    },
  },
}
