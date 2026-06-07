import NextAuth, { AuthOptions } from 'next-auth'
import DiscordProvider from 'next-auth/providers/discord'
import { prisma } from '@/lib/prisma'
import { getGuildMember, isLeadership, discordAvatar } from '@/lib/discord'

export const authOptions: AuthOptions = {
  providers: [
    DiscordProvider({
      clientId:     process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: { params: { scope: 'identify guilds guilds.members.read' } },
    }),
  ],

  callbacks: {
    async signIn({ account, profile }) {
      if (!account || !profile) return false
      const discordId = profile.id as string

      // 1. Verificare server
      let member
      try { member = await getGuildMember(discordId) } catch { return '/auth/error?error=bot_error' }
      if (!member) return '/auth/error?error=not_in_guild'

      // 2. Upsert user în DB
      const roleIds: string[] = member.roles || []
      await prisma.user.upsert({
        where:  { discordId },
        update: { username: (profile as any).username, avatar: (profile as any).avatar, roleIds },
        create: { discordId, username: (profile as any).username, avatar: (profile as any).avatar, roleIds },
      })

      return true
    },

    async jwt({ token, account, profile }) {
      if (account && profile) {
        const discordId = profile.id as string
        const user = await prisma.user.findUnique({ where: { discordId } })
        if (user) {
          token.userId      = user.id
          token.discordId   = discordId
          token.roleIds     = user.roleIds
          token.isLeadership = isLeadership(user.roleIds)
          token.avatar      = discordAvatar(discordId, (profile as any).avatar)
          token.username    = user.username
        }
      }
      return token
    },

    async session({ session, token }) {
      session.user.id           = token.userId as string
      session.user.discordId    = token.discordId as string
      session.user.roleIds      = token.roleIds as string[]
      session.user.isLeadership = token.isLeadership as boolean
      session.user.image        = token.avatar as string
      session.user.name         = token.username as string
      return session
    },
  },

  pages: {
    signIn:  '/auth/login',
    error:   '/auth/error',
  },

  session: { strategy: 'jwt', maxAge: 24 * 60 * 60 },
  secret:  process.env.NEXTAUTH_SECRET,
}

export default NextAuth(authOptions)
