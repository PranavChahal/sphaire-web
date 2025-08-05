import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Database types for TypeScript
export interface DesignFile {
  id: string
  owner_id: string
  name: string
  content?: string
  bucket_key?: string
  is_shared: boolean
  shared_with: string[]
  created_at: string
  updated_at?: string
}

export interface Database {
  public: {
    Tables: {
      design_files: {
        Row: DesignFile
        Insert: Omit<DesignFile, 'id' | 'created_at' | 'updated_at'> & {
          id?: string
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Omit<DesignFile, 'id'>>
      }
    }
  }
}
