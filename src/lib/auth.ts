import NextAuth, { AuthOptions } from 'next-auth'
import AuthOptions from 'next-auth'
import DiscordProvider from 'next-auth/providers/discord'
import { prisma } from '@/lib/prisma'
import { getGuildMember, isLeadership, discordAvatar, hasMinimumAccess } from '@/lib/discord'
import { PrismaClient } from '@prisma/client'

export const authOptions: AuthOptions = {
const prisma = new PrismaClient()

export const authOptions = {
  providers: [
    DiscordProvider({
      clientId:     process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: { params: { scope: 'identify guilds guilds.members.read' } },
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
    async signIn({ account }: any) {
      return true
    },

            async jwt({ token, account, profile }) {
    async jwt({ token, account, profile }: any) {
      if (account && profile) {
        const discordId = (profile as any).id as string
        console.log(`[JWT] Looking up user: ${discordId}`)
        // Delay mic ca sa astepte upsert-ul din signIn
        await new Promise(r => setTimeout(r, 500))
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
        token.discordId = profile.id
        // Next-Auth preia nativ rolurile din profilul Discord în token
        token.userRoles = (profile as any).roles || []
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
      }

      return token
    },

    async session({ session, token }) {
      if (token.invalid) {
        return { ...session, user: undefined, expires: new Date(0).toISOString() } as any
        // Injectăm stabil matricea de roluri în sesiune
        ;(session.user as any).roleIds = userRoles
        ;(session.user as any).username = session.user.name
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
    async redirect({ baseUrl }: { baseUrl: string }) {
      return baseUrl
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

export default NextAuth(authOptions)
