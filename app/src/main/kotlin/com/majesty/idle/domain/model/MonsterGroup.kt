package com.majesty.idle.domain.model

enum class MonsterType(
    val displayName: String,
    val baseHp: Int,
    val goldReward: Long,
    val threatLevel: Int,
    val xpReward: Long,
    val isBoss: Boolean = false
) {
    RAT("Giant Rat", 20, 5, 1, 8),
    GOBLIN("Goblin", 40, 10, 2, 18),
    TROLL("Troll", 120, 30, 4, 45),
    DRAGON("Dragon", 500, 200, 10, 200),
    UNDEAD("Undead Horde", 80, 20, 3, 30),
    BOSS_RAT("Rat King", 60, 25, 3, 40, isBoss = true),
    BOSS_GOBLIN("Goblin Warchief", 120, 50, 5, 90, isBoss = true),
    BOSS_TROLL("Mountain Troll", 360, 150, 9, 225, isBoss = true),
    BOSS_DRAGON("Elder Dragon", 1500, 1000, 20, 1000, isBoss = true)
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
    val isBoss: Boolean get() = type.isBoss
}
