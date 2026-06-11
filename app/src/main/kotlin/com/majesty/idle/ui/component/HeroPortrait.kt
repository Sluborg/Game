package com.majesty.idle.ui.component

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import com.majesty.idle.domain.GameConstants
import com.majesty.idle.domain.model.Hero
import com.majesty.idle.domain.model.HeroState
import com.majesty.idle.ui.theme.BloodRed
import com.majesty.idle.ui.theme.ForestGreen
import com.majesty.idle.ui.theme.GoldCoin
import com.majesty.idle.ui.theme.GoldDark
import com.majesty.idle.ui.theme.RoyalPurple
import com.majesty.idle.ui.theme.StoneDark

@Composable
fun HeroPortrait(hero: Hero, modifier: Modifier = Modifier) {
    val targetBorder = when (hero.state) {
        HeroState.HUNTING -> BloodRed
        HeroState.FLEEING -> Color.Yellow
        HeroState.RESTING -> ForestGreen
        HeroState.SHOPPING -> GoldCoin
        else -> RoyalPurple
    }
    // Smooth color transition instead of an instant snap when state changes
    val borderColor by animateColorAsState(
        targetValue = targetBorder,
        animationSpec = tween(durationMillis = 400),
        label = "heroBorder"
    )

    // Heroes in combat pulse to draw the eye
    val pulse = rememberInfiniteTransition(label = "heroPulse")
    val combatScale by pulse.animateFloat(
        initialValue = 1f,
        targetValue = 1.15f,
        animationSpec = infiniteRepeatable(tween(450), RepeatMode.Reverse),
        label = "combatScale"
    )
    val emojiScale = if (hero.state == HeroState.HUNTING) combatScale else 1f

    val animatedHp by animateFloatAsState(
        targetValue = hero.hpPercent,
        animationSpec = tween(durationMillis = 500),
        label = "heroHp"
    )

    Column(
        modifier = modifier
            .width(90.dp)
            .border(2.dp, borderColor, RoundedCornerShape(10.dp))
            .background(StoneDark, RoundedCornerShape(10.dp))
            .padding(6.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = heroEmoji(hero),
            style = MaterialTheme.typography.headlineMedium,
            modifier = Modifier.scale(emojiScale)
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
        // HP bar
        LinearProgressIndicator(
            progress = { animatedHp },
            modifier = Modifier
                .fillMaxWidth()
                .height(4.dp),
            color = if (animatedHp > 0.5f) ForestGreen else BloodRed
        )
        // XP bar (gold, thinner)
        if (hero.level < GameConstants.MAX_HERO_LEVEL) {
            val xpPercent = (hero.experience.toFloat() / hero.experienceToNextLevel.toFloat())
                .coerceIn(0f, 1f)
            val animatedXp by animateFloatAsState(
                targetValue = xpPercent,
                animationSpec = tween(durationMillis = 500),
                label = "heroXp"
            )
            LinearProgressIndicator(
                progress = { animatedXp },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(3.dp)
                    .padding(top = 1.dp),
                color = GoldDark
            )
        } else {
            Text(
                text = "MAX",
                style = MaterialTheme.typography.labelSmall,
                color = GoldCoin
            )
        }
        Text(
            text = stateLabel(hero.state),
            style = MaterialTheme.typography.labelSmall,
            color = borderColor.copy(alpha = 0.9f),
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
