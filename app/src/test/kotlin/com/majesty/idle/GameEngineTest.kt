package com.majesty.idle

import com.majesty.idle.domain.engine.GameEngine
import com.majesty.idle.domain.engine.OfflineProgressCalculator
import com.majesty.idle.domain.model.Hero
import com.majesty.idle.domain.model.HeroClass
import com.majesty.idle.domain.model.KingdomState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class GameEngineTest {

    @Test
    fun `tick increases gold by goldPerSecond`() {
        val state = KingdomState.seed() // Palace = 3.0 gold/s
        val result = GameEngine.tick(state)
        assertEquals(state.gold + state.goldPerSecond.toLong(), result.newState.gold)
    }

    @Test
    fun `tick increments tickCount`() {
        val state = KingdomState.seed()
        val result = GameEngine.tick(state)
        assertEquals(1L, result.newState.tickCount)
    }

    @Test
    fun `offline calculator caps at 8 hours`() {
        val state = KingdomState.seed().copy(lastSavedAt = System.currentTimeMillis() - 48 * 3_600_000L)
        val gains = OfflineProgressCalculator.calculate(state, System.currentTimeMillis())
        val maxMs = (8.0 * 3_600_000).toLong()
        assertTrue(gains.elapsedMs <= maxMs)
    }

    @Test
    fun `offline calculator returns positive gold for seeded state`() {
        val pastTime = System.currentTimeMillis() - 60_000L // 1 minute ago
        val state = KingdomState.seed().copy(lastSavedAt = pastTime)
        val gains = OfflineProgressCalculator.calculate(state, System.currentTimeMillis())
        assertTrue(gains.goldEarned > 0)
    }

    @Test
    fun `hero levels up after gaining enough XP`() {
        val hero = Hero.create(id = 1, name = "Test", heroClass = HeroClass.WARRIOR)
        val nearLevelUp = hero.copy(experience = hero.experienceToNextLevel - 5)
        val levelled = nearLevelUp.gainExperience(10)
        assertEquals(2, levelled.level)
        assertTrue(levelled.maxHp > hero.maxHp)
    }

    @Test
    fun `hero recruit cost scales with class`() {
        assertTrue(
            Hero.recruitCost(HeroClass.WARRIOR) < Hero.recruitCost(HeroClass.WIZARD)
        )
    }

    @Test
    fun `hero XP gain does not exceed max level`() {
        val hero = Hero.create(id = 1, name = "Test", heroClass = HeroClass.WARRIOR)
        // Give a huge amount of XP
        val maxed = hero.gainExperience(999_999L)
        assertTrue(maxed.level <= com.majesty.idle.domain.GameConstants.MAX_HERO_LEVEL)
    }
}
