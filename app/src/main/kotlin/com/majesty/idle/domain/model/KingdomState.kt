package com.majesty.idle.domain.model

data class KingdomState(
    val gold: Long,
    val heroes: List<Hero>,
    val buildings: List<Building>,
    val monsterGroups: List<MonsterGroup>,
    val tickCount: Long,
    val lastSavedAt: Long
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
                gold = 100,
                heroes = listOf(gunter),
                buildings = listOf(palace, tavern),
                monsterGroups = emptyList(),
                tickCount = 0,
                lastSavedAt = System.currentTimeMillis()
            )
        }
    }
}
