package com.majesty.idle.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.majesty.idle.data.repository.GameRepository
import com.majesty.idle.domain.GameConstants
import com.majesty.idle.domain.engine.GameEngine
import com.majesty.idle.domain.model.BuildingType
import com.majesty.idle.domain.model.Hero
import com.majesty.idle.domain.model.HeroClass
import com.majesty.idle.domain.model.KingdomState
import com.majesty.idle.domain.model.Milestone
import com.majesty.idle.domain.model.Milestones
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import javax.inject.Inject

@HiltViewModel
class KingdomViewModel @Inject constructor(
    private val repository: GameRepository
) : ViewModel() {

    private val _state = MutableStateFlow(KingdomState.EMPTY)
    val state: StateFlow<KingdomState> = _state.asStateFlow()

    private val _offlineGoldEarned = MutableStateFlow(0L)
    val offlineGoldEarned: StateFlow<Long> = _offlineGoldEarned.asStateFlow()

    private val _completedMilestones = MutableStateFlow<Set<String>>(emptySet())

    val milestones: StateFlow<List<Milestone>> = _state
        .map { Milestones.evaluate(it) }
        .stateIn(viewModelScope, SharingStarted.Lazily, emptyList())

    init {
        viewModelScope.launch {
            val loaded = repository.loadState()
            val withOffline = repository.applyOfflineProgress(loaded)
            _offlineGoldEarned.value = withOffline.gold - loaded.gold
            _state.value = withOffline
            // Seed already-completed milestones so we don't re-fire rewards on load
            _completedMilestones.value = Milestones.evaluate(withOffline)
                .filter { it.isCompleted }
                .map { it.id }
                .toSet()
            startTickLoop()
        }
    }

    private fun startTickLoop() {
        viewModelScope.launch {
            while (true) {
                delay(GameConstants.TICK_MS)
                val result = GameEngine.tick(_state.value)
                _state.value = result.newState

                // Check for newly completed milestones and award gold
                checkMilestones(result.newState)

                if (_state.value.tickCount % GameConstants.SAVE_EVERY_N_TICKS == 0L) {
                    repository.saveState(_state.value)
                }
            }
        }
    }

    private fun checkMilestones(currentState: KingdomState) {
        val currentMilestones = Milestones.evaluate(currentState)
        val previousCompleted = _completedMilestones.value
        val newlyCompleted = currentMilestones.filter {
            it.isCompleted && it.id !in previousCompleted
        }
        if (newlyCompleted.isEmpty()) return

        val newIds = newlyCompleted.map { it.id }.toSet()
        _completedMilestones.update { it + newIds }

        // Award gold rewards and add to battle log
        val goldRewards = newlyCompleted.sumOf { it.goldReward }
        val milestoneEvents = newlyCompleted.map { "🏆 ${it.title} complete! +${it.goldReward}g" }
        val newLog = (milestoneEvents + currentState.battleLog).take(GameConstants.BATTLE_LOG_MAX_SIZE)
        _state.update {
            it.copy(
                gold = it.gold + goldRewards,
                battleLog = newLog
            )
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

    fun recruitHero(heroClass: HeroClass) {
        val current = _state.value
        val cost = Hero.recruitCost(heroClass)
        if (current.gold < cost) return
        if (current.heroes.size >= GameConstants.MAX_HEROES) return

        val requiredBuilding = heroClass.requiredBuilding
        if (requiredBuilding != null && current.buildings.none { it.type == requiredBuilding }) return

        val nextId = (current.heroes.maxOfOrNull { it.id } ?: 1L) + 1
        val existingNames = current.heroes.map { it.name }.toSet()
        val name = Hero.randomNameForClass(heroClass, existingNames)
        val newHero = Hero.create(id = nextId, name = name, heroClass = heroClass)

        val recruitEvent = "🗡 ${name} the ${heroClass.displayName} joins your kingdom!"
        val newLog = (listOf(recruitEvent) + current.battleLog).take(GameConstants.BATTLE_LOG_MAX_SIZE)

        _state.update {
            it.copy(
                gold = it.gold - cost,
                heroes = it.heroes + newHero,
                battleLog = newLog
            )
        }
        viewModelScope.launch { repository.saveState(_state.value) }
    }

    fun dismissOfflineNotice() {
        _offlineGoldEarned.value = 0L
    }

    override fun onCleared() {
        // runBlocking ensures the save completes before the ViewModel scope is cancelled
        runBlocking { repository.saveState(_state.value) }
        super.onCleared()
    }
}
