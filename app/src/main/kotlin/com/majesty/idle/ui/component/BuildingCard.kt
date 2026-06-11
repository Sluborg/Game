package com.majesty.idle.ui.component

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.majesty.idle.domain.GameConstants
import com.majesty.idle.domain.model.Building
import com.majesty.idle.domain.model.BuildingType
import com.majesty.idle.domain.model.Hero
import com.majesty.idle.domain.model.HeroClass
import com.majesty.idle.ui.theme.BloodRed
import com.majesty.idle.ui.theme.GoldCoin
import com.majesty.idle.ui.theme.GoldDark
import com.majesty.idle.ui.theme.RoyalPurple
import com.majesty.idle.ui.theme.RoyalPurpleDeep
import com.majesty.idle.ui.theme.StoneDark
import com.majesty.idle.ui.theme.StoneLight

@Composable
fun BuildingCard(
    building: Building,
    playerGold: Long,
    heroCount: Int = 0,
    onUpgrade: () -> Unit,
    onRecruit: ((HeroClass) -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    val canAffordUpgrade = playerGold >= building.upgradeCost

    Card(
        modifier = modifier
            .fillMaxWidth()
            .border(1.dp, RoyalPurple.copy(alpha = 0.6f), RoundedCornerShape(12.dp)),
        colors = CardDefaults.cardColors(containerColor = Color.Transparent),
        elevation = CardDefaults.cardElevation(defaultElevation = 4.dp),
        shape = RoundedCornerShape(12.dp)
    ) {
        Row(
            modifier = Modifier
                .background(Brush.horizontalGradient(listOf(StoneLight, StoneDark)))
                .padding(12.dp),
            verticalAlignment = Alignment.Top
        ) {
            // Building icon medallion
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .background(
                        Brush.verticalGradient(listOf(RoyalPurple, RoyalPurpleDeep)),
                        CircleShape
                    )
                    .border(1.dp, GoldDark.copy(alpha = 0.7f), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Text(text = building.type.emoji, fontSize = 24.sp)
            }

            Spacer(Modifier.width(12.dp))

            Column(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = building.type.displayName,
                        style = MaterialTheme.typography.titleLarge,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    LevelPips(level = building.level, maxLevel = building.type.maxLevel)
                }
                if (building.goldPerSecond > 0) {
                    Text(
                        text = "+${String.format("%.1f", building.goldPerSecond)} gold/s",
                        style = MaterialTheme.typography.bodySmall,
                        color = GoldCoin
                    )
                }
                if (building.type.effectDescription.isNotEmpty()) {
                    Text(
                        text = building.type.effectDescription,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
                if (building.canUpgrade) {
                    Spacer(Modifier.height(8.dp))
                    Button(
                        onClick = onUpgrade,
                        enabled = canAffordUpgrade,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = GoldDark,
                            contentColor = Color.Black,
                            disabledContainerColor = StoneDark,
                            disabledContentColor = MaterialTheme.colorScheme.onSurfaceVariant
                        ),
                        contentPadding = ButtonDefaults.TextButtonContentPadding,
                        modifier = Modifier.height(34.dp)
                    ) {
                        Text(
                            text = "⬆ Upgrade — ${building.upgradeCost}g",
                            style = MaterialTheme.typography.labelSmall
                        )
                    }
                } else if (building.level >= building.type.maxLevel) {
                    Spacer(Modifier.height(4.dp))
                    Text(
                        text = "★ MAX LEVEL",
                        style = MaterialTheme.typography.labelSmall,
                        color = GoldCoin
                    )
                }
                // Recruit buttons for guild buildings
                if (onRecruit != null && building.isGuild && building.recruitableClasses.isNotEmpty()) {
                    Spacer(Modifier.height(8.dp))
                    val atMax = heroCount >= GameConstants.MAX_HEROES
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        building.recruitableClasses.forEach { heroClass ->
                            val cost = Hero.recruitCost(heroClass)
                            val canAfford = playerGold >= cost && !atMax
                            Button(
                                onClick = { onRecruit(heroClass) },
                                enabled = canAfford,
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = RoyalPurple,
                                    contentColor = MaterialTheme.colorScheme.onPrimary,
                                    disabledContainerColor = StoneDark,
                                    disabledContentColor = if (atMax) {
                                        MaterialTheme.colorScheme.onSurfaceVariant
                                    } else {
                                        BloodRed.copy(alpha = 0.7f)
                                    }
                                ),
                                contentPadding = ButtonDefaults.TextButtonContentPadding,
                                modifier = Modifier.height(34.dp)
                            ) {
                                Text(
                                    text = if (atMax) {
                                        "Party full"
                                    } else {
                                        "${heroClass.displayName} ${cost}g"
                                    },
                                    style = MaterialTheme.typography.labelSmall
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun LevelPips(level: Int, maxLevel: Int, modifier: Modifier = Modifier) {
    Row(modifier = modifier, horizontalArrangement = Arrangement.spacedBy(3.dp)) {
        repeat(maxLevel) { i ->
            Box(
                modifier = Modifier
                    .size(7.dp)
                    .background(
                        if (i < level) GoldCoin else StoneDark,
                        CircleShape
                    )
                    .border(0.5.dp, GoldDark.copy(alpha = 0.5f), CircleShape)
            )
        }
    }
}

private val BuildingType.emoji: String
    get() = when (this) {
        BuildingType.PALACE -> "🏰"
        BuildingType.TAVERN -> "🍺"
        BuildingType.BLACKSMITH -> "⚒️"
        BuildingType.MARKET -> "🏪"
        BuildingType.FIGHTER_GUILD -> "⚔️"
        BuildingType.RANGER_GUILD -> "🏹"
        BuildingType.MAGE_GUILD -> "🔮"
        BuildingType.TEMPLE -> "⛪"
        BuildingType.GUARD_TOWER -> "🗼"
        BuildingType.BARRACKS -> "🛡️"
    }
