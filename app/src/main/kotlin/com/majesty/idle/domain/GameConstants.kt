package com.majesty.idle.domain

object GameConstants {
    const val TICK_MS = 1000L
    const val SAVE_EVERY_N_TICKS = 30L
    const val MAX_OFFLINE_HOURS = 8.0
    const val MAX_HEROES = 10
    const val HERO_FLEE_HP_PERCENT = 0.25f
    const val HERO_HUNT_MIN_HP_PERCENT = 0.50f
    const val MONSTER_SPAWN_BASE_INTERVAL = 60L  // ticks between spawns
    const val STARTING_GOLD = 100L
}
