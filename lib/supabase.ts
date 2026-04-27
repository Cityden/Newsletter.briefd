import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

// Server-side client met service role key (omzeilt RLS — alleen in API routes gebruiken)
export const supabase = createClient(supabaseUrl, supabaseServiceKey)
