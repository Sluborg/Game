package com.majesty.idle.ui.component

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.majesty.idle.domain.model.Hero
import com.majesty.idle.domain.model.HeroState
import com.majesty.idle.ui.theme.BloodRed
import com.majesty.idle.ui.theme.ForestGreen
import com.majesty.idle.ui.theme.GoldCoin
import com.majesty.idle.ui.theme.RoyalPurple
import com.majesty.idle.ui.theme.StoneDark

@Composable
fun HeroPortrait(hero: Hero, modifier: Modifier = Modifier) {
    val borderColor = when (hero.state) {
        HeroState.HUNTING -> BloodRed
        HeroState.FLEEING -> Color.Yellow
        HeroState.RESTING -> ForestGreen
        HeroState.SHOPPING -> GoldCoin
        else -> RoyalPurple
    }

    Column(
        modifier = modifier
            .width(80.dp)
            .border(2.dp, borderColor, RoundedCornerShape(8.dp))
            .background(StoneDark, RoundedCornerShape(8.dp))
            .padding(6.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = heroEmoji(hero),
            style = MaterialTheme.typography.headlineMedium
        )
        Text(
            text = hero.name,
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurface,
            maxLines = 1
        )
        Text(
            text = "Lv ${hero.level}",
            style = MaterialTheme.typography.labelSmall,
            color = GoldCoin
        )
        LinearProgressIndicator(
            progress = { hero.hpPercent },
            modifier = Modifier
                .fillMaxWidth()
                .height(4.dp),
            color = if (hero.hpPercent > 0.5f) ForestGreen else BloodRed
        )
        Text(
            text = stateLabel(hero.state),
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            maxLines = 1
        )
    }
}

private fun heroEmoji(hero: Hero): String = when (hero.heroClass) {
    com.majesty.idle.domain.model.HeroClass.WARRIOR -> "⚔️"
    com.majesty.idle.domain.model.HeroClass.RANGER -> "🏹"
    com.majesty.idle.domain.model.HeroClass.WIZARD -> "🧙"
    com.majesty.idle.domain.model.HeroClass.PALADIN -> "🛡️"
    com.majesty.idle.domain.model.HeroClass.ROGUE -> "🗡️"
}

private fun stateLabel(state: HeroState): String = when (state) {
    HeroState.IDLE -> "Idle"
    HeroState.PATROLLING -> "Patrol"
    HeroState.HUNTING -> "Hunt!"
    HeroState.FLEEING -> "Flee!"
    HeroState.RESTING -> "Rest"
    HeroState.SHOPPING -> "Shop"
}
