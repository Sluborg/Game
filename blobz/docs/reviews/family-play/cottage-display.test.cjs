const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

class Element {
  constructor(text = '') {
    this.className = '';
    this.disabled = false;
    this.hidden = false;
    this.textContent = text;
    this.attributes = {};
    this.dataset = {};
  }
  setAttribute(name, value) { this.attributes[name] = value; }
  querySelector() { return {}; }
}

function openStudy(saved = new Map(), saveFails = false) {
  const ids = ['reed', 'clay', 'glow', 'recap', 'find-reed', 'find-clay', 'find-glow',
    'project-panel', 'project-status', 'reset'];
  const elements = Object.fromEntries(ids.map((id) => [id, new Element()]));
  const projects = [
    ['sail', 'Seed sail Reed + Glow'],
    ['lantern', 'Lantern stepping stones Clay + Glow'],
    ['beetle', 'Beetle berry run Reed + Clay'],
  ].map(([id, text]) => {
    const element = new Element(text);
    element.dataset.project = id;
    return element;
  });
  const html = fs.readFileSync(__dirname + '/cottage-display.html', 'utf8');
  const source = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  vm.runInNewContext(source, {
    document: {
      getElementById: (id) => elements[id],
      querySelectorAll: (selector) => selector === '[data-project]' ? projects : [],
      querySelector: (selector) => projects.find((item) => selector.includes(item.dataset.project)),
    },
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
  return {
    elements,
    projects,
    saved,
    click: (id) => elements[id].onclick(),
    choose: (id) => projects.find((item) => item.dataset.project === id).onclick(),
  };
}

test('discoveries unlock in order and explain the next outing', () => {
  const study = openStudy();
  assert.equal(study.elements['find-clay'].disabled, true);
  study.click('find-reed');
  assert.equal(study.elements['find-clay'].disabled, false);
  assert.match(study.elements.recap.textContent, /Clay tracks/);
  study.click('find-clay');
  study.click('find-glow');
  assert.equal(study.elements['project-panel'].hidden, false);
  assert.match(study.elements.recap.textContent, /Three return projects/);
});

test('discoveries and selected project survive reload', () => {
  const saved = new Map();
  const first = openStudy(saved);
  first.click('find-reed');
  first.click('find-clay');
  first.click('find-glow');
  first.choose('lantern');
  const reopened = openStudy(saved);
  assert.equal(reopened.elements.glow.disabled, false);
  assert.equal(reopened.projects[1].attributes['aria-pressed'], 'true');
  assert.equal(reopened.elements.clay.attributes['aria-pressed'], 'true');
  assert.equal(reopened.elements.glow.attributes['aria-pressed'], 'true');
  assert.match(reopened.elements.recap.textContent, /Picnic clearing/);
});

test('malformed save cannot skip discoveries or pin a project', () => {
  const saved = new Map([['blobz-cottage-study-v1', JSON.stringify({ found: ['glow'], project: 'sail' })]]);
  const study = openStudy(saved);
  assert.equal(study.elements.glow.disabled, true);
  assert.equal(study.elements['project-panel'].hidden, true);
  assert.equal(study.projects[0].attributes['aria-pressed'], 'false');
});

test('unavailable storage leaves the discovery usable for this visit', () => {
  const study = openStudy(new Map(), true);
  study.click('find-reed');
  assert.equal(study.elements.reed.disabled, false);
  assert.match(study.elements.recap.textContent, /only for this visit/);
  study.click('reed');
  assert.match(study.elements.recap.textContent, /only for this visit/);
});
