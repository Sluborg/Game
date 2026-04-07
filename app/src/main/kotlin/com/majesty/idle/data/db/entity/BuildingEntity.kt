package com.majesty.idle.data.db.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.majesty.idle.domain.model.Building
import com.majesty.idle.domain.model.BuildingType

@Entity(tableName = "buildings")
data class BuildingEntity(
    @PrimaryKey val id: Long,
    val type: String,
    val level: Int,
    val isConstructing: Boolean,
    val constructionProgress: Float
) {
    fun toDomain() = Building(
        id = id,
        type = BuildingType.valueOf(type),
        level = level,
        isConstructing = isConstructing,
        constructionProgress = constructionProgress
    )

    companion object {
        fun fromDomain(building: Building) = BuildingEntity(
            id = building.id,
            type = building.type.name,
            level = building.level,
            isConstructing = building.isConstructing,
            constructionProgress = building.constructionProgress
        )
    }
}
