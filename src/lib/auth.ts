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
      if (!account || !profile) return false

      const discordId = (profile as any).id as string

      let member
      try { member = await getGuildMember(discordId) } catch { return '/auth/error?error=bot_error' }
      if (!member) return '/auth/error?error=not_in_guild'

      const roleIds: string[] = member.roles || []

      // Verifica daca e banat
      const existingUser = await prisma.user.findUnique({ where: { discordId } })
      if (existingUser?.banned) {
        return '/auth/error?error=banned'
      }

      // Verifica rol minim — Muncitor sau mai sus, altfel acces refuzat
      if (!hasMinimumAccess(roleIds)) {
        return '/auth/error?error=no_grade'
      }

      await prisma.user.upsert({
        where:  { discordId },
        update: { username: (profile as any).username, avatar: (profile as any).avatar, roleIds },
        create: { discordId, username: (profile as any).username, avatar: (profile as any).avatar, roleIds },
      })

      return true
    },

    async jwt({ token, account, profile }) {
      // La login initial, seteaza toate datele
      if (account && profile) {
        const discordId = (profile as any).id as string
        const user      = await prisma.user.findUnique({ where: { discordId } })
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

      // La fiecare verificare ulterioara a sesiunii (nu doar login),
      // re-verifica daca userul mai e pe server si daca mai are rol minim
      const lastVerified = (token.lastVerified as number) || 0
      const fiveMinutes  = 5 * 60 * 1000

      if (Date.now() - lastVerified > fiveMinutes) {
        const discordId = token.discordId as string
        if (discordId) {
          let member
          try { member = await getGuildMember(discordId) } catch { member = null }

          if (!member) {
            // Nu mai e pe server -> invalideaza tokenul
            return { ...token, invalid: true }
          }

          const roleIds: string[] = member.roles || []
          if (!hasMinimumAccess(roleIds)) {
            // Nu mai are rol minim -> invalideaza tokenul
            return { ...token, invalid: true }
          }

          const user = await prisma.user.findUnique({ where: { discordId } })
          if (user?.banned) {
            return { ...token, invalid: true }
          }

          // Actualizeaza rolurile in token + DB
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
      // Daca tokenul a fost marcat invalid, forteaza sesiune goala (deconectare efectiva)
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
    maxAge:   5 * 60,   // sesiunea expira complet dupa 5 minute
    updateAge: 0,        // re-verifica la fiecare request, nu doar periodic
  },
  secret: process.env.NEXTAUTH_SECRET,
}

export default NextAuth(authOptions)
