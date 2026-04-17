package com.majesty.idle.domain.engine.grid

import com.majesty.idle.domain.model.Hero
import com.majesty.idle.domain.model.HeroClass
import com.majesty.idle.domain.model.MonsterGroup
import com.majesty.idle.domain.model.MonsterType

object GridBattle {

    fun initialize(heroes: List<Hero>, monsters: List<MonsterGroup>): GridBattleState {
        val units = mutableListOf<GridUnit>()

        // Up to 6 heroes, rows 4 and 3 (bottom half)
        heroes.filter { it.isAlive }.take(6).forEachIndexed { index, hero ->
            val col = index % GridPos.COLS
            val row = if (index < 3) GridPos.ROWS - 1 else GridPos.ROWS - 2
            units.add(heroToGridUnit(hero, GridPos(col, row)))
        }

        // Up to 3 monsters, row 0 (top)
        monsters.filter { it.isAlive }.take(GridPos.COLS).forEachIndexed { index, monster ->
            units.add(monsterToGridUnit(monster, GridPos(index, 0)))
        }

        return GridBattleState(units = units)
    }

    private data class UnitStats(
        val atk: Int, val def: Int, val str: Int, val prot: Int, val mor: Int
    )

    private fun heroStats(cls: HeroClass) = when (cls) {
        HeroClass.WARRIOR -> UnitStats(11, 10, 14, 4, 12)
        HeroClass.PALADIN -> UnitStats(10, 11, 13, 5, 15)
        HeroClass.RANGER  -> UnitStats(10, 11, 11, 2, 10)
        HeroClass.ROGUE   -> UnitStats(12, 13, 10, 1,  9)
        HeroClass.WIZARD  -> UnitStats( 7,  8,  8, 0, 11)
    }

    private fun monsterStats(type: MonsterType) = when (type) {
        MonsterType.RAT         -> UnitStats( 6,  7,  8, 0,  6)
        MonsterType.GOBLIN      -> UnitStats( 9,  9, 10, 1,  7)
        MonsterType.UNDEAD      -> UnitStats(10,  8, 11, 2, 20)
        MonsterType.TROLL       -> UnitStats(12, 10, 14, 3, 10)
        MonsterType.DRAGON      -> UnitStats(15, 13, 18, 6, 20)
        MonsterType.BOSS_RAT    -> UnitStats(10, 11, 12, 0, 10)
        MonsterType.BOSS_GOBLIN -> UnitStats(13, 13, 14, 2, 11)
        MonsterType.BOSS_TROLL  -> UnitStats(16, 14, 18, 4, 14)
        MonsterType.BOSS_DRAGON -> UnitStats(19, 17, 22, 7, 20)
    }

    private fun heroToGridUnit(hero: Hero, pos: GridPos): GridUnit {
        val (atk, def, str, prot, mor) = heroStats(hero.heroClass)
        val levelBonus = hero.level - 1
        return GridUnit(
            id = hero.id,
            name = hero.name,
            emoji = heroEmoji(hero.heroClass),
            isHero = true,
            hp = hero.hp,
            maxHp = hero.maxHp,
            atk = atk + levelBonus,
            def = def + levelBonus,
            str = str + levelBonus,
            prot = prot,
            mor = mor,
            pos = pos
        )
    }

    private fun monsterToGridUnit(monster: MonsterGroup, pos: GridPos): GridUnit {
        val (atk, def, str, prot, mor) = monsterStats(monster.type)
        return GridUnit(
            id = -monster.id,
            name = monster.type.displayName,
            emoji = monsterEmoji(monster.type),
            isHero = false,
            hp = monster.hp,
            maxHp = monster.maxHp,
            atk = atk,
            def = def,
            str = str,
            prot = prot,
            mor = mor,
            pos = pos
        )
    }

    private fun heroEmoji(cls: HeroClass) = when (cls) {
        HeroClass.WARRIOR -> "⚔"
        HeroClass.PALADIN -> "🛡"
        HeroClass.RANGER  -> "🏹"
        HeroClass.ROGUE   -> "🗡"
        HeroClass.WIZARD  -> "🔮"
    }

    private fun monsterEmoji(type: MonsterType) = when (type) {
        MonsterType.RAT         -> "🐀"
        MonsterType.GOBLIN      -> "👺"
        MonsterType.UNDEAD      -> "💀"
        MonsterType.TROLL       -> "👹"
        MonsterType.DRAGON      -> "🐉"
        MonsterType.BOSS_RAT    -> "👑"
        MonsterType.BOSS_GOBLIN -> "👑"
        MonsterType.BOSS_TROLL  -> "👑"
        MonsterType.BOSS_DRAGON -> "👑"
    }

    fun toResult(
        finalState: GridBattleState,
        originalHeroes: List<Hero>,
        originalMonsters: List<MonsterGroup>
    ): GridBattleResult {
        val totalXpFromGrid = originalMonsters.sumOf { monster ->
            if (finalState.units.find { it.id == -monster.id }?.isAlive == false)
                monster.type.xpReward
            else 0L
        }

        val heroesAfter = originalHeroes.map { hero ->
            val gridUnit = finalState.units.find { it.id == hero.id }
            val newHp = gridUnit?.hp?.coerceAtLeast(0) ?: hero.hp
            val heroWithHp = hero.copy(hp = newHp)
            if (gridUnit != null && totalXpFromGrid > 0) heroWithHp.gainExperience(totalXpFromGrid)
            else heroWithHp
        }

        val monstersKilled = originalMonsters.count { monster ->
            finalState.units.find { it.id == -monster.id }?.isAlive == false
        }
        val bossesKilled = originalMonsters.count { monster ->
            monster.isBoss && finalState.units.find { it.id == -monster.id }?.isAlive == false
        }
        val goldEarned = originalMonsters.sumOf { monster ->
            if (finalState.units.find { it.id == -monster.id }?.isAlive == false) monster.type.goldReward else 0L
        }

        val outcomeMsg = if (finalState.heroesWon) "⚔ Victory! The battle is won." else "💀 The heroes have fallen..."
        return GridBattleResult(
            heroesAfter = heroesAfter,
            goldEarned = goldEarned,
            monstersKilled = monstersKilled,
            bossesKilled = bossesKilled,
            events = finalState.log.takeLast(3) + listOf(outcomeMsg)
        )
    }
}
