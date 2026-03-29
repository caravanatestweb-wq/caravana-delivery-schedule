// This script uses the Supabase Management / Admin REST API to set RLS policies
// for the delivery-photos storage bucket so the app can upload photos.

// NOTE: We use the anon key here because we're calling the SQL editor equivalent via RPC

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xyzyjcwgjwopljomtxev.supabase.co';

// Try with anon key first - if fails, we need the service role key from dashboard
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5enlqY3dnandvcGxqb210eGV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NzAxODksImV4cCI6MjA5MDI0NjE4OX0.UfQwWmRjYSwMclRrTtjnwJw64wd1iamE-V5LnXttuBY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpload() {
  const testPixel = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    'base64'
  );
  
  console.log('Testing upload to delivery-photos bucket...');
  const { data, error } = await supabase.storage
    .from('delivery-photos')
    .upload(`test/test-${Date.now()}.png`, testPixel, { contentType: 'image/png', upsert: true });

  if (error) {
    console.error('❌ Upload failed:', error);
    console.log('\nFull error object:', JSON.stringify(error, null, 2));
  } else {
    const { data: { publicUrl } } = supabase.storage.from('delivery-photos').getPublicUrl(data.path);
    console.log('✅ Upload succeeded! Public URL:', publicUrl);
  }
}

testUpload();
