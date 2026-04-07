package com.majesty.idle.data.db

import androidx.room.Database
import androidx.room.RoomDatabase
import com.majesty.idle.data.db.dao.BuildingDao
import com.majesty.idle.data.db.dao.HeroDao
import com.majesty.idle.data.db.dao.MonsterGroupDao
import com.majesty.idle.data.db.entity.BuildingEntity
import com.majesty.idle.data.db.entity.HeroEntity
import com.majesty.idle.data.db.entity.MonsterGroupEntity

@Database(
    entities = [HeroEntity::class, BuildingEntity::class, MonsterGroupEntity::class],
    version = 1,
    exportSchema = false
)
abstract class GameDatabase : RoomDatabase() {
    abstract fun heroDao(): HeroDao
    abstract fun buildingDao(): BuildingDao
    abstract fun monsterGroupDao(): MonsterGroupDao
}
