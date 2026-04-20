package com.majesty.idle.domain.model

enum class BuildingType(
    val displayName: String,
    val baseCost: Long,
    val baseGoldPerSecond: Double,
    val maxLevel: Int = 5,
    val effectDescription: String = ""
) {
    PALACE("Palace", 0, 3.0),
    TAVERN("Tavern", 150, 0.0, effectDescription = "Heroes heal here when wounded"),
    BLACKSMITH("Blacksmith", 300, 1.5),
    MARKET("Market", 250, 1.0),
    FIGHTER_GUILD("Fighter Guild", 400, 0.0, effectDescription = "Recruits Warriors & Paladins"),
    RANGER_GUILD("Ranger Guild", 600, 0.0, effectDescription = "Recruits Rangers"),
    MAGE_GUILD("Mage Guild", 800, 0.0, effectDescription = "Recruits Wizards"),
    TEMPLE("Temple", 400, 0.5, effectDescription = "Increases hero heal rate"),
    GUARD_TOWER("Guard Tower", 350, 0.0, effectDescription = "Reduces hero damage taken"),
    BARRACKS("Barracks", 450, 0.0, effectDescription = "Increases hero max HP")
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

    val recruitableClasses: List<HeroClass>
        get() = when (type) {
            BuildingType.FIGHTER_GUILD -> listOf(HeroClass.WARRIOR, HeroClass.PALADIN)
            BuildingType.RANGER_GUILD -> listOf(HeroClass.RANGER)
            BuildingType.MAGE_GUILD -> listOf(HeroClass.WIZARD)
            BuildingType.TAVERN -> listOf(HeroClass.ROGUE)
            else -> emptyList()
        }

    val isGuild: Boolean
        get() = recruitableClasses.isNotEmpty()

    fun guardTowerDamageReduction(): Int = if (type == BuildingType.GUARD_TOWER) level else 0
    fun templeHealBonus(): Float = if (type == BuildingType.TEMPLE) level * 0.02f else 0f
    fun barracksHpBonus(): Int = if (type == BuildingType.BARRACKS) level * 15 else 0
}
