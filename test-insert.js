import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xyzyjcwgjwopljomtxev.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5enlqY3dnandvcGxqb210eGV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NzAxODksImV4cCI6MjA5MDI0NjE4OX0.UfQwWmRjYSwMclRrTtjnwJw64wd1iamE-V5LnXttuBY';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
  const payload = {
    id: crypto.randomUUID(),
    date: '2026-03-30',
    timeWindow: '08:00 AM - 10:00 AM',
    source: 'Caravana store',
    scheduledBy: 'Test Agent',
    clientName: 'Test Client API',
    address: '123 Test St',
    phone: '555-1234',
    status: 'Scheduled',
    notes: 'Testing insert from script',
    packingList: [{ id: 1, text: 'Test Item' }],
    photoUrls: []
  };

  console.log('Inserting payload:', payload);

  const { data, error } = await supabase.from('deliveries').insert([payload]).select();

  if (error) {
    console.error('❌ Error inserting:', error);
  } else {
    console.log('✅ Success! Inserted data:', data);
  }
}

testInsert();
