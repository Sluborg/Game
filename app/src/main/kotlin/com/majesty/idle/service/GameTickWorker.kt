package com.majesty.idle.service

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.majesty.idle.data.repository.GameRepository
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject
import java.util.concurrent.TimeUnit

@HiltWorker
class GameTickWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val repository: GameRepository
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val state = repository.loadState()
        repository.applyOfflineProgress(state)
        return Result.success()
    }

    companion object {
        private const val WORK_NAME = "game_tick_worker"

        fun schedule(workManager: WorkManager) {
            val request = PeriodicWorkRequestBuilder<GameTickWorker>(15, TimeUnit.MINUTES)
                .build()
            workManager.enqueueUniquePeriodicWork(
                WORK_NAME,
                ExistingPeriodicWorkPolicy.KEEP,
                request
            )
        }
    }
}
