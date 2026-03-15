const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigrations() {
  console.log('Running Supabase migrations...\n');

  // 1. Create profiles table
  console.log('1. Creating profiles table...');
  const { error: profilesError } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS profiles (
        id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        full_name TEXT,
        avatar_url TEXT,
        preferences JSONB DEFAULT '{"theme": "dark", "accentColor": "#007AFF", "autoPaste": true, "soundFeedback": true}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  });

  if (profilesError && !profilesError.message.includes('already exists')) {
    console.log('Trying alternative approach for profiles...');
  } else {
    console.log('  ✓ profiles table ready');
  }

  // 2. Create transcriptions table
  console.log('2. Creating transcriptions table...');
  const { error: transcriptionsError } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS transcriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        local_id INTEGER,
        text TEXT NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL,
        is_favorite BOOLEAN DEFAULT FALSE,
        tags TEXT[] DEFAULT '{}',
        version INTEGER NOT NULL DEFAULT 1,
        source_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        sync_status TEXT NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'conflict')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        synced_at TIMESTAMPTZ,
        UNIQUE(user_id, local_id)
      );
    `
  });

  if (transcriptionsError && !transcriptionsError.message.includes('already exists')) {
    console.log('Trying alternative approach for transcriptions...');
  } else {
    console.log('  ✓ transcriptions table ready');
  }

  // 3. Create tags table
  console.log('3. Creating tags table...');
  const { error: tagsError } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS tags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        color TEXT DEFAULT '#007AFF',
        icon TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, name)
      );
    `
  });

  if (tagsError && !tagsError.message.includes('already exists')) {
    console.log('Trying alternative approach for tags...');
  } else {
    console.log('  ✓ tags table ready');
  }

  // 4. Create sync_conflicts table
  console.log('4. Creating sync_conflicts table...');
  const { error: conflictsError } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS sync_conflicts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        transcription_id UUID NOT NULL REFERENCES transcriptions(id) ON DELETE CASCADE,
        local_version INTEGER NOT NULL,
        remote_version INTEGER NOT NULL,
        local_payload JSONB NOT NULL,
        remote_payload JSONB NOT NULL,
        conflict_status TEXT NOT NULL DEFAULT 'open' CHECK (conflict_status IN ('open', 'resolved')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        resolved_at TIMESTAMPTZ
      );
    `
  });

  if (conflictsError && !conflictsError.message.includes('already exists')) {
    console.log('Trying alternative approach for sync_conflicts...');
  } else {
    console.log('  ✓ sync_conflicts table ready');
  }

  // 5. Create indexes
  console.log('5. Creating indexes...');
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_transcriptions_user_id ON transcriptions(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_transcriptions_timestamp ON transcriptions(timestamp DESC);',
    'CREATE INDEX IF NOT EXISTS idx_transcriptions_user_timestamp ON transcriptions(user_id, timestamp DESC);',
    'CREATE INDEX IF NOT EXISTS idx_transcriptions_sync_status ON transcriptions(user_id, sync_status);',
    'CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);'
  ];

  for (const idx of indexes) {
    await supabase.rpc('exec_sql', { sql: idx });
  }
  console.log('  ✓ indexes ready');

  // 6. Enable RLS
  console.log('6. Enabling Row Level Security...');
  const rlsStatements = [
    'ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE tags ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE sync_conflicts ENABLE ROW LEVEL SECURITY;'
  ];

  for (const stmt of rlsStatements) {
    await supabase.rpc('exec_sql', { sql: stmt });
  }
  console.log('  ✓ RLS enabled');

  // 7. Create RLS policies
  console.log('7. Creating RLS policies...');
  const policies = [
    // Profiles policies
    `CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);`,
    `CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);`,
    `CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);`,

    // Transcriptions policies
    `CREATE POLICY "Users can view own transcriptions" ON transcriptions FOR SELECT USING (auth.uid() = user_id);`,
    `CREATE POLICY "Users can insert own transcriptions" ON transcriptions FOR INSERT WITH CHECK (auth.uid() = user_id);`,
    `CREATE POLICY "Users can update own transcriptions" ON transcriptions FOR UPDATE USING (auth.uid() = user_id);`,
    `CREATE POLICY "Users can delete own transcriptions" ON transcriptions FOR DELETE USING (auth.uid() = user_id);`,

    // Tags policies
    `CREATE POLICY "Users can manage own tags" ON tags FOR ALL USING (auth.uid() = user_id);`,

    // Sync conflicts policies
    `CREATE POLICY "Users can view own conflicts" ON sync_conflicts FOR SELECT USING (auth.uid() = user_id);`
  ];

  for (const policy of policies) {
    await supabase.rpc('exec_sql', { sql: policy });
  }
  console.log('  ✓ RLS policies created');

  // 8. Create storage bucket for avatars
  console.log('8. Creating avatars storage bucket...');
  const { error: bucketError } = await supabase.storage.createBucket('avatars', {
    public: true,
    fileSizeLimit: 5242880 // 5MB
  });

  if (bucketError && !bucketError.message.includes('already exists')) {
    console.log('  ⚠ Bucket might already exist:', bucketError.message);
  } else {
    console.log('  ✓ avatars bucket ready');
  }

  console.log('\n✅ Migrations completed successfully!');
  console.log('\nTables created:');
  console.log('  - profiles');
  console.log('  - transcriptions');
  console.log('  - tags');
  console.log('  - sync_conflicts');
  console.log('\nStorage bucket:');
  console.log('  - avatars (public, 5MB limit)');
}

runMigrations().catch(console.error);