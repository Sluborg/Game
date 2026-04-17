package com.majesty.idle.domain.engine.grid

import kotlin.random.Random

object GridAI {

    fun decide(unit: GridUnit, state: GridBattleState, random: Random = Random): GridAction {
        val enemies = if (unit.isHero) state.monsterUnits else state.heroUnits
        if (enemies.isEmpty()) return GridAction.Wait

        // Morale check: badly wounded low-morale units may flee
        if (unit.hpPercent < 0.25f && unit.mor < 12) {
            if (random.nextInt(20) + 1 >= unit.mor) return GridAction.Flee
        }

        // Attack lowest-HP adjacent enemy
        val adjacentEnemy = enemies
            .filter { it.pos.isAdjacentTo(unit.pos) }
            .minByOrNull { it.hp }
        if (adjacentEnemy != null) return GridAction.Attack(adjacentEnemy.pos)

        // Flanking opportunity: move adjacent to an enemy already being attacked
        val flankPos = findFlankingMove(unit, enemies, state)
        if (flankPos != null) return GridAction.Move(flankPos)

        // Advance toward nearest enemy
        val nearest = enemies.minByOrNull { unit.pos.manhattanDistanceTo(it.pos) }
            ?: return GridAction.Wait
        val bestMove = unit.pos.neighbors()
            .filter { state.unitAt(it) == null }
            .minByOrNull { it.manhattanDistanceTo(nearest.pos) }
        return if (bestMove != null) GridAction.Move(bestMove) else GridAction.Wait
    }

    private fun findFlankingMove(
        unit: GridUnit,
        enemies: List<GridUnit>,
        state: GridBattleState
    ): GridPos? {
        val friendlies = if (unit.isHero) state.heroUnits else state.monsterUnits
        val engagedEnemy = enemies.firstOrNull { enemy ->
            friendlies.any { ally -> ally.id != unit.id && ally.pos.isAdjacentTo(enemy.pos) }
        } ?: return null

        return engagedEnemy.pos.neighbors()
            .filter { pos -> pos != unit.pos && state.unitAt(pos) == null }
            .minByOrNull { it.manhattanDistanceTo(unit.pos) }
    }
}
