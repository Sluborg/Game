# Give the family a reason to cross the meadow
Design proposals for Claude • 18 November 2026 • Based on the v057b family-play review. All activities below are proposed experiments.

## Prototype the reed pool first

In the reviewed solo build, buying Storage meant making two three-wood trips. A bridge priced at 20 wood promises a bigger journey, but another bank of materials is a weak payoff. Put a bobbing seedpod and a raft tangled in reeds within sight of spawn. A child should be able to point to the thing they want to reach before anyone reads a recipe.

1. For the test build, place one fallen plank beside the bridge gap. Drop it into the visible socket to complete the first crossing. Keep the repaired bridge as a permanent shortcut. Time the walk from spawn to the first launch.
2. On the far bank, tug a reed. It bends, springs back and frees the raft. A second reed becomes a pole. One patch supplies the whole experiment.
3. From shore, aim and tap to launch the raft down either of two marked currents. A solo player can walk ahead and catch the seedpod at a landing. A partner can stand downstream and tilt a floating gate to change its route while it travels. Show the gate position to both players. Let either player perform either action.
4. On a miss, the pod circles in a small eddy within reach. Tap to relaunch immediately. On a catch, choose where to plant it. A giant flower opens and both blobz can bounce on it. Save its position. On their next visit the family can see what they made.
5. Narrow first build: one pool, two fixed raft paths, one switch, two planting spots, one flower. Animate along paths. Skip boat physics, crafting screens and a new inventory tab. Two people should be able to swap jobs on the next launch in seconds.

## Give each tier a new action

| Place | What draws players there | What the family learns | What persists |
|---|---|---|---|
| Home clearing | Loose plank beside a broken crossing | Carry and place one object. A friend can scout the far bank. | Bridge opens a shorter walk home. |
| Reed pool | A seedpod bobs beyond reach | Launch, redirect, catch. Reeds make water traversable by cargo. | A flower becomes a bouncy shortcut. |
| Clay bank | A round stone has left tracks that stop at a ditch | Scoop one lump of clay and shape a ramp. Roll the stone and reposition the ramp to reach either target. | Keep a favourite ramp or reshape it next visit. |
| Glowcap hollow | A patch of mushrooms lights up when a blob approaches | Carry light to reveal trail marks. One player can illuminate a fork while another follows it. Solo players can set the cap down. | The discovered alcove becomes a picnic spot reachable from home. |

Unlock the next clue through the previous discovery. Let a visiting player use a host's discoveries immediately. Save at each completed landmark. A family leaving after one launch should have a clear place to resume. Add clay only if families replay the pool voluntarily.

## Other directions to keep in reserve

| Experiment | What two players actually do | Smallest version worth testing |
|---|---|---|
| Berry bowling | One rolls a giant berry. The other nudges a stump to bank it into a burrow. Swap after the woodland creature returns it. | One slope, one movable stump, two holes. Reuse the clay-bank roll. |
| Seed sail | One turns a wind vane while the other chooses where to catch a drifting seed. Solo players set the vane before launching. | Two wind directions and a visible drift line. Compare directly with the raft before building both. |
| Mushroom echo | One player makes a rhythm by bouncing across caps. Their partner copies it or plays it backwards. | Three caps that light and sound together. Allow free play and unlimited repeats. |
| Lost beetle | One player spots tracks from a flower perch while another moves a leaf shelter into the beetle's path. | A looping path with two forks. Let solo players climb down and move the shelter. |
| Build a picnic | Players choose where to place a log seat, a flower and a glowcap. Sitting together brings out the beetle they helped. | One small clearing with movable props. Use it as the session's stopping point. |

## What to cut and what to measure

- Fold the first resource tutorial into the bridge repair. Put extra storage after players have found two things they care about carrying. Keep the first expedition free of repeated wood trips.
- Give the first discovery to the whole party even when one person lands the catch. Reserve the final planting decision for the catcher, then put the next seed within the launcher's reach. Watch whether roles actually change hands.
- Family test, 25 minutes. Give the child the first move. Spend five minutes exploring without instructions, eight at the pool, five with the players swapping phones or roles, then offer seven minutes of free choice. Record the first thing each points out, who initiates the second launch, what each person changes on purpose, and any time someone waits without a useful action.
- Ask each separately: “What did the other player do that helped?” “What would you try if you had one more seed?” “Where would you go next time?” If the adult directs every action, make the downstream gate's effect visible from shore. If nobody relaunches, improve the launch, catch and second-route payoff before adding another resource.

## Reed pool prototype checkpoint · 18 November 2026

Open [reed-pool.html](reed-pool.html) locally in a browser. The standalone, shared-screen toy starts on the bank after the bridge repair. One person takes the launch button. The other chooses a dock and operates the fork. For a solo turn, choose a dock and point the gate there before launching. The raft reaches the fork at 2.5 seconds and the dock at 5 seconds. Both values are tuning guesses. Try deliberately missing once. Whoever catches the next pod chooses the flower bed and hands the launch job to their partner. The latest bed persists when browser storage is available.

**Decision for the first game build.** Keep the raft as cargo. Both blobz stay on shore, so the interesting move is turning the gate while a friend is already committed downstream. The catcher chooses Willow or Pebble by gliding to it. Catch automatically within one blob width when the pod arrives. Allow one ordinary contextual action at the launcher, gate or bed. A missed pod drifts back into reach. For the first outing, a flower by the bridge bounces visitors back toward the launch reed. A flower by the bank bounces them toward the downstream gate. Keep both destinations reachable on foot. In the toy, buttons stand in for walking and planting records the chosen bed. Bounce travel and the opening crossing are for the game build.

| Claude's implementation question | First-build decision |
|---|---|
| Where does the pool fit? | Mirror both banks and routes around the existing seeded water corner in [sim.ts](../../../src/sim.ts), using `makeWater`, its bridge and the dry `area`. Keep the walking deck and both landings clear of spawned obstacles. Use a reed or pod clue near spawn to lead players to the crossing when the actual pool is off camera. The free plank is a test-fixture override of the bridge purchase. |
| Who decides the outcome? | The host advances approach → locked route → catch or eddy in its simulation. Resolve a gate change only before crossing the fork. Accept one launch per ready pod and one planting per catch. Send the route, phase, trip ID and elapsed time in snapshots. Joining midway should show the current trip. Two players at one landing share the catch; break a simultaneous planting claim by player ID. |
| What if someone leaves? | Free the planting choice to anyone beside the pod if its catcher disconnects. With a single remaining player the gate holds its setting. An empty landing always leads to the same recoverable eddy. |
| What survives another seed? | Store an optional bed ID relative to the bridge or bank in `Village`, validate it in `cleanVillage` and round-trip it in `villageOf`. Rebuild its position from the new corner. Preserve old v2 villages and their buildings. Save a completed planting before exit. Reset an unfinished trip to ready. |
| What earns the next tier? | After the first catch, stop prompting. Record who starts the second trip, whether they trade jobs, and whether they deliberately use a different route. If neither initiates, record where attention went before commissioning clay-bank assets. |

**Verification.** Exercised the HTML's actual event handlers with a deterministic clock in Node. Both routes caught a pod, a miss reached the eddy, a relaunch accepted a gate change before the fork, the fork locked, and the selected bed survived a simulated reload. Chromium could not start in the build environment. Phone layout, touch timing, flower travel and real peer play remain untested. Next art handoff is the outstanding Tank damage and Healer recovery icons in [SKILL-CARDS.md](SKILL-CARDS.md).

**Clay-bank checkpoint · 18 November 2026.** The [clay-bank handoff](CLAY-BANK.md) includes the four-shot outcome table, a tabletop rehearsal, an animated ramp and host/save acceptance cases. Clay remains a design study pending voluntary replay at the reed pool. The next independent resource design is the glowcap hollow, where carrying and setting down light should reveal a route a partner can follow.
