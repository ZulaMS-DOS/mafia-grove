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
          // 1. Căutăm dacă utilizatorul există deja după ID-ul de Discord
          const existingUser = await prisma.user.findUnique({
            where: { discordId: profile.id }
          })

          // 2. Dacă nu există, îl creăm noi manual chiar acum
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
          // Returnăm true chiar și la eroare pentru a nu bloca navigarea, Next-Auth va face fallback session
          return true 
        }
      }
      return true
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
