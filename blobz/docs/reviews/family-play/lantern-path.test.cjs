const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

class Element {
  constructor() {
    this.className = '';
    this.disabled = false;
    this.hidden = false;
    this.textContent = '';
  }
}

function openStudy(saveFails = false) {
  const ids = ['gap0', 'gap1', 'reveal', 'clue', 'round', 'point', 'result', 'status', 'again'];
  const elements = Object.fromEntries(ids.map((id) => [id, new Element()]));
  const saved = new Map();
  const html = fs.readFileSync(__dirname + '/lantern-path.html', 'utf8');
  const source = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  vm.runInNewContext(source, {
    document: { getElementById: (id) => elements[id] },
    localStorage: {
      getItem: (key) => saved.get(key) ?? null,
      setItem: (key, value) => {
        if (saveFails) throw new Error('unavailable');
        saved.set(key, value);
      },
    },
    Math: Object.assign(Object.create(Math), { random: () => 0 }),
  });
  return { elements, saved, click: (id) => elements[id].onclick() };
}

test('wrong clay shape stays recoverable with the clue visible', () => {
  const study = openStudy();
  study.click('reveal');
  assert.match(study.elements.clue.textContent, /round/);
  study.click('point');
  assert.match(study.elements.result.textContent, /stays soft/);
  assert.equal(study.elements.round.disabled, false);
  study.click('round');
  assert.match(study.elements.status.textContent, /Swap jobs/);
  assert.match(study.elements.gap0.className, /fired/);
});

test('two correct cups persist the lit shortcut', () => {
  const study = openStudy();
  study.click('reveal');
  study.click('round');
  study.click('reveal');
  study.click('round');
  assert.equal(study.saved.get('blobz-lantern-path-v1'), 'lit');
  assert.equal(study.elements.again.hidden, false);
  assert.match(study.elements.status.textContent, /picnic clearing/);
});

test('unavailable save keeps completion playable and explains the limit', () => {
  const study = openStudy(true);
  study.click('reveal');
  study.click('round');
  study.click('reveal');
  study.click('round');
  assert.match(study.elements.status.textContent, /only for this visit/);
  assert.equal(study.elements.again.hidden, false);
});
