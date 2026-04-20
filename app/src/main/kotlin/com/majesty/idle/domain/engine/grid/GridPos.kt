package com.majesty.idle.domain.engine.grid

import kotlin.math.abs

data class GridPos(val col: Int, val row: Int) {

    fun neighbors(): List<GridPos> = listOf(
        copy(row = row - 1),
        copy(row = row + 1),
        copy(col = col - 1),
        copy(col = col + 1)
    ).filter { it.col in 0 until COLS && it.row in 0 until ROWS }

    fun isAdjacentTo(other: GridPos): Boolean =
        (col == other.col && abs(row - other.row) == 1) ||
        (row == other.row && abs(col - other.col) == 1)

    fun manhattanDistanceTo(other: GridPos): Int =
        abs(col - other.col) + abs(row - other.row)

    companion object {
        const val COLS = 3
        const val ROWS = 5
    }
}
