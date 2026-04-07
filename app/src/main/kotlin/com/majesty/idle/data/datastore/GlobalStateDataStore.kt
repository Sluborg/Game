package com.majesty.idle.data.datastore

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
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
    val lastTickTimestamp: Long,
    val kingdomLevel: Int,
    val tickCount: Long
)

@Singleton
class GlobalStateDataStore @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private object Keys {
        val GOLD = longPreferencesKey("gold")
        val LAST_TICK_TIMESTAMP = longPreferencesKey("last_tick_timestamp")
        val KINGDOM_LEVEL = intPreferencesKey("kingdom_level")
        val TICK_COUNT = longPreferencesKey("tick_count")
    }

    val globalState: Flow<GlobalState> = context.dataStore.data.map { prefs ->
        GlobalState(
            gold = prefs[Keys.GOLD] ?: 100L,
            lastTickTimestamp = prefs[Keys.LAST_TICK_TIMESTAMP] ?: System.currentTimeMillis(),
            kingdomLevel = prefs[Keys.KINGDOM_LEVEL] ?: 1,
            tickCount = prefs[Keys.TICK_COUNT] ?: 0L
        )
    }

    suspend fun save(state: GlobalState) {
        context.dataStore.edit { prefs ->
            prefs[Keys.GOLD] = state.gold
            prefs[Keys.LAST_TICK_TIMESTAMP] = state.lastTickTimestamp
            prefs[Keys.KINGDOM_LEVEL] = state.kingdomLevel
            prefs[Keys.TICK_COUNT] = state.tickCount
        }
    }
}
