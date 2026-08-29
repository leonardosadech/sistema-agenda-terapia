import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ahphiqwkiwwalcebnnaw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFocGhpcXdraXd3YWxjZWJubmF3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5ODEyOTEsImV4cCI6MjEwMzU1NzI5MX0.PcjEMMh65JeyuOJcJvHelVYMVbcniybHu2t5Kwp5sbw'

export const supabase = createClient(supabaseUrl, supabaseKey)