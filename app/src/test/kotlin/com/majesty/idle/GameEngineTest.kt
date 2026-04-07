package com.majesty.idle

import com.majesty.idle.domain.engine.GameEngine
import com.majesty.idle.domain.engine.OfflineProgressCalculator
import com.majesty.idle.domain.model.KingdomState
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class GameEngineTest {

    @Test
    fun `tick increases gold by goldPerSecond`() {
        val state = KingdomState.seed() // Palace = 2.0 gold/s
        val ticked = GameEngine.tick(state)
        assertEquals(state.gold + state.goldPerSecond.toLong(), ticked.gold)
    }

    @Test
    fun `tick increments tickCount`() {
        val state = KingdomState.seed()
        val ticked = GameEngine.tick(state)
        assertEquals(1L, ticked.tickCount)
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
}
