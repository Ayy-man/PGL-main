#!/usr/bin/env node
/**
 * Quick test of Apollo.io Search API — inspect full response shape.
 * Run: node scripts/test-apollo.mjs
 */

const API_KEY = 'edpzjt1ci2v28XWBIbTWwg';

const body = {
  person_titles: ['CEO', 'Managing Director'],
  person_seniorities: ['c_suite'],
  person_locations: ['New York, New York, United States'],
  per_page: 3,
  page: 1,
};

const res = await fetch('https://api.apollo.io/api/v1/mixed_people/api_search', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    'X-Api-Key': API_KEY,
  },
  body: JSON.stringify(body),
});

const data = await res.json();

// Show pagination shape
console.log('=== PAGINATION ===');
console.log(JSON.stringify(data.pagination, null, 2));

// Show first person's full shape
console.log('\n=== FIRST PERSON (full keys) ===');
if (data.people?.[0]) {
  const p = data.people[0];
  console.log('Top-level keys:', Object.keys(p).join(', '));
  console.log(JSON.stringify(p, null, 2));
}

// Show all people names
console.log('\n=== ALL PEOPLE ===');
for (const p of (data.people || [])) {
  console.log(`  ${p.first_name} ${p.last_name} — ${p.title} @ ${p.organization?.name || 'N/A'}`);
}
