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
    async signIn({ profile, account }: any) {
      if (account?.provider === 'discord' && profile) {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { discordId: profile.id }
          })

          if (!existingUser) {
            await prisma.user.create({
              data: {
                discordId: profile.id,
                username: profile.username || profile.global_name || 'Discord User',
                avatar: profile.image || profile.image_url || profile.avatar || null,
                roleIds: [],
                points: 0,
                banned: false
              }
            })
          }
        } catch (error) {
          console.error("Eroare la crearea utilizatorului nou:", error)
        }
      }
      return true // Permite logarea oricui trece de Discord, fără verificări blocate de roluri vechi
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
        }
      }
      return session
    },
    async redirect({ baseUrl }: { baseUrl: string }) {
      return baseUrl // Trimite garantat utilizatorul pe prima pagina a site-ului
    },
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
