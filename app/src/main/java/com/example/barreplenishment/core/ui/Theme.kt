package com.example.barreplenishment.core.ui

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

val Graphite = Color(0xFF16191D)
val Charcoal = Color(0xFF24282E)
val Ice = Color(0xFFF7F8FA)
val Lime = Color(0xFFB6E85F)
val Coral = Color(0xFFFF5A4F)
val Amber = Color(0xFFF6B44B)
val Soda = Color(0xFF48A9F8)
val Muted = Color(0xFF6B727A)

val SlateLine = Color(0xFFE1E6EA)
val Mist = Color(0xFFEFF3F6)
val Cloud = Color(0xFFFFFFFF)

private val BarLightColorScheme = lightColorScheme(
    primary = Graphite,
    onPrimary = Color.White,
    primaryContainer = Lime,
    onPrimaryContainer = Graphite,
    secondary = Soda,
    onSecondary = Color.White,
    secondaryContainer = Color(0xFFDDF0FF),
    onSecondaryContainer = Graphite,
    tertiary = Amber,
    onTertiary = Graphite,
    tertiaryContainer = Color(0xFFFFE8BF),
    onTertiaryContainer = Graphite,
    error = Coral,
    onError = Color.White,
    background = Ice,
    onBackground = Graphite,
    surface = Cloud,
    onSurface = Graphite,
    surfaceVariant = Mist,
    onSurfaceVariant = Muted,
    outline = SlateLine,
    inverseSurface = Graphite,
    inverseOnSurface = Color.White
)

private val BarDarkColorScheme = darkColorScheme(
    primary = Lime,
    onPrimary = Graphite,
    primaryContainer = Charcoal,
    onPrimaryContainer = Color.White,
    secondary = Soda,
    onSecondary = Graphite,
    tertiary = Amber,
    onTertiary = Graphite,
    error = Coral,
    onError = Color.White,
    background = Graphite,
    onBackground = Color.White,
    surface = Charcoal,
    onSurface = Color.White,
    surfaceVariant = Color(0xFF2F353C),
    onSurfaceVariant = Color(0xFFC6CDD3),
    outline = Color(0xFF48515B),
    inverseSurface = Ice,
    inverseOnSurface = Graphite
)

private val BarTypography = Typography(
    displaySmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Black,
        fontSize = 32.sp,
        lineHeight = 36.sp
    ),
    headlineMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        fontSize = 24.sp,
        lineHeight = 30.sp
    ),
    titleLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        fontSize = 20.sp,
        lineHeight = 26.sp
    ),
    titleMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 16.sp,
        lineHeight = 22.sp
    ),
    bodyLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 15.sp,
        lineHeight = 22.sp
    ),
    bodyMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 13.sp,
        lineHeight = 19.sp
    ),
    labelLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        fontSize = 14.sp,
        lineHeight = 18.sp
    ),
    labelMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 12.sp,
        lineHeight = 16.sp
    )
)

private val BarShapes = Shapes(
    extraSmall = androidx.compose.foundation.shape.RoundedCornerShape(8.dp),
    small = androidx.compose.foundation.shape.RoundedCornerShape(12.dp),
    medium = androidx.compose.foundation.shape.RoundedCornerShape(16.dp),
    large = androidx.compose.foundation.shape.RoundedCornerShape(20.dp),
    extraLarge = androidx.compose.foundation.shape.RoundedCornerShape(28.dp)
)

@Composable
fun BarTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = if (darkTheme) BarDarkColorScheme else BarLightColorScheme,
        typography = BarTypography,
        shapes = BarShapes,
        content = content
    )
}
