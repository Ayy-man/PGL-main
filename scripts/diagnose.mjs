#!/usr/bin/env node
/**
 * Diagnostic script — checks state of all Supabase tables and auth users.
 * Run: node scripts/diagnose.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const envContent = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
function env(name) {
  const match = envContent.match(new RegExp(`^${name}=(.+)$`, 'm'));
  return match ? match[1].trim() : null;
}

const supabase = createClient(env('NEXT_PUBLIC_SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log('\n=== PGL LUXURY BUYER FINDER — DATABASE DIAGNOSTIC ===\n');

// Check all tables
const tables = ['tenants', 'users', 'personas', 'prospects', 'lists', 'list_members',
                'prospect_summaries', 'sec_transactions', 'usage_metrics_daily', 'activity_log'];

for (const table of tables) {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
  if (error) {
    console.log(`📋 ${table}: ERROR — ${error.message}`);
    continue;
  }
  const { data: sample } = await supabase.from(table).select('*').limit(2);
  console.log(`📋 ${table}: ${count} rows`);
  if (sample && sample.length > 0) {
    for (const row of sample) {
      const keys = Object.keys(row).filter(k => !['created_at', 'updated_at'].includes(k));
      const preview = {};
      for (const k of keys.slice(0, 5)) {
        const val = row[k];
        preview[k] = typeof val === 'string' && val.length > 50 ? val.slice(0, 50) + '...' : val;
      }
      console.log(`   → ${JSON.stringify(preview)}`);
    }
  }
}

// Check auth users
console.log('\n=== AUTH USERS ===\n');
const { data: authData, error: authErr } = await supabase.auth.admin.listUsers({ perPage: 50 });
if (authErr) {
  console.log(`Error listing auth users: ${authErr.message}`);
} else {
  for (const user of authData.users) {
    console.log(`👤 ${user.email}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   app_metadata: ${JSON.stringify(user.app_metadata || {})}`);
    console.log(`   confirmed: ${!!user.email_confirmed_at}`);
    console.log('');
  }
}

// Summary
console.log('=== ISSUES ===\n');
const issues = [];

const { count: tc } = await supabase.from('tenants').select('*', { count: 'exact', head: true });
const { count: uc } = await supabase.from('users').select('*', { count: 'exact', head: true });
const { count: pc } = await supabase.from('personas').select('*', { count: 'exact', head: true });

if (tc === 0) issues.push('❌ No tenants');
if (uc === 0) issues.push('❌ No users in public.users');
if (pc === 0) issues.push('❌ No personas');

if (authData?.users) {
  for (const user of authData.users) {
    if (!user.app_metadata?.role) issues.push(`❌ ${user.email} missing app_metadata.role`);
    if (user.app_metadata?.role !== 'super_admin' && !user.app_metadata?.tenant_id) {
      issues.push(`❌ ${user.email} missing app_metadata.tenant_id`);
    }
  }
}

if (issues.length === 0) {
  console.log('✅ Everything looks good! App should be functional.');
} else {
  for (const i of issues) console.log(`  ${i}`);
}
console.log('');
