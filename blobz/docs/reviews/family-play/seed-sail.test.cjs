const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

class Element {
  constructor() {
    this.className = '';
    this.disabled = false;
    this.textContent = '';
    this.attributes = {};
  }
  setAttribute(name, value) { this.attributes[name] = value; }
}

function openStudy(saved = new Map(), saveFails = false) {
  const ids = ['cottage', 'pool', 'cottage-beacon', 'pool-beacon', 'ribbon',
    'tail', 'cross', 'status', 'launch', 'bend', 'plant', 'return',
    'reset-shot', 'reset-all'];
  const elements = Object.fromEntries(ids.map((id) => [id, new Element()]));
  const html = fs.readFileSync(__dirname + '/seed-sail.html', 'utf8');
  const source = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  vm.runInNewContext(source, {
    document: { getElementById: (id) => elements[id] },
    localStorage: {
      getItem: (key) => saved.get(key) ?? null,
      setItem: (key, value) => {
        if (saveFails) throw new Error('unavailable');
        saved.set(key, value);
      },
      removeItem: (key) => saved.delete(key),
    },
    JSON,
  });
  return { elements, saved, click: (id) => elements[id].onclick() };
}

function reachBend(study, destination, trim, afterLaunch = true) {
  study.click(destination === 'cottage' ? 'cottage-beacon' : 'pool-beacon');
  if (!afterLaunch) study.click(trim);
  study.click('launch');
  if (afterLaunch) study.click(trim);
  study.click('bend');
}

test('an in-flight cottage trim lands, waits for Plant and persists', () => {
  const study = openStudy();
  reachBend(study, 'cottage', 'tail');
  assert.match(study.elements.status.textContent, /Plant this route or return/);
  assert.equal(study.elements.cottage.className, 'landing');
  study.click('plant');
  assert.match(study.elements.status.textContent, /permanent cottage shortcut/);
  assert.equal(openStudy(study.saved).elements.cottage.className, 'landing flower');
});

test('a matching pool rehearsal can return without planting', () => {
  const study = openStudy();
  reachBend(study, 'pool', 'cross', false);
  study.click('return');
  assert.match(study.elements.status.textContent, /stays unplanted/);
  assert.equal(study.saved.has('blobz-seed-sail-v1'), false);
});

test('a mismatch returns ready with settings retained for one-change retry', () => {
  const study = openStudy();
  reachBend(study, 'cottage', 'cross');
  assert.match(study.elements.status.textContent, /Keep the beacon and change one setting/);
  assert.equal(study.elements['cottage-beacon'].attributes['aria-pressed'], 'true');
  assert.equal(study.elements.cross.attributes['aria-pressed'], 'true');
  assert.equal(study.elements.launch.disabled, false);
});

test('a replay cannot overwrite the first permanent landing', () => {
  const study = openStudy();
  reachBend(study, 'cottage', 'tail');
  study.click('plant');
  study.click('pool-beacon');
  study.click('launch');
  study.click('cross');
  study.click('bend');
  assert.equal(study.elements.plant.disabled, true);
  study.click('return');
  assert.equal(openStudy(study.saved).elements.cottage.className, 'landing flower');
  assert.equal(openStudy(study.saved).elements.pool.className, 'landing');
});

test('unavailable storage leaves the planted shortcut playable for this visit', () => {
  const study = openStudy(new Map(), true);
  reachBend(study, 'pool', 'cross');
  study.click('plant');
  assert.match(study.elements.status.textContent, /only for this visit/);
  assert.equal(study.elements.pool.className, 'landing flower');
});
