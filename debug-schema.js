import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xyzyjcwgjwopljomtxev.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5enlqY3dnandvcGxqb210eGV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NzAxODksImV4cCI6MjA5MDI0NjE4OX0.UfQwWmRjYSwMclRrTtjnwJw64wd1iamE-V5LnXttuBY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('Fetching a single delivery to check keys...');
  const { data, error } = await supabase.from('deliveries').select('*').limit(1);
  
  if (error) {
    console.error('Error with select *:', error);
  } else {
    console.log('Select * worked (empty or data).');
  }

  const colsToCheck = [
    ['client_name', 'clientName'],
    ['time_window', 'timeWindow'],
    ['scheduled_by', 'scheduledBy'],
    ['photo_urls', 'photoUrls'],
    ['packing_list', 'packingList'],
    ['address', 'address'],
    ['phone', 'phone'],
    ['status', 'status'],
    ['notes', 'notes'],
    ['source', 'source'],
    ['date', 'date']
  ];

  for (const [snake, camel] of colsToCheck) {
    console.log(`Checking ${snake} vs ${camel}...`);
    const { error: e1 } = await supabase.from('deliveries').select(snake).limit(1);
    if (!e1) console.log(`  ✅ ${snake} exists`);
    else console.log(`  ❌ ${snake} missing: ${e1.message}`);

    const { error: e2 } = await supabase.from('deliveries').select(camel).limit(1);
    if (!e2) console.log(`  ✅ ${camel} exists`);
    else console.log(`  ❌ ${camel} missing: ${e2.message}`);
  }
}

checkSchema();
