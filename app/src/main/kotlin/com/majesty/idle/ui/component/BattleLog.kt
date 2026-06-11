package com.majesty.idle.ui.component

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.togetherWith
import androidx.compose.animation.ExitTransition
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.majesty.idle.ui.theme.BloodRed
import com.majesty.idle.ui.theme.EmberOrange
import com.majesty.idle.ui.theme.GoldCoin
import com.majesty.idle.ui.theme.RoyalPurpleLight
import com.majesty.idle.ui.theme.StoneDark

@Composable
fun BattleLog(events: List<String>, modifier: Modifier = Modifier) {
    if (events.isEmpty()) return

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 4.dp)
            .background(StoneDark.copy(alpha = 0.85f), RoundedCornerShape(10.dp))
            .padding(horizontal = 12.dp, vertical = 6.dp)
    ) {
        Text(
            text = "📜 Battle Log",
            style = MaterialTheme.typography.labelLarge,
            color = GoldCoin,
            modifier = Modifier.padding(bottom = 2.dp)
        )
        // Newest event slides in; older entries fade with depth
        AnimatedContent(
            targetState = events.first(),
            transitionSpec = {
                (slideInVertically { -it } + fadeIn()) togetherWith ExitTransition.None
            },
            label = "newestEvent"
        ) { newest ->
            Text(
                text = newest,
                style = MaterialTheme.typography.labelSmall,
                color = eventColor(newest, 1f)
            )
        }
        events.drop(1).forEachIndexed { index, event ->
            val alpha = (1f - (index + 1) * 0.1f).coerceAtLeast(0.4f)
            Text(
                text = event,
                style = MaterialTheme.typography.labelSmall,
                color = eventColor(event, alpha)
            )
        }
    }
}

@Composable
private fun eventColor(event: String, alpha: Float): Color = when {
    event.contains("⚠️") || event.contains("👑") -> BloodRed.copy(alpha = alpha)
    event.contains("💥") -> EmberOrange.copy(alpha = alpha)
    event.contains("⬆") || event.contains("Level") -> RoyalPurpleLight.copy(alpha = alpha)
    event.contains("🏆") -> GoldCoin.copy(alpha = alpha)
    event.contains("🗡") -> GoldCoin.copy(alpha = alpha)
    else -> MaterialTheme.colorScheme.onSurface.copy(alpha = alpha)
}
