import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://xvnlbqlpsvudkcbclygg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2bmxicWxwc3Z1ZGtjYmNseWdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwOTAyMTMsImV4cCI6MjA4MTY2NjIxM30.ncRpteBdOtDZ4BRu_qZnFi9pIbH3Is6d7AGEsPKpquM";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
