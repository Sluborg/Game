package com.majesty.idle.domain.model

enum class BuildingType(
    val displayName: String,
    val baseCost: Long,
    val baseGoldPerSecond: Double,
    val maxLevel: Int = 5
) {
    PALACE("Palace", 0, 2.0),
    TAVERN("Tavern", 200, 0.0),
    BLACKSMITH("Blacksmith", 300, 1.5),
    MARKET("Market", 250, 1.0),
    FIGHTER_GUILD("Fighter Guild", 500, 0.0),
    RANGER_GUILD("Ranger Guild", 600, 0.0),
    MAGE_GUILD("Mage Guild", 800, 0.0),
    TEMPLE("Temple", 400, 0.5),
    GUARD_TOWER("Guard Tower", 350, 0.0),
    BARRACKS("Barracks", 450, 0.0)
}

data class Building(
    val id: Long,
    val type: BuildingType,
    val level: Int = 1,
    val isConstructing: Boolean = false,
    val constructionProgress: Float = 0f
) {
    val goldPerSecond: Double
        get() = type.baseGoldPerSecond * level

    val upgradeCost: Long
        get() = (type.baseCost * level * 1.5).toLong()

    val canUpgrade: Boolean
        get() = level < type.maxLevel && !isConstructing
}
