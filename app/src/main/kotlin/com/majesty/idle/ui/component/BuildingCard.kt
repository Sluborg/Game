package com.majesty.idle.ui.component

import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.majesty.idle.domain.model.Building
import com.majesty.idle.ui.theme.GoldCoin
import com.majesty.idle.ui.theme.RoyalPurple
import com.majesty.idle.ui.theme.StoneLight

@Composable
fun BuildingCard(
    building: Building,
    playerGold: Long,
    onUpgrade: () -> Unit,
    modifier: Modifier = Modifier
) {
    val canAffordUpgrade = playerGold >= building.upgradeCost

    Card(
        modifier = modifier
            .fillMaxWidth()
            .border(1.dp, RoyalPurple, RoundedCornerShape(8.dp)),
        colors = CardDefaults.cardColors(containerColor = StoneLight),
        shape = RoundedCornerShape(8.dp)
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(
                text = "${building.type.displayName} (Lv ${building.level})",
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.onSurface
            )
            if (building.goldPerSecond > 0) {
                Text(
                    text = "+${String.format("%.1f", building.goldPerSecond)} gold/s",
                    style = MaterialTheme.typography.bodySmall,
                    color = GoldCoin
                )
            }
            if (building.canUpgrade) {
                Spacer(Modifier.height(8.dp))
                Text(
                    text = "Upgrade: ${building.upgradeCost}g",
                    style = MaterialTheme.typography.bodySmall,
                    color = if (canAffordUpgrade) GoldCoin else MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = if (canAffordUpgrade) Modifier.clickable(onClick = onUpgrade) else Modifier
                )
            } else if (building.level >= building.type.maxLevel) {
                Spacer(Modifier.height(4.dp))
                Text(
                    text = "MAX LEVEL",
                    style = MaterialTheme.typography.labelSmall,
                    color = GoldCoin
                )
            }
        }
    }
}
