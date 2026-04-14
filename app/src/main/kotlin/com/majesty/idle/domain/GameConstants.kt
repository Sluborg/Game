package com.majesty.idle.domain

object GameConstants {
    const val TICK_MS = 1000L
    const val SAVE_EVERY_N_TICKS = 30L
    const val MAX_OFFLINE_HOURS = 8.0
    const val MAX_HEROES = 10
    const val HERO_FLEE_HP_PERCENT = 0.25f
    const val HERO_HUNT_MIN_HP_PERCENT = 0.50f
    const val MONSTER_SPAWN_BASE_INTERVAL = 45L   // ticks between regular spawns (was 60)
    const val MONSTER_SURGE_INTERVAL = 300L        // extra wave every 5 minutes
    const val BOSS_SPAWN_INTERVAL = 500L           // guaranteed boss every ~8 minutes
    const val STARTING_GOLD = 200L                 // was 100 — faster early ramp
    const val MAX_HERO_LEVEL = 20
    const val HP_PER_LEVEL = 12                    // bonus maxHp per level beyond 1
    const val HP_GAIN_ON_LEVEL_UP = 20             // partial heal on level-up
    const val BATTLE_LOG_MAX_SIZE = 8
}
