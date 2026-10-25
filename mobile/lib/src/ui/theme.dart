import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'motion.dart';

/// Manara palette, shared with the web apps: deep navy from the logo's
/// background and lighthouse gold. Gold 600 and darker carry white text;
/// the lighter golds are for accents and for text on navy.
abstract final class EduColors {
  // Navy.
  static const navy = Color(0xFF132544);
  static const navyDark = Color(0xFF0F1B33);
  static const navyLight = Color(0xFF172A4B);
  static const navInk = Color(0xFFF4EFE3);
  static const navMuted = Color(0xFF9AA5BA);

  // Gold.
  static const gold = Color(0xFFE0B55F);
  static const goldSoft = Color(0xFFD9AB55);
  static const goldDeep = Color(0xFF9C6B1C);
  static const goldDeeper = Color(0xFF7E5616);

  /// Cream tint for highlighted surfaces.
  static const cream = Color(0xFFFBF4E6);

  // Older names some widgets use; all on the gold scale now.
  static const brand500 = Color(0xFFC4913A);
  static const brand600 = goldDeep;
  static const brand700 = goldDeeper;
  static const brand800 = Color(0xFF614213);

  /// Live lessons and destructive actions.
  static const live = Color(0xFFE5484D);

  static const ink = Color(0xFF1F2A40);
  static const muted = Color(0xFF5C667A);

  static const lightPage = Color(0xFFF9F8F5);
  static const darkPage = Color(0xFF0E1930);
}

const _radius = 14.0;

ColorScheme _scheme(Brightness brightness) {
  final seeded = ColorScheme.fromSeed(seedColor: EduColors.goldSoft, brightness: brightness);
  if (brightness == Brightness.dark) {
    return seeded.copyWith(
      primary: EduColors.gold,
      onPrimary: EduColors.navyDark,
      primaryContainer: const Color(0xFF3A2C12),
      onPrimaryContainer: const Color(0xFFF6EBD3),
      secondary: const Color(0xFFB7C2D8),
      onSecondary: EduColors.navyDark,
      secondaryContainer: const Color(0xFF243657),
      onSecondaryContainer: const Color(0xFFE6E9F0),
      tertiary: const Color(0xFFE4C07C),
      onTertiary: EduColors.navyDark,
      tertiaryContainer: const Color(0xFF2B3A5C),
      onTertiaryContainer: const Color(0xFFE6E9F0),
      surface: const Color(0xFF15233F),
      onSurface: const Color(0xFFE6E9F0),
      onSurfaceVariant: EduColors.navMuted,
      outline: const Color(0xFF5B6A88),
      outlineVariant: const Color(0xFF243657),
      surfaceContainerLowest: EduColors.darkPage,
      surfaceContainerLow: const Color(0xFF12203A),
      surfaceContainer: const Color(0xFF15233F),
      surfaceContainerHigh: const Color(0xFF1D2E4F),
      surfaceContainerHighest: const Color(0xFF243657),
      inverseSurface: const Color(0xFFE6E9F0),
      onInverseSurface: EduColors.navyDark,
      inversePrimary: EduColors.goldDeep,
      surfaceTint: Colors.transparent,
      shadow: Colors.black,
      error: const Color(0xFFF2666A),
      onError: const Color(0xFF2B0507),
      errorContainer: const Color(0xFF3B1517),
      onErrorContainer: const Color(0xFFFFD6D6),
    );
  }
  return seeded.copyWith(
    primary: EduColors.goldDeep,
    onPrimary: Colors.white,
    primaryContainer: const Color(0xFFF6EBD3),
    onPrimaryContainer: EduColors.brand800,
    secondary: EduColors.navy,
    onSecondary: Colors.white,
    secondaryContainer: const Color(0xFFE4E9F2),
    onSecondaryContainer: EduColors.navy,
    tertiary: EduColors.navyLight,
    onTertiary: Colors.white,
    tertiaryContainer: const Color(0xFFE4E9F2),
    onTertiaryContainer: EduColors.navy,
    surface: Colors.white,
    onSurface: EduColors.ink,
    onSurfaceVariant: EduColors.muted,
    outline: const Color(0xFF8A93A5),
    outlineVariant: const Color(0xFFE7E3DA),
    surfaceContainerLowest: Colors.white,
    surfaceContainerLow: const Color(0xFFFCFBF8),
    surfaceContainer: EduColors.cream,
    surfaceContainerHigh: const Color(0xFFF3F0EA),
    surfaceContainerHighest: const Color(0xFFEFECE5),
    inverseSurface: EduColors.navy,
    onInverseSurface: EduColors.navInk,
    inversePrimary: EduColors.gold,
    surfaceTint: Colors.transparent,
    error: const Color(0xFFC2333B),
    onError: Colors.white,
    errorContainer: const Color(0xFFFDE8E8),
    onErrorContainer: const Color(0xFF7A1A1D),
  );
}

/// Weights and spacing on top of the platform's Material 3 type scale.
const _textTheme = TextTheme(
  displaySmall: TextStyle(fontWeight: FontWeight.w700, letterSpacing: -0.5),
  headlineLarge: TextStyle(fontWeight: FontWeight.w700, letterSpacing: -0.5),
  headlineMedium: TextStyle(fontWeight: FontWeight.w700, letterSpacing: -0.4),
  headlineSmall: TextStyle(fontWeight: FontWeight.w700, letterSpacing: -0.3),
  titleLarge: TextStyle(fontWeight: FontWeight.w700, letterSpacing: -0.2),
  titleMedium: TextStyle(fontWeight: FontWeight.w600, letterSpacing: -0.1),
  titleSmall: TextStyle(fontWeight: FontWeight.w600),
  bodyLarge: TextStyle(height: 1.45),
  bodyMedium: TextStyle(height: 1.45),
  bodySmall: TextStyle(height: 1.4),
  labelLarge: TextStyle(fontWeight: FontWeight.w600, letterSpacing: 0.1),
  labelMedium: TextStyle(fontWeight: FontWeight.w600),
);

/// Status bar over the navy app bar: light icons in both modes.
const navyOverlayStyle = SystemUiOverlayStyle(
  statusBarColor: Colors.transparent,
  statusBarIconBrightness: Brightness.light,
  statusBarBrightness: Brightness.dark,
);

/// For text buttons placed in the navy app bar (e.g. "Start").
final ButtonStyle onNavyTextButtonStyle = TextButton.styleFrom(
  foregroundColor: EduColors.gold,
  disabledForegroundColor: EduColors.navMuted.withValues(alpha: 0.6),
);

ThemeData buildTheme(Brightness brightness) {
  final dark = brightness == Brightness.dark;
  final scheme = _scheme(brightness);
  final page = dark ? EduColors.darkPage : EduColors.lightPage;
  // App bar and bottom navigation are navy in both modes, like the logo.
  final bar = dark ? EduColors.navyDark : EduColors.navy;
  final barLine = dark ? const Color(0xFF243657) : EduColors.navyLight;
  final base = ThemeData(
    colorScheme: scheme,
    useMaterial3: true,
    visualDensity: VisualDensity.standard,
    scaffoldBackgroundColor: page,
    textTheme: _textTheme,
    pageTransitionsTheme: PageTransitionsTheme(
      builders: {
        for (final platform in TargetPlatform.values) platform: const SoftPageTransitionsBuilder(),
        // Apple platforms keep the native transition, which carries the edge-swipe back gesture.
        TargetPlatform.iOS: const CupertinoPageTransitionsBuilder(),
        TargetPlatform.macOS: const CupertinoPageTransitionsBuilder(),
      },
    ),
  );
  final text = base.textTheme;
  final shape = RoundedRectangleBorder(borderRadius: BorderRadius.circular(12));
  const buttonSize = Size(64, 48);

  OutlineInputBorder border(Color color, [double width = 1]) =>
      OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: color, width: width));

  return base.copyWith(
    appBarTheme: AppBarTheme(
      backgroundColor: bar,
      foregroundColor: EduColors.navInk,
      iconTheme: const IconThemeData(color: EduColors.navInk),
      actionsIconTheme: const IconThemeData(color: EduColors.navInk),
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      scrolledUnderElevation: 2,
      shadowColor: Colors.black.withValues(alpha: 0.3),
      centerTitle: false,
      systemOverlayStyle: navyOverlayStyle,
      titleTextStyle: text.titleLarge?.copyWith(color: Colors.white),
    ),
    cardTheme: CardThemeData(
      elevation: 0,
      color: scheme.surface,
      surfaceTintColor: Colors.transparent,
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(_radius),
        side: BorderSide(color: scheme.outlineVariant),
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      height: 68,
      elevation: 0,
      backgroundColor: bar,
      surfaceTintColor: Colors.transparent,
      indicatorColor: EduColors.gold.withValues(alpha: 0.18),
      labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
      labelTextStyle: WidgetStateProperty.resolveWith((states) {
        final selected = states.contains(WidgetState.selected);
        return text.labelMedium?.copyWith(
          color: selected ? EduColors.gold : EduColors.navMuted,
          fontWeight: selected ? FontWeight.w700 : FontWeight.w500,
        );
      }),
      iconTheme: WidgetStateProperty.resolveWith((states) => IconThemeData(
            size: 24,
            color: states.contains(WidgetState.selected) ? EduColors.gold : EduColors.navMuted,
          )),
    ),
    // Tabs sit in the navy app bar (course screen).
    tabBarTheme: TabBarThemeData(
      labelColor: EduColors.gold,
      unselectedLabelColor: EduColors.navMuted,
      labelStyle: text.titleSmall,
      unselectedLabelStyle: text.titleSmall?.copyWith(fontWeight: FontWeight.w500),
      indicatorColor: EduColors.gold,
      indicatorSize: TabBarIndicatorSize.label,
      dividerColor: barLine,
      overlayColor: WidgetStatePropertyAll(EduColors.gold.withValues(alpha: 0.08)),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: scheme.surface,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      border: border(scheme.outlineVariant),
      enabledBorder: border(scheme.outlineVariant),
      focusedBorder: border(scheme.primary, 1.6),
      errorBorder: border(scheme.error),
      focusedErrorBorder: border(scheme.error, 1.6),
      labelStyle: TextStyle(color: scheme.onSurfaceVariant),
      hintStyle: TextStyle(color: scheme.onSurfaceVariant),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(minimumSize: buttonSize, shape: shape, textStyle: text.labelLarge),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(minimumSize: buttonSize, shape: shape, textStyle: text.labelLarge, elevation: 0),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: buttonSize,
        shape: shape,
        textStyle: text.labelLarge,
        side: BorderSide(color: scheme.outlineVariant),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(shape: shape, textStyle: text.labelLarge),
    ),
    floatingActionButtonTheme: FloatingActionButtonThemeData(
      backgroundColor: scheme.primary,
      foregroundColor: scheme.onPrimary,
      elevation: 2,
      highlightElevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
    ),
    listTileTheme: ListTileThemeData(
      iconColor: scheme.onSurfaceVariant,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16),
    ),
    dividerTheme: DividerThemeData(color: scheme.outlineVariant),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: dark ? const Color(0xFF243657) : EduColors.navy,
      contentTextStyle: text.bodyMedium?.copyWith(color: EduColors.navInk),
      actionTextColor: EduColors.gold,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    ),
    switchTheme: SwitchThemeData(
      thumbColor: WidgetStateProperty.resolveWith((states) => states.contains(WidgetState.selected) ? scheme.onPrimary : null),
      trackColor: WidgetStateProperty.resolveWith((states) => states.contains(WidgetState.selected) ? scheme.primary : null),
    ),
    progressIndicatorTheme: ProgressIndicatorThemeData(color: scheme.primary),
  );
}
