package com.majesty.idle.data.db.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.majesty.idle.domain.model.Hero
import com.majesty.idle.domain.model.HeroClass
import com.majesty.idle.domain.model.HeroState

@Entity(tableName = "heroes")
data class HeroEntity(
    @PrimaryKey val id: Long,
    val name: String,
    val heroClass: String,
    val level: Int,
    val experience: Long,
    val gold: Long,
    val hp: Int,
    val maxHp: Int,
    val state: String,
    val targetBuildingId: Long?,
    val targetMonsterId: Long?
) {
    fun toDomain() = Hero(
        id = id,
        name = name,
        heroClass = HeroClass.valueOf(heroClass),
        level = level,
        experience = experience,
        gold = gold,
        hp = hp,
        maxHp = maxHp,
        state = HeroState.valueOf(state),
        targetBuildingId = targetBuildingId,
        targetMonsterId = targetMonsterId
    )

    companion object {
        fun fromDomain(hero: Hero) = HeroEntity(
            id = hero.id,
            name = hero.name,
            heroClass = hero.heroClass.name,
            level = hero.level,
            experience = hero.experience,
            gold = hero.gold,
            hp = hero.hp,
            maxHp = hero.maxHp,
            state = hero.state.name,
            targetBuildingId = hero.targetBuildingId,
            targetMonsterId = hero.targetMonsterId
        )
    }
}
