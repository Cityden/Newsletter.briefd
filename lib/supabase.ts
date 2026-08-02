import { createClient } from '@supabase/supabase-js'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) throw new Error('NEXT_PUBLIC_SUPABASE_URL is niet ingesteld')
if (!process.env.SUPABASE_SERVICE_KEY) throw new Error('SUPABASE_SERVICE_KEY is niet ingesteld')

// Server-side client met service role key (omzeilt RLS). Alleen importeren in
// code die nooit naar de client bundelt: API routes en server components
// (bestanden zonder 'use client') — nooit in een 'use client'-bestand, anders
// komt de service-role key in de browser-JS terecht.
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)
