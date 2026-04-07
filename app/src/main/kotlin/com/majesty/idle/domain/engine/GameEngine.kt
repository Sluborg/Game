package com.majesty.idle.domain.engine

import com.majesty.idle.domain.GameConstants
import com.majesty.idle.domain.model.KingdomState

object GameEngine {

    fun tick(state: KingdomState): KingdomState {
        // 1. Passive gold income — accumulate fractional part to avoid per-tick truncation
        val rawAccumulator = state.goldAccumulator + state.goldPerSecond
        val earnedGold = rawAccumulator.toLong()
        val newAccumulator = rawAccumulator - earnedGold

        // 2. Update monster groups (spawn new ones on interval)
        val (spawnedMonsters, nextMonsterId) =
            MonsterSpawner.update(state.monsterGroups, state.tickCount, state.nextMonsterId)

        // 3. Run hero AI state transitions
        val aiHeroes = HeroAI.updateAll(state.heroes, state.buildings, spawnedMonsters)

        // 4. Apply combat between heroes and monsters
        val (combatMonsters, combatHeroes) = MonsterSpawner.applyHeroDamage(spawnedMonsters, aiHeroes)

        return state.copy(
            gold = state.gold + earnedGold,
            goldAccumulator = newAccumulator,
            heroes = combatHeroes,
            monsterGroups = combatMonsters.filter { it.isAlive },
            tickCount = state.tickCount + 1,
            nextMonsterId = nextMonsterId
        )
    }
}
