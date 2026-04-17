package com.majesty.idle.domain.engine.grid

data class GridBattleState(
    val units: List<GridUnit>,
    val tick: Int = 0,
    val log: List<String> = emptyList(),
    val isResolved: Boolean = false,
    val heroesWon: Boolean = false
) {
    val heroUnits: List<GridUnit> get() = units.filter { it.isHero && it.isAlive }
    val monsterUnits: List<GridUnit> get() = units.filter { !it.isHero && it.isAlive }
    fun unitAt(pos: GridPos): GridUnit? = units.find { it.pos == pos && it.isAlive }
}
