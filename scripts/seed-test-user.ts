import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const TEST_EMAIL = 'test@lottovibe.com';
const TEST_PASSWORD = 'test1234';

async function seed() {
  console.log('Creating test account...');

  // Check if user already exists
  const { data: existing } = await supabase.auth.admin.listUsers();
  const alreadyExists = existing?.users?.find((u) => u.email === TEST_EMAIL);

  if (alreadyExists) {
    console.log(`Test user already exists (${alreadyExists.id})`);
    console.log(`\n  Email:    ${TEST_EMAIL}`);
    console.log(`  Password: ${TEST_PASSWORD}\n`);
    return;
  }

  // Create auth user (auto-confirmed)
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  });

  if (authError) {
    console.error('Failed to create auth user:', authError.message);
    process.exit(1);
  }

  const userId = authData.user.id;
  console.log(`Auth user created: ${userId}`);

  // Create public.users row (in case trigger hasn't been set up yet)
  const { error: profileError } = await supabase
    .from('users')
    .upsert({
      id: userId,
      vibe_chips: 0,
      vibe_coins: 0,
      is_shadowbanned: false,
    }, { onConflict: 'id' });

  if (profileError) {
    console.error('Failed to create user profile:', profileError.message);
    console.log('(The auth user was still created — you may need to add the users row manually)');
  } else {
    console.log('User profile created in public.users');
  }

  console.log('\n--- Test Account ---');
  console.log(`  Email:    ${TEST_EMAIL}`);
  console.log(`  Password: ${TEST_PASSWORD}`);
  console.log('--------------------\n');
}

seed().catch(console.error);
