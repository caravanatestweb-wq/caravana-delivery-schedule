import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://czbscpsmsamkgngfqygej.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6YnNjcG1zYW1rZ25nZnF5Z2VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MjEyMzMsImV4cCI6MjA5MDE5NzIzM30.dlaOrDIxNGxRbzja5728Yf3d9VRasDZatEG7Gt2TDh0';

export const supabase = createClient(supabaseUrl, supabaseKey);
