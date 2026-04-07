package com.majesty.idle.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.majesty.idle.data.repository.GameRepository
import com.majesty.idle.domain.GameConstants
import com.majesty.idle.domain.engine.GameEngine
import com.majesty.idle.domain.model.BuildingType
import com.majesty.idle.domain.model.KingdomState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class KingdomViewModel @Inject constructor(
    private val repository: GameRepository
) : ViewModel() {

    private val _state = MutableStateFlow(KingdomState.EMPTY)
    val state: StateFlow<KingdomState> = _state.asStateFlow()

    private val _offlineGoldEarned = MutableStateFlow(0L)
    val offlineGoldEarned: StateFlow<Long> = _offlineGoldEarned.asStateFlow()

    init {
        viewModelScope.launch {
            val loaded = repository.loadState()
            val withOffline = repository.applyOfflineProgress(loaded)
            _offlineGoldEarned.value = withOffline.gold - loaded.gold
            _state.value = withOffline
            startTickLoop()
        }
    }

    private fun startTickLoop() {
        viewModelScope.launch {
            while (true) {
                delay(GameConstants.TICK_MS)
                _state.update { current -> GameEngine.tick(current) }
                if (_state.value.tickCount % GameConstants.SAVE_EVERY_N_TICKS == 0L) {
                    repository.saveState(_state.value)
                }
            }
        }
    }

    fun buildBuilding(type: BuildingType) {
        val cost = type.baseCost
        val current = _state.value
        if (current.gold < cost) return
        val exists = current.buildings.any { it.type == type }
        if (exists) return

        val newId = (current.buildings.maxOfOrNull { it.id } ?: 0L) + 1
        val newBuilding = com.majesty.idle.domain.model.Building(id = newId, type = type)
        _state.update { it.copy(gold = it.gold - cost, buildings = it.buildings + newBuilding) }
        viewModelScope.launch { repository.saveState(_state.value) }
    }

    fun upgradeBuilding(buildingId: Long) {
        val current = _state.value
        val building = current.buildings.firstOrNull { it.id == buildingId } ?: return
        if (!building.canUpgrade) return
        val cost = building.upgradeCost
        if (current.gold < cost) return

        val upgraded = building.copy(level = building.level + 1)
        val newBuildings = current.buildings.map { if (it.id == buildingId) upgraded else it }
        _state.update { it.copy(gold = it.gold - cost, buildings = newBuildings) }
        viewModelScope.launch { repository.saveState(_state.value) }
    }

    fun dismissOfflineNotice() {
        _offlineGoldEarned.value = 0L
    }

    override fun onCleared() {
        viewModelScope.launch { repository.saveState(_state.value) }
        super.onCleared()
    }
}
