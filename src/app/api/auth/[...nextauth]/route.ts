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
        let userRoles: string[] = [];

        try {
          const guildId = process.env.DISCORD_GUILD_ID;
          const botToken = process.env.DISCORD_BOT_TOKEN;

          if (guildId && botToken) {
            // METODA SIGURĂ: Lipim textul cu "+" ca să nu mai existe erori de ghilimele în GitHub
            const url = "https://discord.com" + guildId + "/members/" + profile.id;
            
            const response = await fetch(url, {
              headers: {
                Authorization: "Bot " + botToken,
              },
            });

            if (response.ok) {
              const memberData = await response.json();
              if (memberData.roles && Array.isArray(memberData.roles)) {
                userRoles = memberData.roles.map((roleId: any) => String(roleId).trim());
              }
            } else {
              console.error("Botul nu a putut citi membrul. Status:", response.status);
            }
          }
        } catch (err) {
          console.error("Eroare la conexiunea cu API Discord:", err);
        }

        const allowedRolesString = process.env.DISCORD_LEADERSHIP_ROLES || '';
        const allowedRoles = allowedRolesString.split(',').map(r => String(r).trim());

        const hasMinimumAccess = userRoles.some((roleId: string) => allowedRoles.includes(roleId));

        if (!hasMinimumAccess) {
          return '/auth/error?error=no_grade';
        }

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
                roleIds: userRoles,
                points: 0,
                banned: false
              }
            })
          } else {
            await prisma.user.update({
              where: { discordId: profile.id },
              data: { roleIds: userRoles }
            })
          }
        } catch (error) {
          console.error("Eroare la salvarea în baza de date:", error)
        }
      }
      return true
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
          session.user.roleIds = dbUser.roleIds
        }
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
