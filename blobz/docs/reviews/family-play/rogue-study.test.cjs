const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

class Element {
  constructor() {
    this.disabled = false;
    this.hidden = false;
    this.textContent = '';
    this.attributes = {};
    this.children = {};
    this.dataset = {};
    this.listeners = {};
  }
  setAttribute(name, value) { this.attributes[name] = value; }
  querySelector(selector) { return this.children[selector]; }
  addEventListener(name, handler) { this.listeners[name] = handler; }
  click() { this.listeners.click({ currentTarget: this }); }
}

function canvas() {
  const element = new Element();
  element.getContext = () => ({
    fillStyle: '', strokeStyle: '',
    fillRect() {}, setLineDash() {}, beginPath() {}, arc() {}, stroke() {},
  });
  return element;
}

function openStudy() {
  const ids = ['labels', 'size', 'preview', 'a', 'b', 'base', 'swap', 'arena',
    'result', 'cast', 'reset'];
  const elements = Object.fromEntries(ids.map((id) => [id, new Element()]));
  for (const id of ['a', 'b']) {
    elements[id].children.canvas = canvas();
    elements[id].children.strong = new Element();
    elements[id].children.small = new Element();
  }
  elements.arena = canvas();
  const cards = new Element();
  const html = fs.readFileSync(__dirname + '/rogue-study.html', 'utf8');
  const source = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  let now = 0;
  vm.runInNewContext(source, {
    document: {
      getElementById: (id) => elements[id],
      querySelector: (selector) => selector === '.cards' ? cards : null,
    },
    matchMedia: () => ({ matches: true }),
    clearInterval() {}, setInterval() { return 1; },
    cancelAnimationFrame() {},
    requestAnimationFrame(handler) { now += 500; handler(now); return 1; },
    performance: { now: () => now },
    Math,
  });
  return { elements, cards, click: (id) => elements[id].click() };
}

test('Bigger whirl reaches the third goo without changing push', () => {
  const study = openStudy();
  study.click('a');
  study.click('cast');
  assert.match(study.elements.result.textContent, /3 of 3 goo hit/);
  assert.match(study.elements.result.textContent, /wider ring/);
  assert.equal(study.elements.cast.disabled, true);
});

test('Harder push still hits two close goo and clears more Tank space', () => {
  const study = openStudy();
  study.click('b');
  study.click('cast');
  assert.match(study.elements.result.textContent, /2 of 3 goo hit/);
  assert.match(study.elements.result.textContent, /travel farther/);
});

test('baseline leaves the far goo outside and replay resets cleanly', () => {
  const study = openStudy();
  study.click('cast');
  assert.match(study.elements.result.textContent, /far goo stays outside/);
  study.click('reset');
  assert.equal(study.elements.cast.disabled, false);
  assert.match(study.elements.result.textContent, /Room reset/);
});

test('swap preserves mechanics while changing card position', () => {
  const study = openStudy();
  study.click('swap');
  study.click('a');
  study.click('cast');
  assert.match(study.elements.result.textContent, /travel farther/);
  study.click('labels');
  assert.equal(study.elements.a.children.strong.textContent, 'Harder push');
  assert.equal(study.elements.a.children.small.textContent, 'Hårdare knuff');
});
