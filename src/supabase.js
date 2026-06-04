import { createClient } from '@supabase/supabase-js'
const URL = 'https://kxzqxaoxcdtalzdovlbx.supabase.co'
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4enF4YW94Y2R0YWx6ZG92bGJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1NDEzNTYsImV4cCI6MjA5NjExNzM1Nn0.0v3YEHg04m5V3O0J8R7dB2CfnkxqcXK2dSSc3EJnWqg'
export const supabase = createClient(URL, KEY)
