package com.majesty.idle.domain.model

import com.majesty.idle.domain.GameConstants

enum class HeroClass(val displayName: String, val requiredBuilding: BuildingType?) {
    WARRIOR("Warrior", BuildingType.FIGHTER_GUILD),
    RANGER("Ranger", BuildingType.RANGER_GUILD),
    WIZARD("Wizard", BuildingType.MAGE_GUILD),
    PALADIN("Paladin", BuildingType.FIGHTER_GUILD),
    ROGUE("Rogue", BuildingType.TAVERN)
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

    fun gainExperience(amount: Long): Hero {
        if (amount <= 0 || level >= GameConstants.MAX_HERO_LEVEL) return this
        var hero = this
        var remaining = amount
        while (remaining > 0 && hero.level < GameConstants.MAX_HERO_LEVEL) {
            val toNext = hero.experienceToNextLevel - hero.experience
            if (remaining >= toNext) {
                remaining -= toNext
                val newLevel = hero.level + 1
                val baseHp = baseMaxHpForClass(hero.heroClass)
                val newMaxHp = baseHp + (newLevel - 1) * GameConstants.HP_PER_LEVEL
                hero = hero.copy(
                    level = newLevel,
                    experience = 0,
                    maxHp = newMaxHp,
                    hp = (hero.hp + GameConstants.HP_GAIN_ON_LEVEL_UP).coerceAtMost(newMaxHp)
                )
            } else {
                hero = hero.copy(experience = hero.experience + remaining)
                remaining = 0
            }
        }
        return hero
    }

    companion object {
        fun baseMaxHpForClass(cls: HeroClass): Int = when (cls) {
            HeroClass.WARRIOR -> 120
            HeroClass.PALADIN -> 140
            HeroClass.RANGER -> 80
            HeroClass.WIZARD -> 60
            HeroClass.ROGUE -> 90
        }

        fun recruitCost(heroClass: HeroClass): Long = when (heroClass) {
            HeroClass.WARRIOR -> 150L
            HeroClass.RANGER -> 200L
            HeroClass.ROGUE -> 175L
            HeroClass.PALADIN -> 250L
            HeroClass.WIZARD -> 300L
        }

        private val WARRIOR_NAMES = listOf("Aldric", "Bjorn", "Eirik", "Tomas", "Wulf")
        private val RANGER_NAMES = listOf("Sylva", "Keris", "Fenn", "Arlow", "Mirel")
        private val WIZARD_NAMES = listOf("Alaric", "Syndra", "Vex", "Morwen", "Ilyas")
        private val PALADIN_NAMES = listOf("Dawnholt", "Sera", "Valric", "Oswin", "Lira")
        private val ROGUE_NAMES = listOf("Shade", "Nyx", "Cobolt", "Riven", "Pix")

        fun randomNameForClass(cls: HeroClass, existingNames: Set<String>): String {
            val pool = when (cls) {
                HeroClass.WARRIOR -> WARRIOR_NAMES
                HeroClass.RANGER -> RANGER_NAMES
                HeroClass.WIZARD -> WIZARD_NAMES
                HeroClass.PALADIN -> PALADIN_NAMES
                HeroClass.ROGUE -> ROGUE_NAMES
            }
            return pool.firstOrNull { it !in existingNames }
                ?: "${cls.displayName} ${existingNames.size + 1}"
        }

        fun create(id: Long, name: String, heroClass: HeroClass): Hero {
            val baseHp = baseMaxHpForClass(heroClass)
            return Hero(id = id, name = name, heroClass = heroClass, hp = baseHp, maxHp = baseHp)
        }
    }
}
