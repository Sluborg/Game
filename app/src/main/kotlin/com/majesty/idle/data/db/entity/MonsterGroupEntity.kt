package com.majesty.idle.data.db.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.majesty.idle.domain.model.MonsterGroup
import com.majesty.idle.domain.model.MonsterType

@Entity(tableName = "monster_groups")
data class MonsterGroupEntity(
    @PrimaryKey val id: Long,
    val type: String,
    val count: Int,
    val hp: Int,
    val maxHp: Int
) {
    fun toDomain() = MonsterGroup(
        id = id,
        type = MonsterType.valueOf(type),
        count = count,
        hp = hp,
        maxHp = maxHp
    )

    companion object {
        fun fromDomain(mg: MonsterGroup) = MonsterGroupEntity(
            id = mg.id,
            type = mg.type.name,
            count = mg.count,
            hp = mg.hp,
            maxHp = mg.maxHp
        )
    }
}
