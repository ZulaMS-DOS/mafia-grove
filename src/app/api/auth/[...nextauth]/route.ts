import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

// Adăugăm fixurile direct peste opțiunile importate
const extendedAuthOptions = {
  ...authOptions,
  trustHost: true,
  callbacks: {
    ...authOptions.callbacks,
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      // Dacă utilizatorul este nou sau redirectul e blocat, îl trimitem forțat pe pagina principală
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
}

const handler = NextAuth(extendedAuthOptions)
export { handler as GET, handler as POST }
