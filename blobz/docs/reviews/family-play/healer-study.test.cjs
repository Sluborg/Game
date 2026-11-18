const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

class Element {
  constructor() {
    this.disabled = false;
    this.hidden = false;
    this.style = {};
    this.textContent = '';
    this.attributes = {};
    this.children = {};
    this.classList = { toggle: (name, on) => { this.attributes[name] = on; } };
  }
  setAttribute(name, value) { this.attributes[name] = value; }
  querySelector(selector) { return this.children[selector]; }
}

const canvas = () => {
  const element = new Element();
  element.getContext = () => ({ fillStyle: '', fillRect() {} });
  return element;
};

function openStudy() {
  const ids = ['bubble-card', 'wand-card', 'labels', 'preview', 'swap', 'friend', 'healer',
    'friend-hp', 'goo-hp', 'status', 'start', 'heal', 'attack', 'bolt', 'reset'];
  const elements = Object.fromEntries(ids.map((id) => [id, new Element()]));
  for (const id of ['bubble-card', 'wand-card']) {
    elements[id].children.canvas = canvas();
    elements[id].children.b = new Element();
    elements[id].children.small = new Element();
    elements[id].children.small.hidden = true;
  }
  const html = fs.readFileSync(__dirname + '/healer-study.html', 'utf8');
  const source = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  vm.runInNewContext(source, {
    document: { getElementById: (id) => elements[id] },
    clearInterval() {},
    setInterval() { return 1; },
  });
  return { elements, click: (id) => elements[id].onclick() };
}

test('bubble protects the friend and leaves base attack damage', () => {
  const study = openStudy();
  study.click('bubble-card');
  study.click('start');
  study.click('heal');
  assert.equal(study.elements['friend-hp'].style.width, '70%');
  assert.equal(study.elements.friend.attributes.bubble, true);
  study.click('attack');
  assert.equal(study.elements['goo-hp'].style.width, String(22 / 30 * 100) + '%');
  assert.match(study.elements.status.textContent, /deals 8/);
});

test('stronger wand does not improve healing and raises attack to 11', () => {
  const study = openStudy();
  study.click('wand-card');
  study.click('start');
  study.click('heal');
  assert.equal(study.elements['friend-hp'].style.width, '50%');
  assert.equal(study.elements.friend.attributes.bubble, false);
  study.click('attack');
  assert.equal(study.elements['goo-hp'].style.width, String(19 / 30 * 100) + '%');
  assert.match(study.elements.status.textContent, /deals 11/);
});

test('reset restores the same encounter', () => {
  const study = openStudy();
  study.click('bubble-card');
  study.click('start');
  study.click('heal');
  study.click('reset');
  assert.equal(study.elements['friend-hp'].style.width, '60%');
  assert.equal(study.elements['goo-hp'].style.width, '100%');
  assert.equal(study.elements.heal.disabled, true);
});
