# 🏚️ MAFIA GROVE — Ghid Complet Deploy pe Railway

## Ce e diferit față de înainte
- **Next.js 15** — framework complet, nu un simplu HTML
- **PostgreSQL** — baza de date reală, datele se salvează permanent
- **NextAuth** — autentificare profesională cu Discord
- **Prisma ORM** — gestionare baza de date simpla

---

## PASUL 1 — Adaugă PostgreSQL pe Railway

1. Mergi la **railway.app** → proiectul tău `grove-street-backend`
2. Click **"+ New"** → **Database** → **PostgreSQL**
3. Railway creează baza de date automat
4. Click pe baza de date → **Variables** → copiază **DATABASE_URL**

---

## PASUL 2 — Creează proiect nou pe Railway pentru Next.js

1. Pe Railway → **New Project** → **Deploy from GitHub**
2. Urcă TOATE fișierele pe GitHub (într-un repo nou `mafia-grove`)
3. Selectează repo-ul
4. Railway detectează Next.js automat

---

## PASUL 3 — Variabile de mediu pe Railway

Mergi la **Variables** și adaugă:

| Variabilă | Valoare |
|-----------|---------|
| `DATABASE_URL` | URL-ul PostgreSQL de la pasul 1 |
| `NEXTAUTH_URL` | `https://URL-TAU.railway.app` |
| `NEXTAUTH_SECRET` | Un șir random lung (ex: `openssl rand -base64 32`) |
| `DISCORD_CLIENT_ID` | `1512845196012818684` |
| `DISCORD_CLIENT_SECRET` | Secretul din Developer Portal |
| `DISCORD_BOT_TOKEN` | Token-ul botului Grove |
| `DISCORD_GUILD_ID` | `955119735060701264` |
| `DISCORD_LEADERSHIP_ROLES` | `955126889171804170,955126890472022066` |

---

## PASUL 4 — Discord Developer Portal

1. Mergi la aplicația ta → **OAuth2 → Redirects**
2. Adaugă:
```
https://URL-TAU.railway.app/api/auth/callback/discord
```
3. **Save Changes**

> ⚠️ URL-ul de callback pentru NextAuth este MEREU `/api/auth/callback/discord`

---

## PASUL 5 — Generare NEXTAUTH_SECRET

Deschide un terminal și rulează:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```
Sau folosește: https://generate-secret.vercel.app/32

---

## PASUL 6 — Verificare

1. Deschide `https://URL-TAU.railway.app`
2. Click **Login cu Discord**
3. Autorizează
4. Dacă ești pe server → intri în dashboard ✅

---

## SISTEM ROLURI

Rolurile de Leadership sunt detectate **automat din Discord**:
- `955126889171804170` → Leadership
- `955126890472022066` → Admin Mafia

Oricine are unul din aceste roluri pe serverul Discord vede panoul Leadership.
**Nu mai trebuie să dai tu grade manual** — Discord dictează accesul.

---

## TROUBLESHOOTING

**"Nu ai acces la platformă"**
→ Nu ești pe serverul `955119735060701264`

**Redirect URI mismatch**
→ Asigură-te că în Developer Portal e exact: `/api/auth/callback/discord`

**DATABASE_URL error**
→ Verifică că ai copiat URL-ul corect de la PostgreSQL Railway

**Build eșuat**
→ Verifică că ai toate fișierele urcate pe GitHub inclusiv `prisma/schema.prisma`
