package com.majesty.idle.data.db.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.majesty.idle.data.db.entity.MonsterGroupEntity

@Dao
interface MonsterGroupDao {
    @Query("SELECT * FROM monster_groups")
    suspend fun getAll(): List<MonsterGroupEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(groups: List<MonsterGroupEntity>)

    @Query("DELETE FROM monster_groups")
    suspend fun deleteAll()
}
