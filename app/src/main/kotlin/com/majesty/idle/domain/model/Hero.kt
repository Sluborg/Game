package com.majesty.idle.domain.model

enum class HeroClass(val displayName: String, val requiredBuilding: BuildingType?) {
    WARRIOR("Warrior", BuildingType.FIGHTER_GUILD),
    RANGER("Ranger", BuildingType.RANGER_GUILD),
    WIZARD("Wizard", BuildingType.MAGE_GUILD),
    PALADIN("Paladin", BuildingType.FIGHTER_GUILD),
    ROGUE("Rogue", null)
}

enum class HeroState {
    IDLE,
    PATROLLING,
    HUNTING,
    FLEEING,
    SHOPPING,
    RESTING
}

data class Hero(
    val id: Long,
    val name: String,
    val heroClass: HeroClass,
    val level: Int = 1,
    val experience: Long = 0,
    val gold: Long = 0,
    val hp: Int,
    val maxHp: Int,
    val state: HeroState = HeroState.IDLE,
    val targetBuildingId: Long? = null,
    val targetMonsterId: Long? = null
) {
    val hpPercent: Float get() = hp.toFloat() / maxHp.toFloat()
    val isAlive: Boolean get() = hp > 0
    val experienceToNextLevel: Long get() = level * 100L

    companion object {
        fun create(id: Long, name: String, heroClass: HeroClass): Hero {
            val baseHp = when (heroClass) {
                HeroClass.WARRIOR -> 120
                HeroClass.PALADIN -> 140
                HeroClass.RANGER -> 80
                HeroClass.WIZARD -> 60
                HeroClass.ROGUE -> 90
            }
            return Hero(id = id, name = name, heroClass = heroClass, hp = baseHp, maxHp = baseHp)
        }
    }
}
