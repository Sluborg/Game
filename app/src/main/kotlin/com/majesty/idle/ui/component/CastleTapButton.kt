package com.majesty.idle.ui.component

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.majesty.idle.ui.theme.GoldCoin
import com.majesty.idle.ui.theme.GoldLight
import com.majesty.idle.ui.theme.ParchmentDark
import com.majesty.idle.ui.theme.RoyalPurpleDeep
import com.majesty.idle.ui.theme.StoneDark
import kotlin.random.Random

private data class FloatingGold(val id: Long, val amount: Long, val xOffsetDp: Int)

/**
 * Active-play element: tap the castle to collect taxes immediately.
 * Shows floating "+Ng" numbers and a press bounce so taps feel rewarding.
 */
@Composable
fun CastleTapButton(
    tapReward: Long,
    onTap: () -> Unit,
    modifier: Modifier = Modifier
) {
    val floaters = remember { mutableStateListOf<FloatingGold>() }
    var nextFloaterId by remember { mutableLongStateOf(0L) }
    val pressScale = remember { Animatable(1f) }

    LaunchedEffect(floaters.size) {
        if (floaters.isNotEmpty()) {
            pressScale.snapTo(0.94f)
            pressScale.animateTo(1f, spring(dampingRatio = Spring.DampingRatioMediumBouncy))
        }
    }

    Box(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 6.dp)
            .height(86.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .scale(pressScale.value)
                .background(
                    Brush.verticalGradient(listOf(StoneDark, RoyalPurpleDeep)),
                    RoundedCornerShape(14.dp)
                )
                .border(1.dp, GoldCoin.copy(alpha = 0.5f), RoundedCornerShape(14.dp))
                .clickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null
                ) {
                    onTap()
                    floaters.add(FloatingGold(nextFloaterId++, tapReward, Random.nextInt(-40, 40)))
                }
                .padding(vertical = 10.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(text = "🏰", fontSize = 30.sp)
            Text(
                text = "Collect Taxes  (+${tapReward}g)",
                style = MaterialTheme.typography.labelSmall,
                color = ParchmentDark
            )
        }

        floaters.forEach { floater ->
            key(floater.id) {
                FloatingGoldText(floater) { floaters.remove(floater) }
            }
        }
    }
}

@Composable
private fun BoxScope.FloatingGoldText(floater: FloatingGold, onDone: () -> Unit) {
    val progress = remember { Animatable(0f) }
    LaunchedEffect(floater.id) {
        progress.animateTo(1f, tween(durationMillis = 900))
        onDone()
    }
    Text(
        text = "+${floater.amount}g",
        color = GoldLight,
        style = MaterialTheme.typography.titleLarge,
        modifier = Modifier
            .align(Alignment.TopCenter)
            .padding(top = 26.dp)
            .offset(x = floater.xOffsetDp.dp, y = (-55 * progress.value).dp)
            .alpha(1f - progress.value)
    )
}
