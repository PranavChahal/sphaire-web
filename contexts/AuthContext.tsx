import React, { createContext, useContext } from 'react'

interface AuthContextType {
  user: null
  session: null
  loading: false
  signIn: (email: string, password: string) => Promise<any>
  signUp: (email: string, password: string) => Promise<any>
  signInWithGoogle: () => Promise<any>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const value: AuthContextType = {
    user: null,
    session: null,
    loading: false,
    signIn: async () => ({ data: null, error: null }),
    signUp: async () => ({ data: null, error: null }),
    signInWithGoogle: async () => ({ data: null, error: null }),
    signOut: async () => {},
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
