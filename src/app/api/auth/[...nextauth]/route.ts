import NextAuth from 'next-auth'
import DiscordProvider from 'next-auth/providers/discord'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const authOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID || '',
      clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
      authorization: { params: { scope: 'identify email' } },
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
      // 1. Când utilizatorul se loghează, interogăm API-ul Discord prin Bot pentru a-i lua gradele reale
      if (account && profile) {
        token.discordId = profile.id
        let fetchedRoles: string[] = []

        try {
          const guildId = process.env.DISCORD_GUILD_ID
          const botToken = process.env.DISCORD_BOT_TOKEN

          if (guildId && botToken) {
            const url = "https://discord.com" + guildId + "/members/" + profile.id
            const response = await fetch(url, {
              headers: { Authorization: "Bot " + botToken },
            })

            if (response.ok) {
              const memberData = await response.json()
              if (memberData.roles && Array.isArray(memberData.roles)) {
                fetchedRoles = memberData.roles.map((r: any) => String(r).trim())
              }
            }
          }
        } catch (err) {
          console.error("Eroare la preluarea gradelor din Discord:", err)
        }

        // Salvăm gradele direct în token-ul securizat JWT
        token.userRoles = fetchedRoles
      }
      return token
    },
    async session({ session, token }: any) {
      if (session?.user && token?.discordId) {
        const userRoles = token.userRoles || []

        try {
          // 2. Sincronizăm baza de date PostgreSQL cu gradele proaspete luate prin Bot
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
          console.error("Eroare la scrierea gradelor în baza de date:", error)
        }

        // 3. Injectăm stabil matricea de roluri în sesiune pentru ca panourile să o poată citi corect
        session.user.roleIds = userRoles
        session.user.username = session.user.name
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
