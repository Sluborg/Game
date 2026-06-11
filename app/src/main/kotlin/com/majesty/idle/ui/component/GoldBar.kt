package com.majesty.idle.ui.component

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.unit.dp
import com.majesty.idle.ui.theme.GoldCoin
import com.majesty.idle.ui.theme.GoldLight
import com.majesty.idle.ui.theme.RoyalPurpleDeep
import com.majesty.idle.ui.theme.StoneDark

@Composable
fun GoldBar(gold: Long, goldPerSecond: Double, modifier: Modifier = Modifier) {
    // Smoothly count toward the real value instead of jumping each tick
    val animatedGold by animateFloatAsState(
        targetValue = gold.toFloat(),
        animationSpec = tween(durationMillis = 600),
        label = "gold"
    )

    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(
                Brush.horizontalGradient(listOf(RoyalPurpleDeep, StoneDark))
            )
            .padding(horizontal = 16.dp, vertical = 10.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = "💰 ${formatGold(animatedGold.toLong())}",
            style = MaterialTheme.typography.titleLarge,
            color = GoldLight
        )
        Text(
            text = "+${String.format("%.1f", goldPerSecond)}/s",
            style = MaterialTheme.typography.bodySmall,
            color = GoldCoin.copy(alpha = 0.9f),
            modifier = Modifier
                .background(StoneDark.copy(alpha = 0.6f), RoundedCornerShape(10.dp))
                .padding(horizontal = 8.dp, vertical = 3.dp)
        )
    }
}

private fun formatGold(gold: Long): String = when {
    gold >= 1_000_000 -> "${gold / 1_000_000}M"
    gold >= 1_000 -> "${gold / 1_000}K"
    else -> gold.toString()
}
