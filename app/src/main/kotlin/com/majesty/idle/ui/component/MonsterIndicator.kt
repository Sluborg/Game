package com.majesty.idle.ui.component

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.majesty.idle.domain.model.MonsterGroup
import com.majesty.idle.ui.theme.BloodRed
import com.majesty.idle.ui.theme.StoneDark

@Composable
fun MonsterThreatBanner(monsters: List<MonsterGroup>, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .background(BloodRed.copy(alpha = 0.2f))
            .padding(8.dp)
    ) {
        Text(
            text = "⚠️ Monsters Attacking!",
            style = MaterialTheme.typography.titleLarge,
            color = BloodRed
        )
        monsters.filter { it.isAlive }.forEach { monster ->
            MonsterRow(monster)
        }
    }
}

@Composable
private fun MonsterRow(monster: MonsterGroup) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = "${monster.type.displayName} x${monster.count}",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurface
        )
        LinearProgressIndicator(
            progress = { monster.hpPercent },
            modifier = Modifier
                .weight(1f)
                .height(6.dp)
                .padding(horizontal = 8.dp),
            color = BloodRed
        )
    }
}
