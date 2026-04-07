package com.majesty.idle.data.db.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.majesty.idle.data.db.entity.BuildingEntity

@Dao
interface BuildingDao {
    @Query("SELECT * FROM buildings")
    suspend fun getAll(): List<BuildingEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(buildings: List<BuildingEntity>)

    @Query("DELETE FROM buildings")
    suspend fun deleteAll()
}
