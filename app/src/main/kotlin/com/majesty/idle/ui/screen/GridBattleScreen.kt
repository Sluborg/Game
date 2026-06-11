package com.majesty.idle.ui.screen

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.majesty.idle.domain.engine.grid.GridBattleState
import com.majesty.idle.domain.engine.grid.GridPos
import com.majesty.idle.domain.engine.grid.GridUnit
import com.majesty.idle.ui.theme.BloodRed
import com.majesty.idle.ui.theme.ForestGreen
import com.majesty.idle.ui.theme.GoldCoin
import com.majesty.idle.ui.theme.GoldDark
import com.majesty.idle.ui.theme.NightBlueDeep
import com.majesty.idle.ui.theme.ParchmentBeige
import com.majesty.idle.ui.theme.ParchmentDark
import com.majesty.idle.ui.theme.StoneDark

@Composable
fun GridBattleScreen(
    state: GridBattleState,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier
) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(NightBlueDeep.copy(alpha = 0.93f))
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Header row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "⚔ Boss Battle",
                    style = MaterialTheme.typography.titleLarge,
                    color = GoldCoin
                )
                TextButton(onClick = onDismiss) {
                    Text("Watch Later", color = ParchmentDark)
                }
            }

            Spacer(Modifier.height(12.dp))

            // Grid and event log side by side
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                BattleGrid(
                    state = state,
                    modifier = Modifier.weight(1f).fillMaxHeight()
                )
                BattleEventLog(
                    events = state.log.take(8),
                    modifier = Modifier.width(130.dp).fillMaxHeight()
                )
            }

            Spacer(Modifier.height(12.dp))

            // Status line — pops in with a bounce when the battle resolves
            val statusText = when {
                state.isResolved && state.heroesWon -> "🏆 Victory!"
                state.isResolved -> "💀 Heroes defeated..."
                else -> "Round ${state.tick}  |  ${state.heroUnits.size} heroes  vs  ${state.monsterUnits.size} foes"
            }
            val statusColor = if (state.isResolved && state.heroesWon) GoldCoin else ParchmentDark
            val statusScale by animateFloatAsState(
                targetValue = if (state.isResolved) 1.4f else 1f,
                animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy),
                label = "statusScale"
            )
            Text(
                text = statusText,
                style = MaterialTheme.typography.bodyMedium,
                color = statusColor,
                modifier = Modifier.scale(statusScale)
            )
        }
    }
}

@Composable
private fun BattleGrid(state: GridBattleState, modifier: Modifier = Modifier) {
    BoxWithConstraints(modifier = modifier) {
        val gap = 4.dp
        val cellW = (maxWidth - gap * (GridPos.COLS - 1)) / GridPos.COLS
        val cellH = (maxHeight - gap * (GridPos.ROWS - 1)) / GridPos.ROWS

        // Static board cells
        for (row in 0 until GridPos.ROWS) {
            for (col in 0 until GridPos.COLS) {
                Box(
                    modifier = Modifier
                        .offset(x = (cellW + gap) * col, y = (cellH + gap) * row)
                        .size(cellW, cellH)
                        .border(1.dp, StoneDark, RoundedCornerShape(6.dp))
                        .background(StoneDark.copy(alpha = 0.5f), RoundedCornerShape(6.dp))
                )
            }
        }

        // Units slide between cells instead of teleporting
        state.units.filter { it.isAlive }.forEach { unit ->
            key(unit.id) {
                val x by animateDpAsState(
                    targetValue = (cellW + gap) * unit.pos.col,
                    animationSpec = tween(durationMillis = 450),
                    label = "unitX"
                )
                val y by animateDpAsState(
                    targetValue = (cellH + gap) * unit.pos.row,
                    animationSpec = tween(durationMillis = 450),
                    label = "unitY"
                )
                UnitToken(
                    unit = unit,
                    modifier = Modifier
                        .offset(x = x, y = y)
                        .size(cellW, cellH)
                )
            }
        }
    }
}

@Composable
private fun UnitToken(unit: GridUnit, modifier: Modifier = Modifier) {
    val borderColor = if (unit.isHero) GoldDark else BloodRed

    // Flash red briefly whenever this unit takes damage
    val hitFlash = remember { Animatable(0f) }
    var lastHp by remember { mutableIntStateOf(unit.hp) }
    LaunchedEffect(unit.hp) {
        if (unit.hp < lastHp) {
            hitFlash.snapTo(0.55f)
            hitFlash.animateTo(0f, tween(durationMillis = 450))
        }
        lastHp = unit.hp
    }

    Box(
        modifier = modifier
            .border(1.5.dp, borderColor, RoundedCornerShape(6.dp))
            .background(StoneDark.copy(alpha = 0.9f), RoundedCornerShape(6.dp))
            .background(BloodRed.copy(alpha = hitFlash.value), RoundedCornerShape(6.dp)),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 2.dp, vertical = 4.dp)
        ) {
            Text(
                text = unit.emoji,
                fontSize = 20.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.weight(1f)
            )
            // Animated HP bar
            val animatedHp by animateFloatAsState(
                targetValue = unit.hpPercent.coerceIn(0f, 1f),
                animationSpec = tween(durationMillis = 400),
                label = "unitHp"
            )
            val hpColor = when {
                animatedHp > 0.5f -> ForestGreen
                animatedHp > 0.25f -> GoldCoin
                else -> BloodRed
            }
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(4.dp)
                    .background(Color.DarkGray, RoundedCornerShape(2.dp))
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxHeight()
                        .fillMaxWidth(animatedHp)
                        .background(hpColor, RoundedCornerShape(2.dp))
                )
            }
        }
    }
}

@Composable
private fun BattleEventLog(events: List<String>, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .background(StoneDark.copy(alpha = 0.85f), RoundedCornerShape(8.dp))
            .padding(8.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Text(
            text = "Events",
            style = MaterialTheme.typography.labelMedium,
            color = GoldCoin
        )
        events.forEachIndexed { index, event ->
            val alpha = (1f - index * 0.1f).coerceIn(0.3f, 1f)
            val color = when {
                event.contains("slain") -> BloodRed.copy(alpha = alpha)
                event.contains("Victory") || event.contains("flanked") -> GoldCoin.copy(alpha = alpha)
                else -> ParchmentBeige.copy(alpha = alpha)
            }
            Text(
                text = event,
                style = MaterialTheme.typography.labelSmall,
                color = color,
                overflow = TextOverflow.Ellipsis,
                maxLines = 2
            )
        }
    }
}
