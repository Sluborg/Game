package com.majesty.idle.ui.component

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.majesty.idle.ui.theme.BloodRed
import com.majesty.idle.ui.theme.GoldCoin
import com.majesty.idle.ui.theme.RoyalPurpleLight
import com.majesty.idle.ui.theme.StoneDark

@Composable
fun BattleLog(events: List<String>, modifier: Modifier = Modifier) {
    if (events.isEmpty()) return

    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(StoneDark.copy(alpha = 0.85f))
            .padding(horizontal = 12.dp, vertical = 6.dp)
    ) {
        Text(
            text = "Battle Log",
            style = MaterialTheme.typography.labelLarge,
            color = GoldCoin,
            modifier = Modifier.padding(bottom = 2.dp)
        )
        events.forEachIndexed { index, event ->
            val alpha = 1f - (index * 0.1f).coerceAtMost(0.6f)
            val color = when {
                event.contains("⚠️") || event.contains("👑") -> BloodRed.copy(alpha = alpha)
                event.contains("⬆") || event.contains("Level") -> RoyalPurpleLight.copy(alpha = alpha)
                event.contains("🏆") -> GoldCoin.copy(alpha = alpha)
                event.contains("🗡") -> GoldCoin.copy(alpha = alpha)
                else -> MaterialTheme.colorScheme.onSurface.copy(alpha = alpha)
            }
            Text(
                text = event,
                style = MaterialTheme.typography.labelSmall,
                color = color
            )
        }
    }
}
