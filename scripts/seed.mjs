#!/usr/bin/env node
/**
 * Seed script — populates Supabase with minimum data to make the app functional.
 *
 * Creates:
 *   1. The W Team tenant (NYC luxury real estate)
 *   2. public.users rows for both auth users
 *   3. app_metadata on auth users (role + tenant_id)
 *   4. 5 starter personas for The W Team
 *   5. A sample list
 *
 * Run: node scripts/seed.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load env
const envContent = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
function env(name) {
  const match = envContent.match(new RegExp(`^${name}=(.+)$`, 'm'));
  return match ? match[1].trim() : null;
}

const SUPABASE_URL = env('NEXT_PUBLIC_SUPABASE_URL');
const SERVICE_ROLE_KEY = env('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Known auth user IDs from Supabase Auth dashboard
const ADMIN_UID = 'da1d6c0f-e515-4dc1-9bca-c132b88e444e';
const TENANT_USER_UID = 'bae20c13-be4e-4973-bb0b-5db24963f62c';

async function seed() {
  console.log('\n=== SEEDING PGL LUXURY BUYER FINDER ===\n');

  // ─── 1. Create The W Team Tenant ───
  console.log('1. Creating The W Team tenant...');
  const { data: tenant, error: tenantErr } = await supabase
    .from('tenants')
    .upsert({
      name: 'The W Team',
      slug: 'w-team',
      logo_url: null,
      primary_color: '#d4af37',
      secondary_color: '#f4d47f',
      is_active: true,
    }, { onConflict: 'slug' })
    .select()
    .single();

  if (tenantErr) {
    console.error('   Failed:', tenantErr.message);
    process.exit(1);
  }
  console.log(`   ✅ Tenant created: "${tenant.name}" (${tenant.id})`);
  const TENANT_ID = tenant.id;

  // ─── 2. Create public.users rows ───
  console.log('\n2. Creating public.users rows...');

  // Super admin (no tenant_id)
  const { error: adminUserErr } = await supabase
    .from('users')
    .upsert({
      id: ADMIN_UID,
      email: 'admin@pgl.com',
      full_name: 'PGL Admin',
      role: 'super_admin',
      tenant_id: null,
      is_active: true,
    }, { onConflict: 'id' });

  if (adminUserErr) {
    console.error('   Failed (admin):', adminUserErr.message);
    process.exit(1);
  }
  console.log('   ✅ admin@pgl.com → super_admin (no tenant)');

  // Tenant admin
  const { error: tenantUserErr } = await supabase
    .from('users')
    .upsert({
      id: TENANT_USER_UID,
      email: 'test-user@tenant.com',
      full_name: 'Maggie Wu',
      role: 'tenant_admin',
      tenant_id: TENANT_ID,
      is_active: true,
    }, { onConflict: 'id' });

  if (tenantUserErr) {
    console.error('   Failed (tenant user):', tenantUserErr.message);
    process.exit(1);
  }
  console.log(`   ✅ test-user@tenant.com → tenant_admin @ The W Team`);

  // ─── 3. Set app_metadata on auth users ───
  console.log('\n3. Setting auth user app_metadata...');

  const { error: adminMetaErr } = await supabase.auth.admin.updateUserById(ADMIN_UID, {
    app_metadata: { role: 'super_admin' },
  });
  if (adminMetaErr) {
    console.error('   Failed (admin meta):', adminMetaErr.message);
  } else {
    console.log('   ✅ admin@pgl.com → app_metadata.role = super_admin');
  }

  const { error: tenantMetaErr } = await supabase.auth.admin.updateUserById(TENANT_USER_UID, {
    app_metadata: { role: 'tenant_admin', tenant_id: TENANT_ID },
  });
  if (tenantMetaErr) {
    console.error('   Failed (tenant meta):', tenantMetaErr.message);
  } else {
    console.log(`   ✅ test-user@tenant.com → app_metadata.role = tenant_admin, tenant_id = ${TENANT_ID}`);
  }

  // ─── 4. Seed starter personas ───
  console.log('\n4. Seeding starter personas for The W Team...');

  const STARTER_PERSONAS = [
    {
      name: 'Finance Elite',
      description: 'C-suite at PE/VC firms, $100M+ AUM',
      filters: {
        titles: ['CEO', 'CFO', 'CIO', 'Managing Director', 'Managing Partner', 'Partner'],
        seniorities: ['c_suite', 'vp', 'director'],
        industries: ['Financial Services', 'Venture Capital & Private Equity', 'Investment Management'],
        companySize: ['51-200', '201-500', '501-1000', '1001-5000', '5001-10000'],
        keywords: 'private equity venture capital asset management',
      },
    },
    {
      name: 'Tech Execs',
      description: 'VP+ at unicorns or public tech companies',
      filters: {
        titles: ['VP', 'SVP', 'EVP', 'CTO', 'CPO', 'CEO'],
        seniorities: ['c_suite', 'vp'],
        industries: ['Computer Software', 'Internet', 'Information Technology and Services'],
        companySize: ['201-500', '501-1000', '1001-5000', '5001-10000', '10001+'],
        keywords: 'technology software SaaS',
      },
    },
    {
      name: 'Startup Founders',
      description: 'Founder/CEO, Series B+, tech sector',
      filters: {
        titles: ['Founder', 'Co-Founder', 'CEO', 'Co-CEO'],
        seniorities: ['c_suite', 'owner'],
        industries: ['Computer Software', 'Internet', 'Information Technology and Services', 'Financial Services'],
        companySize: ['11-50', '51-200', '201-500'],
        keywords: 'startup founder series',
      },
    },
    {
      name: 'BigLaw Partners',
      description: 'Partners at Am Law 200 firms',
      filters: {
        titles: ['Partner', 'Managing Partner', 'Senior Partner', 'Equity Partner', 'Named Partner'],
        seniorities: ['c_suite', 'vp', 'director', 'owner'],
        industries: ['Law Practice', 'Legal Services'],
        companySize: ['201-500', '501-1000', '1001-5000', '5001-10000'],
      },
    },
    {
      name: 'Crypto/Web3',
      description: 'Founder/Executive at crypto/blockchain companies',
      filters: {
        titles: ['Founder', 'Co-Founder', 'CEO', 'CTO', 'Head of'],
        seniorities: ['c_suite', 'vp', 'owner'],
        industries: ['Financial Services', 'Computer Software', 'Internet'],
        keywords: 'crypto blockchain web3 defi nft',
      },
    },
  ];

  const personaRows = STARTER_PERSONAS.map((p) => ({
    tenant_id: TENANT_ID,
    created_by: TENANT_USER_UID,
    name: p.name,
    description: p.description,
    filters: p.filters,
    is_starter: true,
    is_generated: false,
  }));

  const { error: personaErr } = await supabase.from('personas').upsert(personaRows, {
    onConflict: 'id',
  });

  if (personaErr) {
    console.error('   Failed:', personaErr.message);
  } else {
    console.log(`   ✅ ${STARTER_PERSONAS.length} starter personas seeded`);
  }

  // ─── 5. Create a sample list ───
  console.log('\n5. Creating sample list...');

  const { error: listErr } = await supabase.from('lists').insert({
    tenant_id: TENANT_ID,
    name: 'High Priority Prospects',
    description: 'Top UHNWI targets for Q1 outreach',
    created_by: TENANT_USER_UID,
  });

  if (listErr) {
    console.error('   Failed:', listErr.message);
  } else {
    console.log('   ✅ List "High Priority Prospects" created');
  }

  // ─── Final verification ───
  console.log('\n=== VERIFICATION ===\n');

  const tables = ['tenants', 'users', 'personas', 'lists'];
  for (const table of tables) {
    const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
    console.log(`   ${table}: ${count} rows`);
  }

  console.log('\n=== SEED COMPLETE ===');
  console.log('\nNext steps:');
  console.log('  1. Register Auth Hook in Supabase Dashboard:');
  console.log('     Authentication > Hooks > Custom Access Token > select public.custom_access_token_hook');
  console.log('  2. Log in at your Vercel URL:');
  console.log('     • admin@pgl.com → Super Admin panel');
  console.log('     • test-user@tenant.com → The W Team dashboard at /w-team');
  console.log('');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
