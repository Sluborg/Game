package com.majesty.idle.domain.engine.grid

sealed class GridAction {
    data class Attack(val targetPos: GridPos) : GridAction()
    data class Move(val toPos: GridPos) : GridAction()
    object Wait : GridAction()
    object Flee : GridAction()
}
