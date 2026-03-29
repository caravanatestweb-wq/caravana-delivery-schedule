import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xyzyjcwgjwopljomtxev.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5enlqY3dnandvcGxqb210eGV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2NzAxODksImV4cCI6MjA5MDI0NjE4OX0.UfQwWmRjYSwMclRrTtjnwJw64wd1iamE-V5LnXttuBY';

export const supabase = createClient(supabaseUrl, supabaseKey);
