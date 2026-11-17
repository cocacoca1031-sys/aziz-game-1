import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPsnGameLink,
  buildPsnProfileUrls,
  extractGameTitleFromPsnUrl,
  normalizePsnGameUrl,
  normalizePsnId,
  parsePsnProfileHtml,
} from './psnProfiles.ts';

test('normalizePsnId parses raw IDs and full psnprofiles.com URLs cleanly', () => {
  assert.equal(normalizePsnId('Hakoom'), 'Hakoom');
  assert.equal(normalizePsnId('@Aziz_Gamer-99'), 'Aziz_Gamer-99');
  assert.equal(normalizePsnId('https://psnprofiles.com/Hakoom'), 'Hakoom');
  assert.equal(normalizePsnId('https://www.psnprofiles.com/Hakoom/log'), 'Hakoom');
  assert.equal(normalizePsnId('psnprofiles.com/Player_One/advisor'), 'Player_One');
  assert.equal(normalizePsnId('https://psnprofiles.com/games'), null);
  assert.equal(normalizePsnId('https://example.com/Hakoom'), null);
  assert.equal(normalizePsnId('ab'), null);
});

test('buildPsnProfileUrls generates accurate PSNProfiles section URLs', () => {
  const urls = buildPsnProfileUrls('Hakoom');
  assert.equal(urls.profileUrl, 'https://psnprofiles.com/Hakoom');
  assert.equal(urls.trophyLogUrl, 'https://psnprofiles.com/Hakoom/log');
  assert.equal(urls.advisorUrl, 'https://psnprofiles.com/Hakoom/advisor');
  assert.equal(urls.guidesUrl, 'https://psnprofiles.com/guides');
});

test('normalizePsnGameUrl and buildPsnGameLink build safe game trophy URLs', () => {
  assert.equal(
    normalizePsnGameUrl('http://psnprofiles.com/trophies/15494-elden-ring'),
    'https://psnprofiles.com/trophies/15494-elden-ring'
  );
  assert.equal(normalizePsnGameUrl('https://evil.example/trophies/123'), undefined);
  assert.equal(
    buildPsnGameLink('Hollow Knight'),
    'https://psnprofiles.com/search/games?q=Hollow%20Knight'
  );
  assert.equal(
    buildPsnGameLink('Elden Ring', 'https://psnprofiles.com/trophies/15494-elden-ring'),
    'https://psnprofiles.com/trophies/15494-elden-ring'
  );
});

test('extractGameTitleFromPsnUrl derives readable title from trophy or guide slug', () => {
  assert.equal(
    extractGameTitleFromPsnUrl('https://psnprofiles.com/trophies/15494-elden-ring'),
    'Elden Ring'
  );
  assert.equal(
    extractGameTitleFromPsnUrl('https://psnprofiles.com/guide/14002-sekiro-shadows-die-twice-trophy-guide'),
    'Sekiro Shadows Die Twice Trophy Guide'
  );
  assert.equal(extractGameTitleFromPsnUrl('https://psnprofiles.com/Hakoom'), null);
});

test('parsePsnProfileHtml extracts trophy counts and rejects Cloudflare challenge pages', () => {
  assert.equal(parsePsnProfileHtml('<html><title>Just a moment...</title></html>', 'Hakoom'), null);

  const sampleHtml = `
    <ul>
      <li class="level">999</li>
      <li class="platinum">1,200</li>
      <li class="gold">5,432</li>
      <li class="silver">12,000</li>
      <li class="bronze">35,100</li>
    </ul>
    <div>Completion: 94.5%</div>
  `;
  const parsed = parsePsnProfileHtml(sampleHtml, 'Hakoom');
  assert.deepEqual(parsed, {
    psnId: 'Hakoom',
    level: 999,
    completionPct: '94.5%',
    platinum: 1200,
    gold: 5432,
    silver: 12000,
    bronze: 35100,
  });
});
