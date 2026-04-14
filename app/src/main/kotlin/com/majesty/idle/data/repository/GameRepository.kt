package com.majesty.idle.data.repository

import com.majesty.idle.data.datastore.GlobalState
import com.majesty.idle.data.datastore.GlobalStateDataStore
import com.majesty.idle.data.db.dao.BuildingDao
import com.majesty.idle.data.db.dao.HeroDao
import com.majesty.idle.data.db.dao.MonsterGroupDao
import com.majesty.idle.data.db.entity.BuildingEntity
import com.majesty.idle.data.db.entity.HeroEntity
import com.majesty.idle.data.db.entity.MonsterGroupEntity
import com.majesty.idle.domain.engine.OfflineProgressCalculator
import com.majesty.idle.domain.model.KingdomState
import kotlinx.coroutines.flow.first
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class GameRepository @Inject constructor(
    private val heroDao: HeroDao,
    private val buildingDao: BuildingDao,
    private val monsterGroupDao: MonsterGroupDao,
    private val dataStore: GlobalStateDataStore
) {
    suspend fun loadState(): KingdomState {
        val global = dataStore.globalState.first()
        val heroes = heroDao.getAll().map { it.toDomain() }
        val buildings = buildingDao.getAll().map { it.toDomain() }
        val monsters = monsterGroupDao.getAll().map { it.toDomain() }

        if (buildings.isEmpty()) {
            // First launch: seed initial state
            val seed = KingdomState.seed()
            saveState(seed)
            return seed
        }

        return KingdomState(
            gold = global.gold,
            goldAccumulator = global.goldAccumulator,
            heroes = heroes,
            buildings = buildings,
            monsterGroups = monsters,
            tickCount = global.tickCount,
            lastSavedAt = global.lastTickTimestamp,
            nextMonsterId = global.nextMonsterId,
            totalMonstersKilled = global.totalMonstersKilled,
            totalGoldEarned = global.totalGoldEarned,
            totalBossKills = global.totalBossKills
        )
    }

    suspend fun saveState(state: KingdomState) {
        dataStore.save(
            GlobalState(
                gold = state.gold,
                goldAccumulator = state.goldAccumulator,
                lastTickTimestamp = System.currentTimeMillis(),
                kingdomLevel = 1,
                tickCount = state.tickCount,
                nextMonsterId = state.nextMonsterId,
                totalMonstersKilled = state.totalMonstersKilled,
                totalGoldEarned = state.totalGoldEarned,
                totalBossKills = state.totalBossKills
            )
        )
        heroDao.upsertAll(state.heroes.map { HeroEntity.fromDomain(it) })
        buildingDao.upsertAll(state.buildings.map { BuildingEntity.fromDomain(it) })
        monsterGroupDao.upsertAll(state.monsterGroups.map { MonsterGroupEntity.fromDomain(it) })
    }

    suspend fun applyOfflineProgress(state: KingdomState): KingdomState {
        val gains = OfflineProgressCalculator.calculate(state, System.currentTimeMillis())
        if (gains.goldEarned <= 0L) return state
        val updated = state.copy(gold = state.gold + gains.goldEarned)
        saveState(updated)
        return updated
    }
}
