// Supabase has been removed — this file is kept as a stub for type compatibility

export const supabase = null as any

// Database types for TypeScript (kept for compatibility)
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
