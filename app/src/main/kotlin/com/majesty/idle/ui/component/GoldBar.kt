package com.majesty.idle.ui.component

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.majesty.idle.ui.theme.GoldCoin
import com.majesty.idle.ui.theme.StoneDark

@Composable
fun GoldBar(gold: Long, goldPerSecond: Double, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(StoneDark)
            .padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = "Gold: ${formatGold(gold)}",
            style = MaterialTheme.typography.titleLarge,
            color = GoldCoin
        )
        Text(
            text = "+${String.format("%.1f", goldPerSecond)}/s",
            style = MaterialTheme.typography.bodySmall,
            color = GoldCoin.copy(alpha = 0.8f)
        )
    }
}

private fun formatGold(gold: Long): String = when {
    gold >= 1_000_000 -> "${gold / 1_000_000}M"
    gold >= 1_000 -> "${gold / 1_000}K"
    else -> gold.toString()
}
