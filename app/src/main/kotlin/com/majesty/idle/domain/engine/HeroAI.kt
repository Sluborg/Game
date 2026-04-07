package com.majesty.idle.domain.engine

import com.majesty.idle.domain.GameConstants
import com.majesty.idle.domain.model.Building
import com.majesty.idle.domain.model.BuildingType
import com.majesty.idle.domain.model.Hero
import com.majesty.idle.domain.model.HeroState
import com.majesty.idle.domain.model.MonsterGroup

object HeroAI {

    fun updateAll(
        heroes: List<Hero>,
        buildings: List<Building>,
        monsters: List<MonsterGroup>
    ): List<Hero> = heroes.map { update(it, buildings, monsters) }

    private fun update(
        hero: Hero,
        buildings: List<Building>,
        monsters: List<MonsterGroup>
    ): Hero {
        if (!hero.isAlive) return hero

        return when (hero.state) {
            HeroState.IDLE, HeroState.PATROLLING -> decideAction(hero, buildings, monsters)
            HeroState.HUNTING -> hunt(hero, buildings, monsters)
            HeroState.FLEEING -> flee(hero, buildings)
            HeroState.RESTING -> rest(hero)
            HeroState.SHOPPING -> shop(hero, buildings)
        }
    }

    private fun decideAction(hero: Hero, buildings: List<Building>, monsters: List<MonsterGroup>): Hero {
        val aliveMonsters = monsters.filter { it.isAlive }
        val hasTavern = buildings.any { it.type == BuildingType.TAVERN }
        val hasShop = buildings.any {
            it.type == BuildingType.BLACKSMITH || it.type == BuildingType.MARKET
        }

        return when {
            // Flee if low HP regardless of state
            hero.hpPercent < GameConstants.HERO_FLEE_HP_PERCENT ->
                hero.copy(state = HeroState.FLEEING, targetMonsterId = null,
                    targetBuildingId = buildings.firstOrNull { it.type == BuildingType.TAVERN || it.type == BuildingType.TEMPLE }?.id)

            // Hunt nearby monsters if HP is ok
            hero.hpPercent >= GameConstants.HERO_HUNT_MIN_HP_PERCENT && aliveMonsters.isNotEmpty() ->
                hero.copy(state = HeroState.HUNTING, targetMonsterId = aliveMonsters.first().id)

            // Go shopping if has gold and shop exists
            hero.gold >= 50 && hasShop ->
                hero.copy(state = HeroState.SHOPPING,
                    targetBuildingId = buildings.first { it.type == BuildingType.BLACKSMITH || it.type == BuildingType.MARKET }.id)

            else -> hero.copy(state = HeroState.PATROLLING)
        }
    }

    private fun hunt(hero: Hero, buildings: List<Building>, monsters: List<MonsterGroup>): Hero {
        if (hero.hpPercent < GameConstants.HERO_FLEE_HP_PERCENT) {
            return hero.copy(
                state = HeroState.FLEEING,
                targetMonsterId = null,
                targetBuildingId = buildings.firstOrNull {
                    it.type == BuildingType.TAVERN || it.type == BuildingType.TEMPLE
                }?.id
            )
        }
        val target = monsters.firstOrNull { it.id == hero.targetMonsterId && it.isAlive }
            ?: monsters.firstOrNull { it.isAlive }
        return if (target == null) {
            hero.copy(state = HeroState.IDLE, targetMonsterId = null)
        } else {
            hero.copy(targetMonsterId = target.id)
        }
    }

    private fun flee(hero: Hero, buildings: List<Building>): Hero {
        val restBuilding = buildings.firstOrNull {
            it.type == BuildingType.TAVERN || it.type == BuildingType.TEMPLE
        }
        return if (restBuilding == null) {
            hero.copy(state = HeroState.PATROLLING, targetBuildingId = null)
        } else {
            hero.copy(state = HeroState.RESTING, targetBuildingId = restBuilding.id)
        }
    }

    private fun rest(hero: Hero): Hero {
        val healAmount = (hero.maxHp * 0.05f).toInt().coerceAtLeast(1)
        val newHp = (hero.hp + healAmount).coerceAtMost(hero.maxHp)
        return if (newHp >= hero.maxHp) {
            hero.copy(hp = newHp, state = HeroState.IDLE, targetBuildingId = null)
        } else {
            hero.copy(hp = newHp)
        }
    }

    private fun shop(hero: Hero, buildings: List<Building>): Hero {
        val shopExists = buildings.any {
            it.id == hero.targetBuildingId &&
                (it.type == BuildingType.BLACKSMITH || it.type == BuildingType.MARKET)
        }
        return if (!shopExists || hero.gold < 50) {
            hero.copy(state = HeroState.IDLE, targetBuildingId = null)
        } else {
            // Hero spends gold — the gold flows back to the player via building income
            hero.copy(gold = hero.gold - 50, state = HeroState.IDLE, targetBuildingId = null)
        }
    }
}
