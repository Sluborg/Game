package com.majesty.idle.domain.engine

import com.majesty.idle.domain.model.KingdomState

data class TickResult(
    val newState: KingdomState,
    val events: List<String> = emptyList()
)
