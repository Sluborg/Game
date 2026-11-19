const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(__dirname + '/clay-bank.html', 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];

function open(store) {
  let now = 0, frame;
  const nodes = {};
  const node = id => nodes[id] ??= {id, getContext: () => ({fillRect(){}, fillText(){}, drawImage(){}})};
  vm.runInNewContext(source, {
    document: {querySelector: s => node(s.replace('#','')), getElementById: node},
    performance: {now: () => now}, Image: class {}, Math,
    localStorage: {getItem: k => store[k], setItem: (k,v) => store[k]=v},
    requestAnimationFrame: fn => frame=fn
  });
  return {click: id => node(id).onclick(), state: () => node('landmarks').textContent,
    fire(id, expected) {
      node(id).onclick();
      node('shape').onclick();
      node(id==='far'?'near':'far').onclick();
      assert.equal(node('shape').disabled,true);
      now+=1500; frame(now);
      assert.match(node('status').textContent, expected);
      now+=1400; frame(now);
      assert.equal(node('shape').disabled,false);
    }};
}

for (const bellFirst of [false,true]) test('all trajectories, reload and replay; bell first = '+bellFirst,()=>{
  const store={}; let bank=open(store);
  for (const groove of ['near','far']) bank.fire(groove,/unshaped/);
  bank.click('shape'); bank.fire('near',/Splash/);
  if(bellFirst){bank.click('shape');bank.fire('near',/Ding/)}
  else bank.fire('far',/Knock/);
  bank=open(store);
  assert.match(bank.state(),bellFirst?/High.*upright.*spore trail/:/Low.*crossing open.*quiet/);
  bank.click('shape');
  if(bellFirst)bank.fire('far',/Knock/);
  else bank.fire('near',/Ding/);
  if(bellFirst)bank.click('shape');
  bank.fire('far',/Rustle/);bank.fire('near',/Ding/);
  assert.match(open(store).state(),/High.*crossing open.*spore trail/);
});
