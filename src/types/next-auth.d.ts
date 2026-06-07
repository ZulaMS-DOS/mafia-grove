import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id:           string
      discordId:    string
      name:         string
      email?:       string
      image:        string
      roleIds:      string[]
      isLeadership: boolean
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId:       string
    discordId:    string
    roleIds:      string[]
    isLeadership: boolean
    avatar:       string
    username:     string
  }
}
