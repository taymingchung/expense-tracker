import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://yhrogwhomqfofxdzhbjs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlocm9nd2hvbXFmb2Z4ZHpoYmpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4NzAyMzUsImV4cCI6MjA3OTQ0NjIzNX0.Xr1USyNJoPD_TRreSeR_d-SA0D_uRndJPgBcFn2gnK8',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      // THIS LINE FIXES THE BLANK PAGE AFTER GOOGLE LOGIN
      detectSessionInUrl: true
    }
  }
)