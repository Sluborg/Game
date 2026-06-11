package com.majesty.idle.ui.component

import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.unit.dp
import com.majesty.idle.domain.model.MonsterGroup
import com.majesty.idle.domain.model.MonsterType
import com.majesty.idle.ui.theme.BloodRed
import com.majesty.idle.ui.theme.BloodRedDeep

@Composable
fun MonsterThreatBanner(monsters: List<MonsterGroup>, modifier: Modifier = Modifier) {
    // Pulsing warning header so an active threat is impossible to miss
    val pulse = rememberInfiniteTransition(label = "threatPulse")
    val warningAlpha by pulse.animateFloat(
        initialValue = 0.6f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(tween(700), RepeatMode.Reverse),
        label = "warningAlpha"
    )

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 4.dp)
            .background(BloodRedDeep.copy(alpha = 0.35f), RoundedCornerShape(10.dp))
            .border(1.dp, BloodRed.copy(alpha = 0.4f), RoundedCornerShape(10.dp))
            .padding(8.dp)
    ) {
        Text(
            text = "⚠️ Monsters Attacking!",
            style = MaterialTheme.typography.titleLarge,
            color = BloodRed,
            modifier = Modifier.alpha(warningAlpha)
        )
        monsters.filter { it.isAlive }.forEach { monster ->
            MonsterRow(monster)
        }
    }
}

@Composable
private fun MonsterRow(monster: MonsterGroup) {
    val animatedHp by animateFloatAsState(
        targetValue = monster.hpPercent,
        animationSpec = tween(durationMillis = 500),
        label = "monsterHp"
    )
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = "${monster.type.emoji} ${monster.type.displayName} x${monster.count}",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurface
        )
        LinearProgressIndicator(
            progress = { animatedHp },
            modifier = Modifier
                .weight(1f)
                .height(6.dp)
                .padding(horizontal = 8.dp),
            color = BloodRed
        )
    }
}

private val MonsterType.emoji: String
    get() = when (this) {
        MonsterType.RAT -> "🐀"
        MonsterType.GOBLIN -> "👺"
        MonsterType.TROLL -> "👹"
        MonsterType.DRAGON -> "🐉"
        MonsterType.UNDEAD -> "💀"
        MonsterType.BOSS_RAT -> "🐀👑"
        MonsterType.BOSS_GOBLIN -> "👺👑"
        MonsterType.BOSS_TROLL -> "👹👑"
        MonsterType.BOSS_DRAGON -> "🐉👑"
    }
