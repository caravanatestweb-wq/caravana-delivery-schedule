import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://czbscpsmsamkgngfqygej.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6YnNjcG1zYW1rZ25nZnF5Z2VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MjEyMzMsImV4cCI6MjA5MDE5NzIzM30.dlaOrDIxNGxRbzja5728Yf3d9VRasDZatEG7Gt2TDh0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSync() {
  console.log('Fetching deliveries...');
  const { data, error } = await supabase.from('deliveries').select('*');
  
  if (error) {
    console.error('Error fetching deliveries:', error);
    return;
  }
  
  console.log(`Found ${data.length} deliveries.`);
  data.forEach(d => {
    console.log(`- [${d.id}] ${d.client_name} (Scheduled by: ${d.scheduled_by || 'Unknown'})`);
  });

  console.log('\nTesting Real-time connection...');
  const channel = supabase
    .channel('test-channel')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, (payload) => {
      console.log('Change received!', payload);
    })
    .subscribe((status) => {
      console.log('Subscription status:', status);
      if (status === 'SUBSCRIBED') {
        console.log('Successfully subscribed to real-time changes!');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('Failed to subscribe to real-time changes. Recheck replication settings.');
      }
    });

  // Keep script alive for a few seconds to check status
  setTimeout(() => {
    console.log('Done.');
    process.exit(0);
  }, 5000);
}

checkSync();
