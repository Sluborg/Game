package com.majesty.idle.domain.engine

import com.majesty.idle.domain.GameConstants
import com.majesty.idle.domain.model.KingdomState

object GameEngine {

    fun tick(state: KingdomState): TickResult {
        // 1. Passive gold income — accumulate fractional part to avoid per-tick truncation
        val rawAccumulator = state.goldAccumulator + state.goldPerSecond
        val earnedGold = rawAccumulator.toLong()
        val newAccumulator = rawAccumulator - earnedGold

        // 2. Compute building combat modifiers
        val damageReduction = state.buildings.sumOf { it.guardTowerDamageReduction() }
        val templeHealBonus = state.buildings.sumOf { it.templeHealBonus().toDouble() }.toFloat()

        // 3. Spawn monsters; separate bosses — they trigger grid combat, not regular combat
        val preSpawnIds = state.monsterGroups.map { it.id }.toSet()
        val (allSpawned, nextMonsterId) =
            MonsterSpawner.update(state.monsterGroups, state.tickCount, state.nextMonsterId)

        val newSpawns = allSpawned.filter { it.id !in preSpawnIds }
        val bossSpawns = newSpawns.filter { it.isBoss }
        val monstersForCombat = allSpawned.filter { it.id in preSpawnIds } + newSpawns.filter { !it.isBoss }

        // 4. Run hero AI against non-boss monsters only
        val aiHeroes = HeroAI.updateAll(state.heroes, state.buildings, monstersForCombat, templeHealBonus)

        // 5. Apply combat between heroes and non-boss monsters
        val combatResult = MonsterSpawner.applyHeroDamage(
            monstersForCombat, aiHeroes, damageReduction, templeHealBonus
        )

        // 6. Compute stats deltas
        val monstersKilledThisTick = combatResult.monsters.count { !it.isAlive }
        val goldFromKills = combatResult.heroes.sumOf { it.gold } - aiHeroes.sumOf { it.gold }
        val newTotalGold = state.totalGoldEarned + earnedGold + goldFromKills.coerceAtLeast(0)

        // 7. Generate events: boss approach announcements + regular combat events
        val spawnEvents = mutableListOf<String>()
        bossSpawns.forEach { boss ->
            spawnEvents.add("⚠️ A ${boss.type.displayName} approaches — Battle Stations!")
        }
        val allEvents = spawnEvents + combatResult.events

        // 8. Update battle log (newest first, capped)
        val newLog = (allEvents + state.battleLog).take(GameConstants.BATTLE_LOG_MAX_SIZE)

        val newState = state.copy(
            gold = state.gold + earnedGold,
            goldAccumulator = newAccumulator,
            heroes = combatResult.heroes,
            monsterGroups = combatResult.monsters.filter { it.isAlive },
            tickCount = state.tickCount + 1,
            nextMonsterId = nextMonsterId,
            totalMonstersKilled = state.totalMonstersKilled + monstersKilledThisTick,
            totalGoldEarned = newTotalGold,
            totalBossKills = state.totalBossKills,
            battleLog = newLog
        )

        // 9. Grid battle trigger if a boss spawned and heroes are present
        val gridTrigger: GridBattleTrigger? = if (bossSpawns.isNotEmpty() && combatResult.heroes.isNotEmpty()) {
            GridBattleTrigger(heroes = combatResult.heroes, monsters = bossSpawns)
        } else null

        return TickResult(newState = newState, events = allEvents, gridBattleTrigger = gridTrigger)
    }
}
