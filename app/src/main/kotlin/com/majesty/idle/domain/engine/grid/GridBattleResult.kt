package com.majesty.idle.domain.engine.grid

import com.majesty.idle.domain.model.Hero

data class GridBattleResult(
    val heroesAfter: List<Hero>,
    val goldEarned: Long,
    val monstersKilled: Int,
    val bossesKilled: Int,
    val events: List<String>
)
