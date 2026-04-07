package com.majesty.idle.data.db.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.majesty.idle.data.db.entity.HeroEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface HeroDao {
    @Query("SELECT * FROM heroes")
    fun getAllFlow(): Flow<List<HeroEntity>>

    @Query("SELECT * FROM heroes")
    suspend fun getAll(): List<HeroEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(heroes: List<HeroEntity>)

    @Query("DELETE FROM heroes")
    suspend fun deleteAll()
}
