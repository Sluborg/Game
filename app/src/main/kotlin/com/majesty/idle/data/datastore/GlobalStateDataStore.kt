package com.majesty.idle.data.datastore

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.doublePreferencesKey
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "global_state")

data class GlobalState(
    val gold: Long,
    val goldAccumulator: Double,
    val lastTickTimestamp: Long,
    val kingdomLevel: Int,
    val tickCount: Long,
    val nextMonsterId: Long,
    val totalMonstersKilled: Long,
    val totalGoldEarned: Long,
    val totalBossKills: Int
)

@Singleton
class GlobalStateDataStore @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private object Keys {
        val GOLD = longPreferencesKey("gold")
        val GOLD_ACCUMULATOR = doublePreferencesKey("gold_accumulator")
        val LAST_TICK_TIMESTAMP = longPreferencesKey("last_tick_timestamp")
        val KINGDOM_LEVEL = intPreferencesKey("kingdom_level")
        val TICK_COUNT = longPreferencesKey("tick_count")
        val NEXT_MONSTER_ID = longPreferencesKey("next_monster_id")
        val TOTAL_MONSTERS_KILLED = longPreferencesKey("total_monsters_killed")
        val TOTAL_GOLD_EARNED = longPreferencesKey("total_gold_earned")
        val TOTAL_BOSS_KILLS = intPreferencesKey("total_boss_kills")
    }

    val globalState: Flow<GlobalState> = context.dataStore.data.map { prefs ->
        GlobalState(
            gold = prefs[Keys.GOLD] ?: 200L,
            goldAccumulator = prefs[Keys.GOLD_ACCUMULATOR] ?: 0.0,
            lastTickTimestamp = prefs[Keys.LAST_TICK_TIMESTAMP] ?: System.currentTimeMillis(),
            kingdomLevel = prefs[Keys.KINGDOM_LEVEL] ?: 1,
            tickCount = prefs[Keys.TICK_COUNT] ?: 0L,
            nextMonsterId = prefs[Keys.NEXT_MONSTER_ID] ?: 1000L,
            totalMonstersKilled = prefs[Keys.TOTAL_MONSTERS_KILLED] ?: 0L,
            totalGoldEarned = prefs[Keys.TOTAL_GOLD_EARNED] ?: 0L,
            totalBossKills = prefs[Keys.TOTAL_BOSS_KILLS] ?: 0
        )
    }

    suspend fun save(state: GlobalState) {
        context.dataStore.edit { prefs ->
            prefs[Keys.GOLD] = state.gold
            prefs[Keys.GOLD_ACCUMULATOR] = state.goldAccumulator
            prefs[Keys.LAST_TICK_TIMESTAMP] = state.lastTickTimestamp
            prefs[Keys.KINGDOM_LEVEL] = state.kingdomLevel
            prefs[Keys.TICK_COUNT] = state.tickCount
            prefs[Keys.NEXT_MONSTER_ID] = state.nextMonsterId
            prefs[Keys.TOTAL_MONSTERS_KILLED] = state.totalMonstersKilled
            prefs[Keys.TOTAL_GOLD_EARNED] = state.totalGoldEarned
            prefs[Keys.TOTAL_BOSS_KILLS] = state.totalBossKills
        }
    }
}
