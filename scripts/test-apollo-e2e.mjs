#!/usr/bin/env node
/**
 * End-to-end test of the Apollo two-step flow:
 *   Step 1: Search (free) — POST /api/v1/mixed_people/api_search
 *   Step 2: Bulk enrich (costs credits) — POST /api/v1/people/bulk_match
 *
 * Usage:
 *   node --env-file=.env.local scripts/test-apollo-e2e.mjs
 */

const API_KEY = process.env.APOLLO_API_KEY;

if (!API_KEY) {
  console.error('ERROR: APOLLO_API_KEY not found in environment.');
  console.error('Run with: node --env-file=.env.local scripts/test-apollo-e2e.mjs');
  process.exit(1);
}

console.log(`Using API key: ${API_KEY.slice(0, 6)}...${API_KEY.slice(-4)}`);
console.log('');

// ─── Step 1: Search ──────────────────────────────────────────────────────────

console.log('═══════════════════════════════════════════════════');
console.log('  STEP 1: Apollo Search (api_search)');
console.log('═══════════════════════════════════════════════════');

const searchBody = {
  person_titles: ['Director', 'VP'],
  person_seniorities: ['director', 'vp'],
  organization_industries: ['financial services'],
  person_locations: ['New York, New York, United States'],
  per_page: 5,
  page: 1,
};

console.log('Request body:', JSON.stringify(searchBody, null, 2));
console.log('');

let searchData = null;
let searchOk = false;

try {
  const searchRes = await fetch('https://api.apollo.io/api/v1/mixed_people/api_search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'X-Api-Key': API_KEY,
    },
    body: JSON.stringify(searchBody),
  });

  console.log(`Status: ${searchRes.status} ${searchRes.statusText}`);
  console.log('Response headers:', Object.fromEntries(searchRes.headers.entries()));
  console.log('');

  searchData = await searchRes.json();
  searchOk = searchRes.ok;

  console.log('Top-level keys:', Object.keys(searchData).join(', '));
  console.log('Pagination:', JSON.stringify(searchData.pagination, null, 2));
  console.log(`People count: ${searchData.people?.length ?? 0}`);
  console.log('');

  if (searchData.people?.length > 0) {
    const first = searchData.people[0];
    console.log('--- First person ---');
    console.log('Keys:', Object.keys(first).join(', '));
    console.log(`Name: ${first.first_name} ${first.last_name}`);
    console.log(`Title: ${first.title}`);
    console.log(`Org: ${first.organization?.name || 'N/A'}`);
    console.log(`ID: ${first.id}`);
    console.log(`Email: ${first.email || '(none/obfuscated)'}`);
    console.log(`LinkedIn: ${first.linkedin_url || '(none)'}`);
    console.log('');
    console.log('Full first person JSON:');
    console.log(JSON.stringify(first, null, 2));
  } else {
    console.log('NO PEOPLE RETURNED.');
    console.log('Full response:');
    console.log(JSON.stringify(searchData, null, 2));
  }
} catch (err) {
  console.error('SEARCH REQUEST FAILED:', err.message);
  console.error(err);
}

console.log('');

// ─── Step 2: Bulk Enrich ─────────────────────────────────────────────────────

console.log('═══════════════════════════════════════════════════');
console.log('  STEP 2: Bulk Enrich (bulk_match)');
console.log('═══════════════════════════════════════════════════');

let enrichData = null;
let enrichOk = false;

if (!searchOk || !searchData?.people?.length) {
  console.log('SKIPPED: No people from Step 1 to enrich.');
} else {
  const apolloIds = searchData.people.map((p) => p.id);
  console.log(`Enriching ${apolloIds.length} IDs: ${apolloIds.join(', ')}`);
  console.log('');

  const enrichBody = {
    details: apolloIds.map((id) => ({ id })),
  };

  console.log('Request body:', JSON.stringify(enrichBody, null, 2));
  console.log('');

  try {
    const enrichUrl = 'https://api.apollo.io/api/v1/people/bulk_match?reveal_personal_emails=true';

    const enrichRes = await fetch(enrichUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': API_KEY,
      },
      body: JSON.stringify(enrichBody),
    });

    console.log(`Status: ${enrichRes.status} ${enrichRes.statusText}`);
    console.log('Response headers:', Object.fromEntries(enrichRes.headers.entries()));
    console.log('');

    enrichData = await enrichRes.json();
    enrichOk = enrichRes.ok;

    console.log('Top-level keys:', Object.keys(enrichData).join(', '));
    console.log(`matches count: ${enrichData.matches?.length ?? 'N/A'}`);
    console.log(`unique_enriched_records: ${enrichData.unique_enriched_records ?? 'N/A'}`);
    console.log(`credits_consumed: ${enrichData.credits_consumed ?? 'N/A'}`);
    console.log('');

    if (enrichData.matches?.length > 0) {
      const first = enrichData.matches[0];
      console.log('--- First enriched person ---');
      console.log('Keys:', Object.keys(first).join(', '));
      console.log(`Name: ${first.first_name} ${first.last_name}`);
      console.log(`Title: ${first.title}`);
      console.log(`Org: ${first.organization?.name || 'N/A'}`);
      console.log(`Email: ${first.email || '(none)'}`);
      console.log(`Phone: ${first.phone_numbers?.[0]?.raw_number || first.organization?.phone || '(none)'}`);
      console.log(`LinkedIn: ${first.linkedin_url || '(none)'}`);
      console.log('');
      console.log('Full first enriched person JSON:');
      console.log(JSON.stringify(first, null, 2));
    } else {
      console.log('NO MATCHES RETURNED.');
      console.log('Full response:');
      console.log(JSON.stringify(enrichData, null, 2));
    }
  } catch (err) {
    console.error('ENRICH REQUEST FAILED:', err.message);
    console.error(err);
  }
}

console.log('');

// ─── Step 3: Summary ─────────────────────────────────────────────────────────

console.log('═══════════════════════════════════════════════════');
console.log('  SUMMARY');
console.log('═══════════════════════════════════════════════════');
console.log(`Step 1 (Search):   ${searchOk ? 'SUCCESS' : 'FAILED'} — ${searchData?.people?.length ?? 0} people returned`);
console.log(`Step 2 (Enrich):   ${enrichOk ? 'SUCCESS' : (searchOk ? 'FAILED' : 'SKIPPED')} — ${enrichData?.matches?.length ?? 0} matches, ${enrichData?.credits_consumed ?? 0} credits consumed`);
console.log(`Two-step flow:     ${searchOk && enrichOk ? 'WORKING END-TO-END' : 'BROKEN'}`);
