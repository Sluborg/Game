package com.majesty.idle.ui.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
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
            .background(Color.Black.copy(alpha = 0.88f))
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
                    text = "⚔ Grid Battle",
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

            // Status line
            val statusText = when {
                state.isResolved && state.heroesWon -> "⚔ Victory!"
                state.isResolved -> "💀 Heroes defeated..."
                else -> "Tick ${state.tick}  |  ${state.heroUnits.size} heroes  vs  ${state.monsterUnits.size} foes"
            }
            val statusColor = if (state.isResolved && state.heroesWon) GoldCoin else ParchmentDark
            Text(
                text = statusText,
                style = MaterialTheme.typography.bodyMedium,
                color = statusColor
            )
        }
    }
}

@Composable
private fun BattleGrid(state: GridBattleState, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        for (row in 0 until GridPos.ROWS) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(64.dp),
                horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                for (col in 0 until GridPos.COLS) {
                    GridCell(
                        unit = state.unitAt(GridPos(col, row)),
                        modifier = Modifier.weight(1f).fillMaxHeight()
                    )
                }
            }
        }
    }
}

@Composable
private fun GridCell(unit: GridUnit?, modifier: Modifier = Modifier) {
    val borderColor = when {
        unit == null -> StoneDark
        unit.isHero -> GoldDark
        else -> BloodRed
    }
    Box(
        modifier = modifier
            .border(1.dp, borderColor, RoundedCornerShape(6.dp))
            .background(StoneDark.copy(alpha = 0.7f), RoundedCornerShape(6.dp)),
        contentAlignment = Alignment.Center
    ) {
        if (unit != null) {
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
                // HP bar
                val hpFraction = unit.hpPercent.coerceIn(0f, 1f)
                val hpColor = when {
                    hpFraction > 0.5f -> ForestGreen
                    hpFraction > 0.25f -> GoldCoin
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
                            .fillMaxWidth(hpFraction)
                            .background(hpColor, RoundedCornerShape(2.dp))
                    )
                }
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
