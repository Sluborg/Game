package com.majesty.idle.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable

private val DarkColorScheme = darkColorScheme(
    primary = RoyalPurple,
    onPrimary = ParchmentBeige,
    primaryContainer = RoyalPurpleLight,
    onPrimaryContainer = ParchmentBeige,
    secondary = GoldCoin,
    onSecondary = StoneDark,
    secondaryContainer = GoldDark,
    onSecondaryContainer = ParchmentBeige,
    background = NightBlue,
    onBackground = ParchmentBeige,
    surface = StoneDark,
    onSurface = ParchmentBeige,
    surfaceVariant = StoneLight,
    onSurfaceVariant = ParchmentDark,
    error = BloodRed,
    onError = ParchmentBeige
)

@Composable
fun MajestyIdleTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColorScheme,
        typography = Typography,
        content = content
    )
}
