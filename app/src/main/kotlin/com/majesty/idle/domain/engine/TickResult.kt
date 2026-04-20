package com.majesty.idle.domain.engine

import com.majesty.idle.domain.model.Hero
import com.majesty.idle.domain.model.KingdomState
import com.majesty.idle.domain.model.MonsterGroup

data class GridBattleTrigger(
    val heroes: List<Hero>,
    val monsters: List<MonsterGroup>
)

data class TickResult(
    val newState: KingdomState,
    val events: List<String> = emptyList(),
    val gridBattleTrigger: GridBattleTrigger? = null
)
