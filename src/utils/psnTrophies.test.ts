import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeAchievementsPayload,
  parsePsnGameTrophiesHtml,
  resolveGameInput,
} from './psnTrophies';

test('resolveGameInput extracts title and URL from PSNProfiles trophy or guide links', () => {
  const fromTrophy = resolveGameInput('https://psnprofiles.com/trophies/15494-elden-ring');
  assert.equal(fromTrophy.title, 'Elden Ring');
  assert.equal(fromTrophy.psnUrl, 'https://psnprofiles.com/trophies/15494-elden-ring');

  const fromGuide = resolveGameInput(
    'https://psnprofiles.com/guide/14631-elden-ring-trophy-guide'
  );
  assert.equal(fromGuide.title, 'Elden Ring');

  const fromTitleOnly = resolveGameInput('Ghost of Tsushima');
  assert.equal(fromTitleOnly.title, 'Ghost of Tsushima');
  assert.equal(fromTitleOnly.psnUrl, undefined);
});

test('parsePsnGameTrophiesHtml extracts trophy rows and rejects Cloudflare pages', () => {
  assert.equal(
    parsePsnGameTrophiesHtml('<html><title>Just a moment...</title></html>'),
    null
  );

  const sampleHtml = `
    <table>
      <tr>
        <td><a class="title" href="/trophy/1">Elden Ring</a><br />Obtained all trophies</td>
        <td><img title="Platinum" src="/plat.png" /></td>
      </tr>
      <tr>
        <td><a class="title" href="/trophy/2">Shardbearer Radahn</a><br />Defeat Starscourge Radahn</td>
        <td><img title="Silver" src="/silver.png" /></td>
      </tr>
      <tr>
        <td><a class="title" href="/trophy/3">Legendary Armaments</a><br />Acquire all legendary armaments</td>
        <td><img title="Gold" src="/gold.png" /></td>
      </tr>
    </table>
  `;
  const parsed = parsePsnGameTrophiesHtml(sampleHtml);
  assert.ok(parsed);
  assert.equal(parsed.length, 3);
  assert.equal(parsed[0].title, 'Elden Ring');
  assert.equal(parsed[0].grade, 'Platinum');
  assert.equal(parsed[1].type, 'story');
  assert.equal(parsed[2].type, 'achievement');
});

test('normalizeAchievementsPayload deduplicates and formats unchecked checklist items', () => {
  const items = normalizeAchievementsPayload([
    { title: 'Elden Ring', grade: 'Platinum', description: 'Obtained all trophies', type: 'achievement' },
    { title: 'Elden Ring', grade: 'Platinum', description: 'Duplicate', type: 'achievement' },
    { title: 'Defeat Margit', type: 'story', description: 'Fell Omen at Stormveil' },
  ]);

  assert.equal(items.length, 2);
  assert.equal(items[0].completed, false);
  assert.equal(items[0].description, 'Platinum · Obtained all trophies');
  assert.equal(items[1].type, 'story');
});
