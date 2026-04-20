package com.majesty.idle.domain.model

data class Milestone(
    val id: String,
    val title: String,
    val description: String,
    val goldReward: Long,
    val isCompleted: Boolean
)

object Milestones {
    private data class MilestoneDef(
        val id: String,
        val title: String,
        val description: String,
        val goldReward: Long,
        val check: (KingdomState) -> Boolean
    )

    private val DEFINITIONS = listOf(
        MilestoneDef("first_blood", "First Blood", "Defeat your first monster", 50L) { state ->
            state.totalMonstersKilled >= 1
        },
        MilestoneDef("second_hero", "A Kingdom Needs Champions", "Recruit your second hero", 200L) { state ->
            state.heroes.size >= 2
        },
        MilestoneDef("hero_level_5", "Seasoned Veteran", "Raise a hero to level 5", 500L) { state ->
            state.heroes.any { it.level >= 5 }
        },
        MilestoneDef("five_buildings", "Growing Kingdom", "Build 5 different structures", 750L) { state ->
            state.buildings.size >= 5
        },
        MilestoneDef("boss_slayer", "Slayer of Kings", "Defeat your first Boss monster", 1500L) { state ->
            state.totalBossKills >= 1
        },
        MilestoneDef("monster_hunter", "Monster Hunter", "Defeat 50 monsters", 1000L) { state ->
            state.totalMonstersKilled >= 50
        },
        MilestoneDef("full_party", "The Fellowship", "Have 5 heroes in your roster", 2000L) { state ->
            state.heroes.size >= 5
        }
    )

    fun evaluate(state: KingdomState): List<Milestone> = DEFINITIONS.map { def ->
        Milestone(
            id = def.id,
            title = def.title,
            description = def.description,
            goldReward = def.goldReward,
            isCompleted = def.check(state)
        )
    }
}
