import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkSchema() {
  const { data, error } = await supabase
    .from('go_gigs')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error fetching go_gigs:', error);
  } else {
    console.log('Sample record keys:', Object.keys(data?.[0] || {}));
  }
}

checkSchema();
