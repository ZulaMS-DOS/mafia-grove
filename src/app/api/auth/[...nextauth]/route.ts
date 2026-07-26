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
          // Folosim BOT-ul tău de Discord configurat în Railway pentru a interoga serverul tău securizat
          const guildId = process.env.DISCORD_GUILD_ID;
          const botToken = process.env.DISCORD_BOT_TOKEN;

          if (guildId && botToken) {
            const response = await fetch(
              `https://discord.com{guildId}/members/${profile.id}`,
              {
                headers: {
                  Authorization: `Bot ${botToken}`,
                },
              }
            );

            if (response.ok) {
              const memberData = await response.json();
              userRoles = memberData.roles || []; // Aici preluăm gradele reale și sigure ale omului!
            } else {
              console.error("Botul nu a putut citi membrul de pe Discord. Status:", response.status);
            }
          }
        } catch (err) {
          console.error("Eroare la conexiunea cu API Discord prin Bot:", err);
        }

        // Preluăm gradele permise din variabila ta din Railway
        const allowedRolesString = process.env.DISCORD_LEADERSHIP_ROLES || '';
        const allowedRoles = allowedRolesString.split(',').map(r => r.trim());

        // Verificăm dacă deține cel puțin un grad autorizat
        const hasMinimumAccess = userRoles.some((roleId: string) => allowedRoles.includes(roleId));

        if (!hasMinimumAccess) {
          // Dacă NU are gradul, îl trimitem la pagina de eroare
          return '/auth/error?error=no_grade';
        }

        try {
          // Dacă are gradul, îl salvăm sau îi actualizăm profilul
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
            // Sincronizăm gradele noi primite pe Discord
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
