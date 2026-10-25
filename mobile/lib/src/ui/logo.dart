import 'package:flutter/material.dart';

import 'theme.dart';

/// The Manara lighthouse mark: gold line art (light rays, graduation-cap
/// lantern, tower and waves) on a navy rounded square. Drawn from the same
/// 40x40 geometry as the web `LogoMark` SVG.
class ManaraMark extends StatelessWidget {
  const ManaraMark({super.key, this.size = 40, this.semanticLabel});

  final double size;

  /// Read out by screen readers; null hides the mark from them (decorative).
  final String? semanticLabel;

  @override
  Widget build(BuildContext context) {
    final mark = SizedBox.square(dimension: size, child: const CustomPaint(painter: _LighthousePainter()));
    if (semanticLabel == null) return ExcludeSemantics(child: mark);
    return Semantics(label: semanticLabel, image: true, child: ExcludeSemantics(child: mark));
  }
}

class _LighthousePainter extends CustomPainter {
  const _LighthousePainter();

  @override
  void paint(Canvas canvas, Size size) {
    final s = size.shortestSide / 40;
    canvas.save();
    canvas.scale(s);

    // Navy tile with a faint gold rim.
    final tile = RRect.fromRectAndRadius(const Rect.fromLTWH(0, 0, 40, 40), const Radius.circular(10));
    canvas.drawRRect(tile, Paint()..color = EduColors.navy);
    canvas.drawRRect(
      RRect.fromRectAndRadius(const Rect.fromLTWH(0.5, 0.5, 39, 39), const Radius.circular(9.5)),
      Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1
        ..color = EduColors.goldSoft.withValues(alpha: 0.35),
    );

    final gold = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.6
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..color = EduColors.gold;

    void line(double x1, double y1, double x2, double y2) => canvas.drawLine(Offset(x1, y1), Offset(x2, y2), gold);

    // Light rays above the cap.
    line(20, 3.6, 20, 6.1);
    line(15, 5.3, 16.4, 7.0);
    line(25, 5.3, 23.6, 7.0);

    // Graduation cap (the lantern) and its tassel.
    canvas.drawPath(
      Path()
        ..moveTo(11.5, 11.7)
        ..lineTo(20, 8.1)
        ..lineTo(28.5, 11.7)
        ..lineTo(20, 15.3)
        ..close(),
      gold,
    );
    line(12.7, 12.3, 12.7, 15.7);

    // Gallery, tower and its stripes.
    canvas.drawRect(const Rect.fromLTRB(15.6, 16.9, 24.4, 19.2), gold);
    line(16.6, 19.2, 15.1, 29.4);
    line(23.4, 19.2, 24.9, 29.4);
    line(16.2, 23.4, 23.7, 21.1);
    line(15.7, 27.2, 24.5, 24.5);

    // Two waves (or the pages of an open book) at the base.
    for (final dy in const [0.0, 3.0]) {
      canvas.drawPath(
        Path()
          ..moveTo(7.4, 30.8 + dy)
          ..cubicTo(11.6, 29.1 + dy, 15.8, 29.4 + dy, 20, 31.7 + dy)
          ..cubicTo(24.2, 29.4 + dy, 28.4, 29.1 + dy, 32.6, 30.8 + dy),
        gold,
      );
    }
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _LighthousePainter oldDelegate) => false;
}

/// Mark plus the bilingual wordmark: "MANARA" ("MAN" in gold) over "منارة".
///
/// [onDark] picks the colours for navy or dark backgrounds (white "ARA",
/// bright gold); it defaults to the current theme's brightness.
class ManaraLogo extends StatelessWidget {
  const ManaraLogo({super.key, this.size = 40, this.vertical = false, this.onDark, this.showMark = true});

  /// Height of the mark; the wordmark scales with it.
  final double size;

  /// Mark above a centred wordmark (sign-in screens) instead of side by side.
  final bool vertical;
  final bool? onDark;
  final bool showMark;

  @override
  Widget build(BuildContext context) {
    final dark = onDark ?? Theme.of(context).brightness == Brightness.dark;
    final gold = dark ? EduColors.gold : EduColors.goldDeep;
    final rest = dark ? Colors.white : EduColors.navy;
    final latin = (vertical ? size * 0.36 : size * 0.44).clamp(14.0, 40.0).toDouble();
    final align = vertical ? CrossAxisAlignment.center : CrossAxisAlignment.start;

    final wordmark = Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: align,
      children: [
        Text.rich(
          TextSpan(children: [
            TextSpan(text: 'MAN', style: TextStyle(color: gold)),
            TextSpan(text: 'ARA', style: TextStyle(color: rest)),
          ]),
          textDirection: TextDirection.ltr,
          style: TextStyle(fontSize: latin, fontWeight: FontWeight.w800, letterSpacing: latin * 0.16, height: 1),
        ),
        SizedBox(height: latin * 0.22),
        Text(
          'منارة',
          textDirection: TextDirection.rtl,
          style: TextStyle(fontSize: latin * 0.8, fontWeight: FontWeight.w700, color: gold, height: 1.1),
        ),
      ],
    );

    return Semantics(
      label: 'Manara',
      container: true,
      child: ExcludeSemantics(
        child: vertical
            ? Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (showMark) ...[ManaraMark(size: size), SizedBox(height: size * 0.22)],
                  wordmark,
                ],
              )
            : Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (showMark) ...[ManaraMark(size: size), SizedBox(width: size * 0.28)],
                  wordmark,
                ],
              ),
      ),
    );
  }
}

/// Full-screen loading state: the lighthouse mark with a soft gold beam and a
/// thin gold arc turning around it, like the web page loader. With reduced
/// motion (system setting) the beam and arc stay still.
class ManaraLoader extends StatefulWidget {
  const ManaraLoader({super.key, this.label});

  /// Optional line under the mark, e.g. "Loading…".
  final String? label;

  @override
  State<ManaraLoader> createState() => _ManaraLoaderState();
}

class _ManaraLoaderState extends State<ManaraLoader> with SingleTickerProviderStateMixin {
  late final AnimationController _turn = AnimationController(vsync: this, duration: const Duration(milliseconds: 2400));

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (MediaQuery.of(context).disableAnimations) {
      _turn.stop();
    } else if (!_turn.isAnimating) {
      _turn.repeat();
    }
  }

  @override
  void dispose() {
    _turn.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final muted = Theme.of(context).colorScheme.onSurfaceVariant;
    return Semantics(
      liveRegion: true,
      label: widget.label ?? 'Loading',
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox.square(
            dimension: 112,
            child: AnimatedBuilder(
              animation: _turn,
              builder: (context, child) => CustomPaint(painter: _BeamPainter(_turn.value), child: child),
              child: const Center(child: ManaraMark(size: 56)),
            ),
          ),
          if (widget.label != null) ...[
            const SizedBox(height: 14),
            Text(widget.label!, style: TextStyle(color: muted, fontWeight: FontWeight.w500)),
          ],
        ],
      ),
    );
  }
}

/// Two opposite gold beams and a short gold arc, rotated by [turn] (0–1).
class _BeamPainter extends CustomPainter {
  const _BeamPainter(this.turn);

  final double turn;

  @override
  void paint(Canvas canvas, Size size) {
    final center = size.center(Offset.zero);
    final radius = size.shortestSide / 2;
    final angle = turn * 2 * 3.141592653589793;

    for (final start in [angle, angle + 3.141592653589793]) {
      final beam = Paint()
        ..shader = SweepGradient(
          endAngle: 0.8,
          colors: [EduColors.gold.withValues(alpha: 0.45), EduColors.gold.withValues(alpha: 0)],
          transform: GradientRotation(start),
        ).createShader(Rect.fromCircle(center: center, radius: radius));
      canvas.drawArc(Rect.fromCircle(center: center, radius: radius * 0.92), start, 0.8, true, beam);
    }

    final track = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1
      ..color = EduColors.navMuted.withValues(alpha: 0.35);
    canvas.drawCircle(center, radius - 6, track);

    final arc = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2
      ..strokeCap = StrokeCap.round
      ..color = EduColors.goldSoft;
    canvas.drawArc(Rect.fromCircle(center: center, radius: radius - 6), angle * 2, 0.9, false, arc);
  }

  @override
  bool shouldRepaint(_BeamPainter old) => old.turn != turn;
}
