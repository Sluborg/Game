// Run with node --test meadow-regression.test.cjs from this directory.
// Exercises the standalone pages' handlers with a simulated clock and DOM.
const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { runInNewContext } = require('node:vm');

function openPage(name, saved = new Map()) {
  const html = readFileSync(join(__dirname, name + '.html'), 'utf8');
  const nodes = new Map();
  const events = new Map();
  const frames = new Map();
  let nextFrame = 0;
  let now = 0;
  let focus;

  function add(key, dataset = {}) {
    nodes.set(key, {
      dataset, attributes: {},
      focus() { if (!this.disabled) focus = key; },
      setAttribute(name, value) { this.attributes[name] = value; }
    });
  }
  for (const [, id] of html.matchAll(/\bid="([^"]+)"/g)) add(id);
  for (const [, group, value] of html.matchAll(/data-(light|path)="([^"]+)"/g)) {
    add(value, { [group]: value });
  }
  const document = {
    hidden: false,
    addEventListener(type, listener) { events.set(type, listener); },
    getElementById: id => nodes.get(id),
    querySelector(selector) {
      if (selector.startsWith('#')) return nodes.get(selector.slice(1));
      const [, value] = selector.match(/^\[data-light="([^"]+)"\]$/);
      return nodes.get(value);
    },
    querySelectorAll(selector) {
      const [, key] = selector.match(/^\[data-(light|path)\]$/);
      return [...nodes.values()].filter(node => key in node.dataset);
    }
  };
  runInNewContext(html.match(/<script>([\s\S]+?)<\/script>/)[1], {
    document,
    localStorage: { getItem: key => saved.get(key), setItem: (key, value) => saved.set(key, value) },
    performance: { now: () => now },
    requestAnimationFrame(callback) { frames.set(++nextFrame, callback); return nextFrame; },
    cancelAnimationFrame(id) { frames.delete(id); }
  });

  return {
    get: key => nodes.get(key),
    focus: () => focus,
    activate(key) {
      const button = nodes.get(key);
      assert.ok(!button.disabled && !button.hidden, key + ' unavailable');
      button.focus();
      button.onclick();
    },
    advance(ms) {
      now += ms;
      const pending = [...frames.values()];
      frames.clear();
      pending.forEach(frame => frame(now));
    },
    hide(hidden) {
      document.hidden = hidden;
      events.get('visibilitychange')();
    }
  };
}

test('glowcap: wrong turn, lamp handoff, find, replay, saved picnic', () => {
  const saved = new Map();
  const game = openPage('glowcap', saved);
  game.activate('arch');
  assert.match(game.get('trail').textContent, /mörkt/);
  for (const lamp of ['root', 'rock']) {
    game.activate(lamp);
    assert.match(game.get('trail').textContent, /Nu syns spåren/);
    const arch = game.get('clue').textContent.includes('bågen');
    game.activate(arch ? 'fork' : 'arch');
    assert.match(game.get('trail').textContent, /stubbe/);
    game.activate(arch ? 'arch' : 'fork');
    assert.equal(game.focus(), lamp === 'root' ? 'rock' : 'search');
  }
  game.activate('search');
  assert.equal(game.focus(), 'again');
  game.activate('again');
  assert.equal(game.focus(), 'root');
  assert.match(openPage('glowcap', saved).get('trail').textContent, /Picknickplatsen finns kvar/);
});

for (const [at, bed] of [[2200, 'bridge'], [4400, 'bank']]) {
  test('reed pool: app switch at ' + at + ' ms, catch and save', () => {
    const saved = new Map();
    const game = openPage('reed-pool', saved);
    game.activate('launch');
    game.advance(at);
    game.hide(true);
    game.advance(30000);
    game.hide(false);
    assert.equal(game.get('launch').disabled, true);
    assert.equal(game.get('flip').disabled, at >= 2500);
    game.activate(at < 2500 ? 'flip' : 'willow');
    game.advance(5000 - at - 1);
    assert.equal(game.get('plant').hidden, true);
    game.advance(1);
    assert.equal(game.get('plant').hidden, false);
    game.activate(bed);
    assert.equal(game.focus(), 'launch');
    assert.match(openPage('reed-pool', saved).get('flower').textContent, bed === 'bank' ? /stranden/ : /bron/);
  });
}

test('reed pool: miss, set up solo retry, reload an unfinished trip', () => {
  const saved = new Map([['reed-pool-design.flower', 'bridge']]);
  const game = openPage('reed-pool', saved);
  game.activate('launch');
  game.advance(5000);
  assert.match(game.get('status').textContent, /snurrar tillbaka/);
  game.activate('willow');
  assert.match(game.get('status').textContent, /Släpp flotten!/);
  game.activate('launch');
  const reopened = openPage('reed-pool', saved);
  assert.equal(reopened.get('launch').disabled, false);
  assert.equal(reopened.get('plant').hidden, true);
  assert.match(reopened.get('flower').textContent, /bron/);
  game.advance(5000);
  assert.equal(game.get('plant').hidden, false);
});
