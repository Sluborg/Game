package com.majesty.idle.domain.model

import com.majesty.idle.domain.GameConstants

data class KingdomState(
    val gold: Long,
    val goldAccumulator: Double = 0.0,  // fractional carry between ticks
    val heroes: List<Hero>,
    val buildings: List<Building>,
    val monsterGroups: List<MonsterGroup>,
    val tickCount: Long,
    val lastSavedAt: Long,
    val nextMonsterId: Long = 1000L,    // persisted so IDs never repeat across restarts
    val totalMonstersKilled: Long = 0,  // persisted stat for milestones
    val totalGoldEarned: Long = 0,      // persisted stat for milestones
    val totalBossKills: Int = 0,        // persisted stat for milestones
    val battleLog: List<String> = emptyList() // ephemeral — not saved to DB
) {
    val goldPerSecond: Double
        get() = buildings.sumOf { it.goldPerSecond }

    val activeThreat: Boolean
        get() = monsterGroups.any { it.isAlive }

    companion object {
        val EMPTY = KingdomState(
            gold = 0,
            heroes = emptyList(),
            buildings = emptyList(),
            monsterGroups = emptyList(),
            tickCount = 0,
            lastSavedAt = System.currentTimeMillis()
        )

        fun seed(): KingdomState {
            val palace = Building(id = 1, type = BuildingType.PALACE, level = 1)
            val tavern = Building(id = 2, type = BuildingType.TAVERN, level = 1)
            val gunter = Hero.create(id = 1, name = "Gunter", heroClass = HeroClass.WARRIOR)
            return KingdomState(
                gold = GameConstants.STARTING_GOLD,
                heroes = listOf(gunter),
                buildings = listOf(palace, tavern),
                monsterGroups = emptyList(),
                tickCount = 0,
                lastSavedAt = System.currentTimeMillis(),
                nextMonsterId = 1000L
            )
        }
    }
}
