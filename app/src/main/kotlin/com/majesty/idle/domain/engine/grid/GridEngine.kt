package com.majesty.idle.domain.engine.grid

import kotlin.random.Random

object GridEngine {

    fun tick(state: GridBattleState, random: Random = Random): GridBattleState {
        if (state.isResolved) return state

        val events = mutableListOf<String>()

        // Phase 1: All living units declare actions
        val actions: Map<Long, GridAction> = state.units
            .filter { it.isAlive && !it.isFleeing }
            .associate { it.id to GridAI.decide(it, state, random) }

        // Phase 2: Resolve bump contests — two units moving to the same cell
        val (resolvedMoves, bumpDamage) = resolveBumps(state, actions, events, random)

        // Phase 3: Apply movement + bump damage
        var units = applyMovement(state.units, resolvedMoves, bumpDamage)

        // Phase 4-5: Flanking detection + simultaneous attack resolution
        val (unitsAfterAttacks, attackEvents) = resolveAttacks(units, actions, random)
        units = unitsAfterAttacks
        events.addAll(attackEvents)

        // Phase 6: Apply flee actions (mark as removed)
        units = applyFlee(units, actions)

        // Phase 7: Check resolution
        val heroesAlive = units.any { it.isHero && it.isAlive }
        val monstersAlive = units.any { !it.isHero && it.isAlive }
        val isResolved = !heroesAlive || !monstersAlive

        val newLog = (events + state.log).take(20)
        return state.copy(
            units = units,
            tick = state.tick + 1,
            log = newLog,
            isResolved = isResolved,
            heroesWon = isResolved && heroesAlive && !monstersAlive
        )
    }

    private fun resolveBumps(
        state: GridBattleState,
        actions: Map<Long, GridAction>,
        events: MutableList<String>,
        random: Random
    ): Pair<Map<Long, GridPos>, Map<Long, Int>> {
        val moveIntents = mutableMapOf<GridPos, MutableList<Long>>()
        actions.forEach { (id, action) ->
            if (action is GridAction.Move) {
                moveIntents.getOrPut(action.toPos) { mutableListOf() }.add(id)
            }
        }

        val resolvedMoves = mutableMapOf<Long, GridPos>()
        val bumpDamage = mutableMapOf<Long, Int>()

        for ((targetPos, contenders) in moveIntents) {
            if (contenders.size == 1) {
                resolvedMoves[contenders[0]] = targetPos
            } else {
                val idA = contenders[0]
                val idB = contenders[1]
                val unitA = state.units.find { it.id == idA } ?: continue
                val unitB = state.units.find { it.id == idB } ?: continue
                val rollA = unitA.str + random.nextInt(6) + 1
                val rollB = unitB.str + random.nextInt(6) + 1
                when {
                    rollA > rollB -> {
                        resolvedMoves[idA] = targetPos
                        bumpDamage[idB] = (bumpDamage[idB] ?: 0) + random.nextInt(6) + 1
                        events.add("${unitA.name} shoves ${unitB.name}!")
                    }
                    rollB > rollA -> {
                        resolvedMoves[idB] = targetPos
                        bumpDamage[idA] = (bumpDamage[idA] ?: 0) + random.nextInt(6) + 1
                        events.add("${unitB.name} shoves ${unitA.name}!")
                    }
                    else -> {
                        val dmg = random.nextInt(4) + 1
                        bumpDamage[idA] = (bumpDamage[idA] ?: 0) + dmg
                        bumpDamage[idB] = (bumpDamage[idB] ?: 0) + dmg
                        events.add("${unitA.name} and ${unitB.name} collide!")
                    }
                }
            }
        }
        return resolvedMoves to bumpDamage
    }

    private fun applyMovement(
        units: List<GridUnit>,
        resolvedMoves: Map<Long, GridPos>,
        bumpDamage: Map<Long, Int>
    ): List<GridUnit> = units.map { unit ->
        var updated = unit
        val newPos = resolvedMoves[unit.id]
        if (newPos != null) updated = updated.copy(pos = newPos)
        val dmg = bumpDamage[unit.id] ?: 0
        if (dmg > 0) {
            val newHp = (updated.hp - dmg).coerceAtLeast(0)
            updated = updated.copy(hp = newHp, isAlive = newHp > 0)
        }
        updated
    }

    private fun resolveAttacks(
        units: List<GridUnit>,
        actions: Map<Long, GridAction>,
        random: Random
    ): Pair<List<GridUnit>, List<String>> {
        // Count incoming attackers per target cell for flanking bonus
        val attackerCountPerTarget = mutableMapOf<GridPos, Int>()
        actions.values.filterIsInstance<GridAction.Attack>().forEach { attack ->
            attackerCountPerTarget[attack.targetPos] =
                (attackerCountPerTarget[attack.targetPos] ?: 0) + 1
        }

        // Buffer all damage for simultaneous application
        val pendingDamage = mutableMapOf<Long, Int>()
        val events = mutableListOf<String>()

        actions.forEach { (attackerId, action) ->
            if (action !is GridAction.Attack) return@forEach
            val attacker = units.find { it.id == attackerId && it.isAlive } ?: return@forEach
            val target = units.find { it.pos == action.targetPos && it.isAlive } ?: return@forEach

            val flankBonus = if ((attackerCountPerTarget[action.targetPos] ?: 0) >= 2) 2 else 0
            val atkRoll = attacker.atk + flankBonus + random.nextInt(6) + 1
            val defRoll = target.def + random.nextInt(6) + 1

            if (atkRoll >= defRoll) {
                val damage = (attacker.str - target.prot).coerceAtLeast(1) + random.nextInt(4) + 1
                pendingDamage[target.id] = (pendingDamage[target.id] ?: 0) + damage
                val flankSuffix = if (flankBonus > 0) " [flanked]" else ""
                events.add("${attacker.name} hits ${target.name} for $damage$flankSuffix")
            }
        }

        val updatedUnits = units.map { unit ->
            val dmg = pendingDamage[unit.id] ?: return@map unit
            val newHp = (unit.hp - dmg).coerceAtLeast(0)
            if (newHp == 0 && unit.isAlive) events.add("${unit.name} is slain!")
            unit.copy(hp = newHp, isAlive = newHp > 0)
        }
        return updatedUnits to events
    }

    private fun applyFlee(units: List<GridUnit>, actions: Map<Long, GridAction>): List<GridUnit> {
        val fleeingIds = actions.filter { it.value is GridAction.Flee }.keys.toSet()
        return units.map { unit ->
            if (unit.id in fleeingIds && unit.isAlive)
                unit.copy(isAlive = false, isFleeing = true)
            else unit
        }
    }
}
