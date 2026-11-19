const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

class Element {
  constructor() {
    this.className = '';
    this.disabled = false;
    this.innerHTML = '';
    this.textContent = '';
    this.attributes = {};
  }
  setAttribute(name, value) { this.attributes[name] = value; }
}

function openStudy(saved = new Map(), saveFails = false) {
  const ids = ['garden', 'shade', 'garden-aim', 'shade-aim', 'low', 'high-shape',
    'status', 'launch', 'reset-shot', 'reset-all'];
  const elements = Object.fromEntries(ids.map((id) => [id, new Element()]));
  const html = fs.readFileSync(__dirname + '/beetle-run.html', 'utf8');
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

function run(side, shape, saveFails = false) {
  const study = openStudy(new Map(), saveFails);
  study.click(side === 'garden' ? 'garden-aim' : 'shade-aim');
  study.click(shape === 'low' ? 'low' : 'high-shape');
  study.click('launch');
  return study;
}

test('garden and low channel brings the beetle home and persists', () => {
  const study = run('garden', 'low');
  assert.match(study.elements.status.textContent, /beetle follows/);
  assert.match(study.elements.garden.innerHTML, /beetle visitor/);
  const reopened = openStudy(study.saved);
  assert.match(reopened.elements.garden.innerHTML, /beetle visitor/);
});

test('the three other settings have distinct recoverable outcomes', () => {
  assert.match(run('garden', 'high').elements.status.textContent, /peers over/);
  assert.match(run('shade', 'low').elements.status.textContent, /walks home/);
  assert.match(run('shade', 'high').elements.status.textContent, /pauses beside/);
});

test('a run keeps both settings selected for discussion', () => {
  const study = run('shade', 'low');
  assert.equal(study.elements['shade-aim'].attributes['aria-pressed'], 'true');
  assert.equal(study.elements.low.attributes['aria-pressed'], 'true');
  assert.equal(study.elements.launch.disabled, false);
});

test('unavailable storage leaves the successful visit playable', () => {
  const study = run('garden', 'low', true);
  assert.match(study.elements.status.textContent, /only for this visit/);
  assert.match(study.elements.garden.innerHTML, /beetle visitor/);
});
