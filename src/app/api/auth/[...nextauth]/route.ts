import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const extendedAuthOptions = {
  ...authOptions,
  trustHost: true,
  callbacks: {
    ...authOptions.callbacks,
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
                avatar: profile.image_url || profile.avatar || null,
                roleIds: [],
                points: 0,
                banned: false
              }
            })
          }
        } catch (error) {
          console.error("Eroare la salvarea utilizatorului nou Prisma:", error)
          return true 
        }
      }
      return true
    },
    async session({ session, token }: any) {
      // Forțăm Next-Auth să recunoască utilizatorul nou prin injectarea ID-ului corect din baza de date
      if (session?.user && token?.sub) {
        const dbUser = await prisma.user.findUnique({
          where: { discordId: token.sub }
        })
        if (dbUser) {
          session.user.id = dbUser.id
          session.user.username = dbUser.username
        }
      }
      return session
    },
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
}

const handler = NextAuth(extendedAuthOptions)
export { handler as GET, handler as POST }
