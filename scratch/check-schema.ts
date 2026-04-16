import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function reloadSchema() {
  const { error } = await supabase.rpc('reload_schema');
  // If RPC doesn't exist, try a raw SQL notify if possible
  // But usually, a simple request to a table will show if it's working.
  
  console.log('Attempting to check go_gigs columns...');
  const { data, error: fetchError } = await supabase
    .from('go_gigs')
    .select('*')
    .limit(1);

  if (fetchError) {
    console.error('Fetch Error:', fetchError);
  } else {
    console.log('Actual columns in DB:', Object.keys(data?.[0] || {}));
  }
}

reloadSchema();
