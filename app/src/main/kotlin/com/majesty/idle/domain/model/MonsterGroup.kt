package com.majesty.idle.domain.model

enum class MonsterType(val displayName: String, val baseHp: Int, val goldReward: Long, val threatLevel: Int) {
    RAT("Giant Rat", 20, 5, 1),
    GOBLIN("Goblin", 40, 10, 2),
    TROLL("Troll", 120, 30, 4),
    DRAGON("Dragon", 500, 200, 10),
    UNDEAD("Undead Horde", 80, 20, 3)
}

data class MonsterGroup(
    val id: Long,
    val type: MonsterType,
    val count: Int,
    val hp: Int,
    val maxHp: Int
) {
    val isAlive: Boolean get() = hp > 0 && count > 0
    val totalGoldReward: Long get() = type.goldReward * count
    val hpPercent: Float get() = hp.toFloat() / maxHp.toFloat()
}
