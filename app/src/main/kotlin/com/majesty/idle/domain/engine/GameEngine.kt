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

        // 3. Update monster groups (spawn new ones on interval)
        val preSpawnIds = state.monsterGroups.map { it.id }.toSet()
        val (spawnedMonsters, nextMonsterId) =
            MonsterSpawner.update(state.monsterGroups, state.tickCount, state.nextMonsterId)

        // 4. Run hero AI state transitions
        val aiHeroes = HeroAI.updateAll(state.heroes, state.buildings, spawnedMonsters, templeHealBonus)

        // 5. Apply combat between heroes and monsters
        val combatResult = MonsterSpawner.applyHeroDamage(
            spawnedMonsters, aiHeroes, damageReduction, templeHealBonus
        )

        // 6. Compute stats deltas
        val monstersKilledThisTick = combatResult.monsters.count { !it.isAlive }
        val bossesKilledThisTick = combatResult.monsters.count { it.isBoss && !it.isAlive }
        val goldFromKills = combatResult.heroes.sumOf { it.gold } - aiHeroes.sumOf { it.gold }
        val newTotalGold = state.totalGoldEarned + earnedGold + goldFromKills.coerceAtLeast(0)

        // 7. Generate boss-spawn events for newly appeared bosses
        val spawnEvents = mutableListOf<String>()
        spawnedMonsters
            .filter { it.id !in preSpawnIds && it.isBoss }
            .forEach { spawnEvents.add("⚠️ A ${it.type.displayName} approaches!") }

        // 8. Combine all events (spawn events first so they appear before combat events)
        val allEvents = spawnEvents + combatResult.events

        // 9. Update battle log (newest first, capped)
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
            totalBossKills = state.totalBossKills + bossesKilledThisTick,
            battleLog = newLog
        )

        return TickResult(newState = newState, events = allEvents)
    }
}
