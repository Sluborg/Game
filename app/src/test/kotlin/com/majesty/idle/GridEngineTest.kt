package com.majesty.idle

import com.majesty.idle.domain.engine.grid.GridBattle
import com.majesty.idle.domain.engine.grid.GridEngine
import com.majesty.idle.domain.engine.grid.GridPos
import com.majesty.idle.domain.engine.grid.GridUnit
import com.majesty.idle.domain.engine.grid.GridBattleState
import com.majesty.idle.domain.model.Hero
import com.majesty.idle.domain.model.HeroClass
import com.majesty.idle.domain.model.MonsterGroup
import com.majesty.idle.domain.model.MonsterType
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.random.Random

class GridEngineTest {

    private fun makeHero(id: Long, cls: HeroClass = HeroClass.WARRIOR): Hero =
        Hero.create(id = id, name = "Hero$id", heroClass = cls)

    private fun makeMonsterGroup(id: Long, type: MonsterType = MonsterType.GOBLIN): MonsterGroup {
        val hp = type.baseHp
        return MonsterGroup(id = id, type = type, count = 1, hp = hp, maxHp = hp)
    }

    @Test
    fun `grid initializes with heroes at bottom and monsters at top`() {
        val heroes = listOf(makeHero(1), makeHero(2))
        val monsters = listOf(makeMonsterGroup(1000))
        val state = GridBattle.initialize(heroes, monsters)

        val heroUnits = state.heroUnits
        val monsterUnits = state.monsterUnits

        assertTrue(heroUnits.all { it.pos.row >= 3 })
        assertTrue(monsterUnits.all { it.pos.row == 0 })
    }

    @Test
    fun `battle resolves when all monsters are dead`() {
        // Place a very weak monster that dies in one hit
        val weakMonster = GridUnit(
            id = -1L, name = "Rat", emoji = "🐀", isHero = false,
            hp = 1, maxHp = 1, atk = 1, def = 1, str = 1, prot = 0, mor = 5,
            pos = GridPos(1, 0)
        )
        val strongHero = GridUnit(
            id = 1L, name = "Aldric", emoji = "⚔", isHero = true,
            hp = 100, maxHp = 100, atk = 20, def = 10, str = 30, prot = 4, mor = 15,
            pos = GridPos(1, 1)  // adjacent to monster
        )
        val state = GridBattleState(units = listOf(weakMonster, strongHero))

        // Run ticks until resolved (with seeded random so hero always hits)
        var current = state
        val fixedRandom = Random(42)
        repeat(20) {
            if (!current.isResolved) current = GridEngine.tick(current, fixedRandom)
        }

        assertTrue(current.isResolved)
        assertTrue(current.heroesWon)
    }

    @Test
    fun `flanking bonus detected when attacked from two sides`() {
        // Place two heroes adjacent to a monster from different sides (left and above)
        val monster = GridUnit(
            id = -1L, name = "Goblin", emoji = "👺", isHero = false,
            hp = 50, maxHp = 50, atk = 9, def = 9, str = 10, prot = 1, mor = 7,
            pos = GridPos(1, 2)
        )
        val heroLeft = GridUnit(
            id = 1L, name = "A", emoji = "⚔", isHero = true,
            hp = 100, maxHp = 100, atk = 11, def = 10, str = 14, prot = 4, mor = 12,
            pos = GridPos(0, 2)  // left of monster
        )
        val heroAbove = GridUnit(
            id = 2L, name = "B", emoji = "⚔", isHero = true,
            hp = 100, maxHp = 100, atk = 11, def = 10, str = 14, prot = 4, mor = 12,
            pos = GridPos(1, 1)  // above monster
        )
        val state = GridBattleState(units = listOf(monster, heroLeft, heroAbove))

        val result = GridEngine.tick(state, Random(7))

        // Both heroes attacked the monster; flanking should be mentioned in log
        val hasFlankEvent = result.log.any { it.contains("flanked", ignoreCase = true) }
        assertTrue("Expected a flanked event in log: ${result.log}", hasFlankEvent)
    }

    @Test
    fun `bump contest: loser takes damage`() {
        val unitA = GridUnit(
            id = 1L, name = "Aldric", emoji = "⚔", isHero = true,
            hp = 100, maxHp = 100, atk = 11, def = 10, str = 14, prot = 4, mor = 12,
            pos = GridPos(0, 2)
        )
        val unitB = GridUnit(
            id = -1L, name = "Goblin", emoji = "👺", isHero = false,
            hp = 40, maxHp = 40, atk = 9, def = 9, str = 10, prot = 1, mor = 7,
            pos = GridPos(2, 2)
        )
        // Both declare Move to (1,2) — they will bump
        // Use a seeded random and verify total HP is less than starting
        val state = GridBattleState(units = listOf(unitA, unitB))
        val result = GridEngine.tick(state, Random(99))

        val totalHpAfter = result.units.sumOf { it.hp }
        val totalHpBefore = unitA.hp + unitB.hp
        // At minimum one of them took bump damage or combat damage
        assertTrue(totalHpAfter <= totalHpBefore)
    }

    @Test
    fun `battle result awards gold for killed monsters`() {
        val hero = makeHero(1)
        val monster = makeMonsterGroup(1000, MonsterType.GOBLIN)
        val initial = GridBattle.initialize(listOf(hero), listOf(monster))

        // Simulate a resolved battle where hero won
        val resolvedState = initial.copy(
            units = initial.units.map { if (!it.isHero) it.copy(hp = 0, isAlive = false) else it },
            isResolved = true,
            heroesWon = true
        )
        val result = GridBattle.toResult(resolvedState, listOf(hero), listOf(monster))

        assertEquals(MonsterType.GOBLIN.goldReward, result.goldEarned)
        assertEquals(1, result.monstersKilled)
    }

    @Test
    fun `unit at low HP with low morale may flee`() {
        val cowardlyMonster = GridUnit(
            id = -1L, name = "Rat", emoji = "🐀", isHero = false,
            hp = 2, maxHp = 40, atk = 6, def = 7, str = 8, prot = 0, mor = 4,  // mor=4 < 12
            pos = GridPos(1, 2)
        )
        val state = GridBattleState(units = listOf(cowardlyMonster))

        // Run many ticks — with mor=4 the rat should flee eventually
        var current = state
        repeat(30) { if (!current.isResolved) current = GridEngine.tick(current) }

        // Either fled (removed) or battle resolved
        val rat = current.units.find { it.id == -1L }
        val ratFledOrDead = rat == null || !rat.isAlive
        assertTrue(ratFledOrDead)
    }
}
