package com.majesty.idle.ui.component

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.majesty.idle.domain.model.Milestone
import com.majesty.idle.ui.theme.GoldCoin
import com.majesty.idle.ui.theme.GoldDark
import com.majesty.idle.ui.theme.ParchmentDark
import com.majesty.idle.ui.theme.RoyalPurple
import com.majesty.idle.ui.theme.StoneDark

@Composable
fun MilestonePanel(milestones: List<Milestone>, modifier: Modifier = Modifier) {
    if (milestones.isEmpty()) return

    LazyRow(
        modifier = modifier,
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 6.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(milestones, key = { it.id }) { milestone ->
            MilestoneChip(milestone)
        }
    }
}

@Composable
private fun MilestoneChip(milestone: Milestone) {
    val bg = if (milestone.isCompleted) GoldDark else StoneDark
    val borderColor = if (milestone.isCompleted) GoldCoin else RoyalPurple
    val textColor = if (milestone.isCompleted) GoldCoin else ParchmentDark

    Box(
        modifier = Modifier
            .border(1.dp, borderColor, RoundedCornerShape(16.dp))
            .background(bg, RoundedCornerShape(16.dp))
            .padding(horizontal = 10.dp, vertical = 4.dp)
    ) {
        Text(
            text = "${if (milestone.isCompleted) "✓ " else ""}${milestone.title}",
            style = MaterialTheme.typography.labelSmall,
            color = textColor
        )
    }
}
