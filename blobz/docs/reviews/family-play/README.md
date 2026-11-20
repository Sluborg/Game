# Blobz family gameplay review

Reviewed 17 November 2026, live v057b, source f1be3f3. Audience: one nine-year-old and one adult sharing a session. See [art and implementation directions](DIRECTIONS.md).

## Claude handoff · 20 November 2026

| Decision | Study to open | Evidence to collect before integration |
|---|---|---|
| Does a second raft trip feel worth taking? | [Reed pool](reed-pool.html) and [meadow build plan](MEADOW.md) | After the first flower, stay quiet. Record who initiates the next launch and whether the partners swap jobs. |
| Can the family distinguish all three resources by what they do? | [Clay bank](clay-bank.html), [glowcap hollow](glowcap.html) and [cottage display](cottage-display.html), in [discovery order](PROGRESSION.md) | Ask each player to point to a trophy and show the partner what it lets them do. Record their first prediction. |
| Do class choices read at phone size? | [Blind icon test](icon-test.html) and [four class comparisons](SKILL-CARDS.md) | Capture each player's first guess before revealing the card. Try the chosen action in its class study. Use the corrected Marksman, Tank and Healer meanings in the card handoff. |
| Does the healer hood leave each face readable? | [Six real body shapes](art/CLASS_HAT_FIT.md) and [narrow hood on tall and pear bodies](art/narrow-hood-fit.md) | Compare the two fits at game size during glide. The other class hats have authored animation in the atlas; the six-shape fit study covers the healer hood. |

**Checkpoint.** The design and art studies are ready for family testing. All 54 local regression tests passed. Every PNG and every decoded GIF frame in the review art directory contains the exact magenta key, and every GIF contains distinct frames. On two physical phones, check joining first. If joining fails, record the message on each phone. The standalone studies can still be rehearsed together on one screen. Touch comfort, child recognition and voluntary replay await observation.

## A. Verdict

I would expect the pair to ask for another dungeon run sooner than another village session. Choosing extra arrows and then freezing the volley gave me a reason to try the next room. In the village I delivered two loads of wood, built Storage, saved, and got three empty stars. The building survived. The results screen missed the accomplishment I cared about.

### Evidence

* Played live: editor, hosting, meadow movement, auto-chopping, pickup, delivery, the seven building cards, Storage purchase, save and replay. Played Marksman through room two and Healer in room one. Used volley, wand modes and phase, opened a chest, collected gold and picked skill cards.
* Played with desktop input at 382 × 919 and 891 × 393. A touch phone in landscape gets a rotate prompt under the current viewport rules. Physical comfort and touch responsiveness remain untested.
* Two browser sessions could not connect by discovery or code, before or after the host started. This does not establish a home Wi-Fi defect. A separate source simulation confirmed a carry chest stayed put with one holder and moved with two. A Healer revived a downed Tank at 70/140 HP.
* Repository screenshots showed the boss projectile ring, teammate health and inventory replacement prompt. Later rooms, Rogue, Tank, loot rolls and final victory were reviewed from source. No live boss completion, child participant, two-phone or five-player test.
* Berry Rain, snow, stone gathering and the meadow puzzle pens are switched off. Refining mini-games are proposals. The two-player carry chest is active.

## B. Activities

Scores are designer estimates out of five, in child / adult / co-op order. Co-op scores describe design potential. A dash means unassessed.

| Activity | Keep | Problems and smallest fixes | Scores |
|---|---|---|---|
| Create and join | A child can own the shape, colour and hat choice. Random offers a shortcut. | The guest was told to enter the code after already entering it. Show the failed step and retry with the code retained. Keep Random and Done obvious for players eager to start. | 4 / 3 / — |
| Meadow gathering | Releasing by a tree worked it into a stump. The logs over my head and +3 at home made the delivery tangible. Berries and power-ups give reasons to roam. | Tapping a bush from spawn did nothing. Demonstrate one drag. The second wood trip felt identical to the first. Let the pair select a visible project before setting out again. | 3 / 2 / 2 |
| Carry treasure | Two players steer by moving together. A more experienced player cannot do both jobs. | The first chest can spawn far from home. Put one near the cottage when player two arrives. When contact breaks, show which partner needs to come closer. | 4 / 4 / 5 |
| Build | Six wood bought a visible building and a clear capacity increase. The bridge promises a destination. | Storage and Cottage level 2 both advertised carrying four, including after Storage was built. Show the cumulative capacity. Garden, Well and Tools+ mostly make gathering faster. Give the far side of the bridge one distinct activity. | 3 / 2 / 2 |
| Classes and combat | Stop-to-shoot, two Rogue sidesteps, a directional shield and the Healer’s two modes create different jobs. | Solo healing mode excludes the owner and can leave the wand idle. Give it a solo use or keep solo attack active. My Marksman reached level two at full health largely standing at the entrance. Introduce one clearly telegraphed reason to sidestep and stop again. | 4 / 4 / 4 |
| Rooms and bosses | Waves, corridor triggers, cover and projectiles change positioning. Rooms 5 and 10 have bosses. | Cards, loot and all eligible players standing at the door can hold everyone up. Identify the missing player and offer a safe regroup. Ten rooms can outlast a family session. Prototype a midpoint camp. | 4 / 3 / 4 for early rooms. Boss feel unassessed. |
| Loot, upgrades and rescue | Extra arrows followed by a freezing volley made me want another encounter. Players are safe while choosing. Instant Healer rescue gives the support player a recognisable job. | Highest-roll loot can miss the teammate who would use it best. Let players nominate a recipient. Automatic recovery after five seconds makes a quick rescue easy to overlook. Show both players who saved whom. | 4 / 4 / 4 |
| End and replay | The host controls when the meadow ends. The replay retained Storage. A final dungeon clear unlocks the next difficulty. | Six of ten wood, no food and no stars described my session poorly. Show the building and next project. Repeated milestones increase delivery targets by half the base amount. Give the next session a decision beyond filling bigger bars. | 2 / 2 / 2 |

## C. Estimated journey

* Five minutes: personal attachment to the blob and perhaps a first delivery. Watch whether the adult starts directing every movement before the child gets to choose anything.
* Twenty minutes: a village pair knows a delivery route. A dungeon pair can discuss where to stand, which card to pick or when to heal. Shared XP reduces competition for kills. Late dungeon joiners start with a dagger and miss the class decision.
* Several sessions: swapping Tank and Healer, beating a remembered boss or finishing a chosen project gives a specific invitation back. Remind the family what is saved on the host’s device.

## D. Priority order

1. Put an existing carry chest on the first shared outing. Let both players light a helper icon.
2. Pin one chosen village project and combine its cost and delivery display.
3. Recap the building, deepest room and next goal. Hide empty stars on voluntary exits. Test a room-five camp separately.
4. Make rescue and doorway waits legible. Give late joiners a class choice at the next safe door.
5. Add one distinct outing beyond the bridge using the existing carry chest and two possible routes.

If the connection failure reproduces on two real phones, fixing it takes priority over these five.

## E. Optional new play

* Rescue a stranded blob across the water. One player guides it while the other clears or calls the route.
* Set a shooter and cover in one room with two good positions. A Tank draws attention while the partner relocates. A solo player can alternate positions.
* Carry a boss trophy home together and display it at the cottage. The celebration also leaves a reminder for next time.

## F. Family test, 25 minutes

Use two actual phones, a fresh village and the child's preferred language. The child hosts. The adult waits to be asked before explaining controls.

| Minutes | Prompt | Observe |
|---|---|---|
| 0–4 | Make a blob and find each other. | Time to connect, who reads, both devices' messages if it fails. |
| 4–9 | Find something you want to do together. | First self-chosen destination, who leads, whether the pair discovers the chest. |
| 9–13 | Choose something for the village. | Who chooses the purchase, what the players think happens to a delivery. |
| 13–21 | Try the cave and choose your roles. | A rescue, a warning, a changed plan, or stretches of one person watching. |
| 21–25 | Find a good place to stop. | Does it fit the remaining time? Ask separately what each expects to find next session. |

Ask each player: “What did the other person do that mattered to you?” “When were you waiting?” “What would you do first tomorrow?” Record their words before suggesting improvements.
