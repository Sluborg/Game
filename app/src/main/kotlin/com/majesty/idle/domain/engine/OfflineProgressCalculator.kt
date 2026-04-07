package com.majesty.idle.domain.engine

import com.majesty.idle.domain.GameConstants
import com.majesty.idle.domain.model.KingdomState

data class OfflineGains(val goldEarned: Long, val elapsedMs: Long)

object OfflineProgressCalculator {
    fun calculate(state: KingdomState, nowMillis: Long): OfflineGains {
        val maxOfflineMs = (GameConstants.MAX_OFFLINE_HOURS * 3_600_000).toLong()
        val elapsedMs = (nowMillis - state.lastSavedAt).coerceIn(0L, maxOfflineMs)
        val elapsedSeconds = elapsedMs / 1000.0
        val goldEarned = (state.goldPerSecond * elapsedSeconds).toLong()
        return OfflineGains(goldEarned = goldEarned, elapsedMs = elapsedMs)
    }
}
