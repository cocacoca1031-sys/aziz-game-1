import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildNewsBriefingScript,
  buildTelegramShareUrl,
  extractGroundingSources,
  formatPulseDigest,
  formatTelegramHtmlPulse,
  parseGamingNewsDigest,
  parseRssFeedXml,
  selectArticlesForPlatform,
  synthesizePulseFromFeedArticles,
} from './gamingNews';

test('parseGamingNewsDigest extracts 5 ranked headlines and summaries from agent template', () => {
  const sample = `🎮 **THE GAMING PULSE** 🔥
*Your top 5 biggest headlines this week:*

1️⃣ **Elden Ring Nightreign Launches Major Balance Update**
FromSoftware rolled out patch 1.04 tuning solo boss scaling and expedition rewards across PC and consoles. It solves the biggest solo progression bottleneck players flagged since launch.

2️⃣ **Nintendo Switch 2 Pre-Order Wave Expands Globally**
Nintendo confirmed additional retail stock allocations across North America and Europe ahead of next month's lineup. Players who missed day-one queues can now reserve hardware directly.

3️⃣ **Monster Hunter Wilds Adds Arch-Tempered Apex Hunt**
Capcom deployed its toughest limited-time event hunt with new gamma armor forging materials. Endgame hunters gain fresh build paths before the next title update.

4️⃣ **Valve SteamOS Expands Official Handheld Support**
Valve shipped beta builds supporting third-party AMD handhelds with unified shader caching and TDP controls. Portable PC gamers get console-like sleep/resume outside Steam Deck.

5️⃣ **Hollow Knight: Silksong Showcases Fresh Pharloom Boss Footage**
Team Cherry shared new combat clips highlighting Hornet's crest customization and Silk parry mechanics. The preview confirms expanded mobility tools for late-game gauntlets.`;

  const items = parseGamingNewsDigest(sample);
  assert.equal(items.length, 5);
  assert.equal(items[0].rank, 1);
  assert.equal(items[0].headline, 'Elden Ring Nightreign Launches Major Balance Update');
  assert.ok(items[0].summary.includes('FromSoftware rolled out patch 1.04'));
  assert.equal(items[4].rank, 5);
  assert.equal(items[4].headline, 'Hollow Knight: Silksong Showcases Fresh Pharloom Boss Footage');
});

test('formatPulseDigest outputs Telegram compatible digest and share URL', () => {
  const sampleItems = [
    {
      rank: 1,
      headline: 'PlayStation State of Play Announced & Timed',
      summary: 'Sony revealed a 40-minute showcase covering first-party PS5 releases.',
    },
  ];
  const formatted = formatPulseDigest(sampleItems);

  assert.ok(formatted.startsWith('🎮 *THE GAMING PULSE* 🔥'));
  assert.ok(formatted.includes('1️⃣ *PlayStation State of Play Announced & Timed*'));
  assert.ok(formatted.includes('Sony revealed a 40-minute showcase'));

  const html = formatTelegramHtmlPulse(sampleItems);
  assert.ok(html.includes('<b>PlayStation State of Play Announced &amp; Timed</b>'));

  assert.ok(buildTelegramShareUrl(formatted).startsWith('https://t.me/share/url?'));
});

test('extractGroundingSources deduplicates valid http URLs from groundingChunks', () => {
  const sources = extractGroundingSources([
    { web: { uri: 'https://ign.com/story-1', title: 'IGN Story 1' } },
    { web: { uri: 'https://ign.com/story-1', title: 'Duplicate IGN' } },
    { web: { uri: 'javascript:alert(1)', title: 'Bad URL' } },
    { web: { uri: 'https://eurogamer.net/story-2', title: 'Eurogamer' } },
  ]);

  assert.equal(sources.length, 2);
  assert.equal(sources[0].title, 'IGN Story 1');
  assert.equal(sources[1].url, 'https://eurogamer.net/story-2');
});

test('buildNewsBriefingScript builds clean spoken script', () => {
  const script = buildNewsBriefingScript([
    { rank: 1, headline: 'Big Reveal', summary: 'Major RPG trailer dropped today.' },
  ]);
  assert.ok(script.includes('The Gaming Pulse'));
  assert.ok(script.includes('Number 1: Big Reveal.'));
});

test('parseRssFeedXml and synthesizePulseFromFeedArticles build real-time top 5 digest', () => {
  const sampleXml = `<rss><channel>
    <item>
      <title><![CDATA[Valve Rolls Out SteamOS 3.7 Update]]></title>
      <link>https://example.com/pc-steamos</link>
      <description><![CDATA[<p>Valve shipped SteamOS 3.7 with better GPU drivers. Handheld PC performance improves across Linux builds.</p>]]></description>
      <pubDate>Tue, 17 Nov 2026 10:00:00 GMT</pubDate>
    </item>
  </channel></rss>`;

  const parsed = parseRssFeedXml(sampleXml, 'PC Gamer', 'PC');
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].title, 'Valve Rolls Out SteamOS 3.7 Update');
  assert.equal(parsed[0].url, 'https://example.com/pc-steamos');
  assert.ok(parsed[0].summary.includes('Valve shipped SteamOS 3.7'));

  const selected = selectArticlesForPlatform(parsed, 'PC', 5);
  assert.equal(selected.length, 1);

  const pulse = synthesizePulseFromFeedArticles(parsed, 'PC');
  assert.equal(pulse.items.length, 1);
  assert.equal(pulse.sources.length, 1);
  assert.ok(pulse.digestMessage.includes('(PC)'));
});

test('parseRssFeedXml decodes &hellip; cleanly and selectArticlesForPlatform ranks direct PC matches first', () => {
  const xml = `<rss><channel>
    <item>
      <title>Hounded adds PS5 version</title>
      <link>https://example.com/ps5-hounded</link>
      <description>Adventure game launches on PS5 alongside PC &amp;hellip;</description>
      <pubDate>Tue, 17 Nov 2026 12:00:00 GMT</pubDate>
    </item>
    <item>
      <title>Hounded adds PS5 &amp;rsquo;26 update</title>
      <link>https://example.com/ps5-two</link>
      <description>Pok&amp;eacute;mon adventure delayed alongside PC &hellip;</description>
      <pubDate>Tue, 17 Nov 2026 11:00:00 GMT</pubDate>
    </item>
  </channel></rss>`;

  const mixed = parseRssFeedXml(xml, 'Gematsu', 'Nintendo');
  assert.ok(!mixed[1].summary.includes('&hellip;'));
  assert.ok(!mixed[1].summary.includes('&eacute;'));
  assert.ok(mixed[1].summary.includes('Pokémon'));
  assert.ok(!mixed[1].summary.endsWith('....'));

  const pcXml = `<rss><channel>
    <item>
      <title>Steam Deck OLED Firmware Patch Live</title>
      <link>https://example.com/pc-deck</link>
      <description>Valve updates shader pre-caching on Linux.</description>
      <pubDate>Tue, 17 Nov 2026 09:00:00 GMT</pubDate>
    </item>
  </channel></rss>`;
  const pcOnly = parseRssFeedXml(pcXml, 'PC Gamer', 'PC');
  const ranked = selectArticlesForPlatform([...mixed, ...pcOnly], 'PC', 5);
  assert.equal(ranked[0].title, 'Steam Deck OLED Firmware Patch Live');
});

