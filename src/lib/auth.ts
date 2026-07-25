import NextAuth, { AuthOptions } from 'next-auth'
import DiscordProvider from 'next-auth/providers/discord'
import { prisma } from '@/lib/prisma'
import { getGuildMember, isLeadership, discordAvatar, hasMinimumAccess } from '@/lib/discord'

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
      if (!account || !profile) {
        console.log('[AUTH] No account or profile')
        return false
      }

      const discordId = (profile as any).id as string
      console.log(`[AUTH] Login attempt: ${discordId}`)

      let member
      try {
        member = await getGuildMember(discordId)
        console.log(`[AUTH] Member found:`, member ? 'yes' : 'no')
      } catch (e) {
        console.log(`[AUTH] Bot error:`, e)
        return '/auth/error?error=bot_error'
      }

      if (!member) {
        console.log(`[AUTH] Not in guild: ${discordId}`)
        return '/auth/error?error=not_in_guild'
      }

      const roleIds: string[] = member.roles || []
      console.log(`[AUTH] RoleIds:`, roleIds)
      console.log(`[AUTH] hasMinimumAccess:`, hasMinimumAccess(roleIds))

      const existingUser = await prisma.user.findUnique({ where: { discordId } })
      if (existingUser?.banned) {
        console.log(`[AUTH] User is banned: ${discordId}`)
        return '/auth/error?error=banned'
      }

      if (!hasMinimumAccess(roleIds)) {
        console.log(`[AUTH] No grade: ${discordId}`)
        return '/auth/error?error=no_grade'
      }

      await prisma.user.upsert({
        where:  { discordId },
        update: { username: (profile as any).username, avatar: (profile as any).avatar, roleIds },
        create: { discordId, username: (profile as any).username, avatar: (profile as any).avatar, roleIds },
      })

      console.log(`[AUTH] Login success: ${discordId}`)
      return true
    },

        async jwt({ token, account, profile }) {
      if (account && profile) {
        const discordId = (profile as any).id as string
        console.log(`[JWT] Looking up user: ${discordId}`)
        const user      = await prisma.user.findUnique({ where: { discordId } })
        console.log(`[JWT] User found:`, user ? user.id : 'null')
        if (user) {
          token.userId       = user.id
          token.discordId    = discordId
          token.roleIds      = user.roleIds
          token.isLeadership = isLeadership(user.roleIds)
          token.avatar       = discordAvatar(discordId, (profile as any).avatar)
          token.username     = user.username
        }
        token.lastVerified = Date.now()
        return token
      }

      const lastVerified = (token.lastVerified as number) || 0
      const oneDay        = 24 * 60 * 60 * 1000

      if (Date.now() - lastVerified > oneDay) {
        const discordId = token.discordId as string
        if (discordId) {
          let member
          try { member = await getGuildMember(discordId) } catch { member = null }

          if (!member) return { ...token, invalid: true }

          const roleIds: string[] = member.roles || []
          if (!hasMinimumAccess(roleIds)) return { ...token, invalid: true }

          const user = await prisma.user.findUnique({ where: { discordId } })
          if (user?.banned) return { ...token, invalid: true }

          token.roleIds      = roleIds
          token.isLeadership = isLeadership(roleIds)
          token.lastVerified = Date.now()

          if (user) {
            await prisma.user.update({
              where: { discordId },
              data:  { roleIds },
            })
          }
        }
      }

      return token
    },

    async session({ session, token }) {
      if (token.invalid) {
        return { ...session, user: undefined, expires: new Date(0).toISOString() } as any
      }

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
    signIn: '/auth/login',
    error:  '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge:   30 * 24 * 60 * 60,
  },
  cookies: {
    sessionToken: {
      name:    'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax' as const,
        path:     '/',
        secure:   true,
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

export default NextAuth(authOptions)
