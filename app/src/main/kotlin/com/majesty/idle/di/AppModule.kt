package com.majesty.idle.di

import android.content.Context
import androidx.room.Room
import androidx.work.WorkManager
import com.majesty.idle.data.db.GameDatabase
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext ctx: Context): GameDatabase =
        Room.databaseBuilder(ctx, GameDatabase::class.java, "majesty_game.db")
            .fallbackToDestructiveMigration()
            .build()

    @Provides
    fun provideHeroDao(db: GameDatabase) = db.heroDao()

    @Provides
    fun provideBuildingDao(db: GameDatabase) = db.buildingDao()

    @Provides
    fun provideMonsterGroupDao(db: GameDatabase) = db.monsterGroupDao()

    @Provides
    @Singleton
    fun provideWorkManager(@ApplicationContext ctx: Context): WorkManager =
        WorkManager.getInstance(ctx)
}
