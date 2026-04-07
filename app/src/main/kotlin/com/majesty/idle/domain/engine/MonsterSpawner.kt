package com.majesty.idle.domain.engine

import com.majesty.idle.domain.GameConstants
import com.majesty.idle.domain.model.MonsterGroup
import com.majesty.idle.domain.model.MonsterType

object MonsterSpawner {

    private var nextId = 1000L

    fun update(monsters: List<MonsterGroup>, tickCount: Long): List<MonsterGroup> {
        val alive = monsters.filter { it.isAlive }
        return if (tickCount > 0 && tickCount % GameConstants.MONSTER_SPAWN_BASE_INTERVAL == 0L) {
            alive + spawn(tickCount)
        } else {
            alive
        }
    }

    private fun spawn(tickCount: Long): MonsterGroup {
        val type = when {
            tickCount > 600 -> MonsterType.DRAGON
            tickCount > 300 -> MonsterType.TROLL
            tickCount > 120 -> MonsterType.GOBLIN
            else -> MonsterType.RAT
        }
        val count = when (type) {
            MonsterType.RAT -> (2..5).random()
            MonsterType.GOBLIN -> (1..3).random()
            else -> 1
        }
        val totalHp = type.baseHp * count
        return MonsterGroup(
            id = nextId++,
            type = type,
            count = count,
            hp = totalHp,
            maxHp = totalHp
        )
    }

    fun applyHeroDamage(
        monsters: List<MonsterGroup>,
        heroes: List<com.majesty.idle.domain.model.Hero>
    ): Pair<List<MonsterGroup>, List<com.majesty.idle.domain.model.Hero>> {
        val updatedMonsters = monsters.toMutableList()
        val updatedHeroes = heroes.toMutableList()

        for (i in updatedHeroes.indices) {
            val hero = updatedHeroes[i]
            if (hero.state != com.majesty.idle.domain.model.HeroState.HUNTING) continue
            val monsterIdx = updatedMonsters.indexOfFirst { it.id == hero.targetMonsterId && it.isAlive }
            if (monsterIdx < 0) continue

            val monster = updatedMonsters[monsterIdx]
            val heroDamage = when (hero.heroClass) {
                com.majesty.idle.domain.model.HeroClass.WARRIOR -> 10 + hero.level * 2
                com.majesty.idle.domain.model.HeroClass.PALADIN -> 8 + hero.level * 2
                com.majesty.idle.domain.model.HeroClass.RANGER -> 12 + hero.level
                com.majesty.idle.domain.model.HeroClass.WIZARD -> 20 + hero.level * 3
                com.majesty.idle.domain.model.HeroClass.ROGUE -> 15 + hero.level * 2
            }
            val monsterDamage = monster.type.threatLevel * 3

            val newMonsterHp = (monster.hp - heroDamage).coerceAtLeast(0)
            val newHeroHp = (hero.hp - monsterDamage).coerceAtLeast(0)

            updatedMonsters[monsterIdx] = monster.copy(hp = newMonsterHp)

            // Hero gains gold when monster dies
            val goldGain = if (newMonsterHp == 0) monster.type.goldReward else 0L
            updatedHeroes[i] = hero.copy(hp = newHeroHp, gold = hero.gold + goldGain)
        }

        return updatedMonsters to updatedHeroes
    }
}
