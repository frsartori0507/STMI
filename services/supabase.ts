
import { createClient } from '@supabase/supabase-js';

// Credenciais conectadas ao projeto uofkmbapxsmwplrbccma
const SUPABASE_URL = 'https://uofkmbapxsmwplrbccma.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_zZce7IGRrADX3VguP_fXAA_SQVcgIO7';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
