import { AuthOptions } from 'next-auth'
import DiscordProvider from 'next-auth/providers/discord'
import { prisma } from '@/lib/prisma'
import { getGuildMember, isLeadership, discordAvatar, hasMinimumAccess, SITE_OWNER_DISCORD_ID } from '@/lib/discord'

export const authOptions: AuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: { params: { scope: 'identify guilds guilds.members.read' } },
    }),
  ],
  session: { strategy: 'jwt' as const, maxAge: 30 * 24 * 60 * 60 },
  secret: process.env.NEXTAUTH_SECRET,
  // FIX: Am eliminat linia trustHost de aici pentru ca Next-Auth v4 sa nu mai dea eroare la build
  callbacks: {
    async signIn({ account, profile }) {
      if (!account || !profile) return false
      const discordId = (profile as any).id as string
      const isSiteOwner = discordId === SITE_OWNER_DISCORD_ID

      let member = null
      if (!isSiteOwner) {
        try {
          member = await getGuildMember(discordId)
        } catch (e) {
          return '/auth/error?error=bot_error'
        }
        if (!member) return '/auth/error?error=not_in_guild'
      }

      const roleIds: string[] = isSiteOwner ? [SITE_OWNER_DISCORD_ID] : (member?.roles || [])
      const existingUser = await prisma.user.findUnique({ where: { discordId } })
      if (existingUser?.banned) return '/auth/error?error=banned'
      if (!isSiteOwner && !hasMinimumAccess(roleIds)) return '/auth/error?error=no_grade'
      
      await prisma.user.upsert({
        where: { discordId },
        update: { username: (profile as any).username, avatar: (profile as any).avatar, roleIds },
        create: { discordId, username: (profile as any).username, avatar: (profile as any).avatar, roleIds },
      })
      return true
    },
    async jwt({ token, account, profile }) {
      if (account && profile) {
        const discordId = (profile as any).id as string
        const isSiteOwner = discordId === SITE_OWNER_DISCORD_ID
        await new Promise(r => setTimeout(r, 500))
        const user = await prisma.user.findUnique({ where: { discordId } })
        if (user) {
          token.userId = user.id
          token.discordId = discordId
          token.roleIds = isSiteOwner ? [SITE_OWNER_DISCORD_ID] : user.roleIds
          token.isLeadership = true
          token.avatar = discordAvatar(discordId, (profile as any).avatar)
          token.username = user.username
        }
        token.lastVerified = Date.now()
        return token
      }
      const lastVerified = (token.lastVerified as number) || 0
      if (Date.now() - lastVerified > 24 * 60 * 60 * 1000) {
        const discordId = token.discordId as string
        if (discordId) {
          // The site owner is permanently trusted and is not dependent on Discord guild membership.
          if (discordId === SITE_OWNER_DISCORD_ID) {
            token.roleIds = [SITE_OWNER_DISCORD_ID]
            token.isLeadership = true
            token.lastVerified = Date.now()
            return token
          }

          let member
          try { member = await getGuildMember(discordId) } catch { member = null }
          if (!member || !hasMinimumAccess(member.roles || [])) return { ...token, invalid: true }
          const user = await prisma.user.findUnique({ where: { discordId } })
          if (user?.banned) return { ...token, invalid: true }
          token.roleIds = member.roles
          token.isLeadership = isLeadership(member.roles)
          token.lastVerified = Date.now()
          if (user) await prisma.user.update({ where: { discordId }, data: { roleIds: member.roles } })
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token.invalid) return { ...session, user: undefined, expires: new Date(0).toISOString() } as any
      if (session.user) {
        (session.user as any).id = token.userId as string;
        (session.user as any).discordId = token.discordId as string;
        (session.user as any).roleIds = token.roleIds as string[];
        (session.user as any).isLeadership = token.isLeadership as boolean;
        session.user.image = token.avatar as string;
        session.user.name = token.username as string;
      }
      return session
    },
  },
  pages: { signIn: '/auth/login', error: '/auth/error' },
}
