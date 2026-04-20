package com.majesty.idle.domain.engine.grid

data class GridUnit(
    val id: Long,
    val name: String,
    val emoji: String,
    val isHero: Boolean,
    val hp: Int,
    val maxHp: Int,
    val atk: Int,
    val def: Int,
    val str: Int,
    val prot: Int,
    val mor: Int,
    val pos: GridPos,
    val isFleeing: Boolean = false,
    val isAlive: Boolean = true
) {
    val hpPercent: Float get() = if (maxHp > 0) hp.toFloat() / maxHp.toFloat() else 0f
}
