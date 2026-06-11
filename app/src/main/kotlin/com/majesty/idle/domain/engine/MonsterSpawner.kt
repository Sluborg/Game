package com.majesty.idle.domain.engine

import com.majesty.idle.domain.GameConstants
import com.majesty.idle.domain.model.Hero
import com.majesty.idle.domain.model.HeroClass
import com.majesty.idle.domain.model.HeroState
import com.majesty.idle.domain.model.MonsterGroup
import com.majesty.idle.domain.model.MonsterType
import kotlin.random.Random

data class CombatResult(
    val monsters: List<MonsterGroup>,
    val heroes: List<Hero>,
    val events: List<String>
)

object MonsterSpawner {

    /** Returns updated monster list + next available ID. Handles regular, surge, and boss spawns. */
    fun update(
        monsters: List<MonsterGroup>,
        tickCount: Long,
        nextMonsterId: Long
    ): Pair<List<MonsterGroup>, Long> {
        val alive = monsters.filter { it.isAlive }
        var current = alive
        var id = nextMonsterId

        // Regular spawn every 45 ticks
        if (tickCount > 0 && tickCount % GameConstants.MONSTER_SPAWN_BASE_INTERVAL == 0L) {
            val (m, newId) = spawnRegular(tickCount, id)
            current = current + m
            id = newId
        }

        // Monster surge: extra spawn every 5 minutes (only after tick 180 to avoid early overwhelm)
        if (tickCount > 180 && tickCount % GameConstants.MONSTER_SURGE_INTERVAL == 0L) {
            val (m, newId) = spawnRegular(tickCount, id)
            current = current + m
            id = newId
        }

        // Boss spawn every ~8 minutes (only after tick 240)
        if (tickCount > 240 && tickCount % GameConstants.BOSS_SPAWN_INTERVAL == 0L) {
            val (m, newId) = spawnBoss(tickCount, id)
            current = current + m
            id = newId
        }

        return current to id
    }

    private fun spawnRegular(tickCount: Long, id: Long): Pair<MonsterGroup, Long> {
        val type = when {
            tickCount > 600 -> MonsterType.DRAGON
            tickCount > 400 -> if (tickCount % 3 == 0L) MonsterType.UNDEAD else MonsterType.TROLL
            tickCount > 300 -> MonsterType.TROLL
            tickCount > 120 -> if (tickCount % 2 == 0L) MonsterType.GOBLIN else MonsterType.UNDEAD
            else -> MonsterType.RAT
        }
        val count = when (type) {
            MonsterType.RAT -> (2..5).random()
            MonsterType.GOBLIN -> (1..3).random()
            MonsterType.UNDEAD -> (1..3).random()
            else -> 1
        }
        val totalHp = type.baseHp * count
        return MonsterGroup(id = id, type = type, count = count, hp = totalHp, maxHp = totalHp) to (id + 1)
    }

    private fun spawnBoss(tickCount: Long, id: Long): Pair<MonsterGroup, Long> {
        val type = when {
            tickCount > 840 -> MonsterType.BOSS_DRAGON
            tickCount > 480 -> MonsterType.BOSS_TROLL
            else -> MonsterType.BOSS_GOBLIN
        }
        val hp = type.baseHp
        return MonsterGroup(id = id, type = type, count = 1, hp = hp, maxHp = hp) to (id + 1)
    }

    fun applyHeroDamage(
        monsters: List<MonsterGroup>,
        heroes: List<Hero>,
        damageReduction: Int = 0,
        healRateBonus: Float = 0f
    ): CombatResult {
        val updatedMonsters = monsters.toMutableList()
        val updatedHeroes = heroes.toMutableList()
        val events = mutableListOf<String>()

        for (i in updatedHeroes.indices) {
            val hero = updatedHeroes[i]
            if (hero.state != HeroState.HUNTING) continue
            val monsterIdx = updatedMonsters.indexOfFirst { it.id == hero.targetMonsterId && it.isAlive }
            if (monsterIdx < 0) continue

            val monster = updatedMonsters[monsterIdx]

            val baseDamage = when (hero.heroClass) {
                HeroClass.WARRIOR -> 10 + hero.level * 2
                HeroClass.PALADIN -> 8 + hero.level * 2
                HeroClass.RANGER -> 12 + hero.level
                HeroClass.WIZARD -> 20 + hero.level * 3
                HeroClass.ROGUE -> 15 + hero.level * 2
            }
            // Critical hits: 10% chance for double damage (Rogues crit 25% of the time)
            val critChance = if (hero.heroClass == HeroClass.ROGUE) 0.25 else 0.10
            val isCrit = Random.nextDouble() < critChance
            val heroDamage = if (isCrit) baseDamage * 2 else baseDamage
            val rawMonsterDamage = monster.type.threatLevel * 3
            val effectiveDamage = (rawMonsterDamage - damageReduction).coerceAtLeast(1)

            val newMonsterHp = (monster.hp - heroDamage).coerceAtLeast(0)
            val newHeroHp = (hero.hp - effectiveDamage).coerceAtLeast(0)

            updatedMonsters[monsterIdx] = monster.copy(hp = newMonsterHp)

            // Award gold and XP on kill
            val goldGain = if (newMonsterHp == 0) monster.type.goldReward else 0L
            val xpGain = if (newMonsterHp == 0) monster.type.xpReward else 0L

            val heroAfterXp = if (xpGain > 0) hero.gainExperience(xpGain) else hero
            val finalHero = heroAfterXp.copy(
                hp = newHeroHp.coerceAtMost(heroAfterXp.maxHp),
                gold = heroAfterXp.gold + goldGain
            )

            // Generate kill / crit events
            if (newMonsterHp == 0) {
                val prefix = when {
                    monster.isBoss -> "👑 "
                    isCrit -> "💥 "
                    else -> ""
                }
                events.add("${prefix}${hero.name} slew ${monster.type.displayName}! +${goldGain}g")
            } else if (isCrit) {
                events.add("💥 ${hero.name} crits ${monster.type.displayName} for $heroDamage!")
            }

            // Detect level-up
            if (finalHero.level > hero.level) {
                events.add("⬆ ${finalHero.name} reached Level ${finalHero.level}!")
            }

            updatedHeroes[i] = finalHero
        }

        return CombatResult(monsters = updatedMonsters, heroes = updatedHeroes, events = events)
    }
}
