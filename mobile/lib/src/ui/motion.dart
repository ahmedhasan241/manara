import 'dart:async';

import 'package:flutter/gestures.dart' show kTouchSlop;
import 'package:flutter/material.dart';

/// Shared motion tokens. Every widget here renders its end state instantly when
/// the platform asks for reduced motion (MediaQuery.disableAnimations).
abstract final class Motion {
  static const fast = Duration(milliseconds: 160);
  static const medium = Duration(milliseconds: 320);
  static const slow = Duration(milliseconds: 480);
  static const curve = Curves.easeOutCubic;
  static const stagger = Duration(milliseconds: 45);

  /// List items past this index appear without an entrance, so long lists stay calm.
  static const maxStaggered = 10;

  static bool reduced(BuildContext context) => MediaQuery.maybeDisableAnimationsOf(context) ?? false;
}

/// Fades and lifts its child into place once, after an optional delay.
class Reveal extends StatefulWidget {
  const Reveal({super.key, required this.child, this.delay = Duration.zero, this.duration = Motion.medium, this.offset = 14});

  final Widget child;
  final Duration delay;
  final Duration duration;

  /// How far (logical pixels) the child rises from.
  final double offset;

  @override
  State<Reveal> createState() => _RevealState();
}

class _RevealState extends State<Reveal> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(vsync: this, duration: widget.duration);
  late final CurvedAnimation _progress = CurvedAnimation(parent: _controller, curve: Motion.curve);
  Timer? _timer;
  bool _scheduled = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_scheduled) return;
    _scheduled = true;
    if (Motion.reduced(context)) {
      _controller.value = 1;
    } else if (widget.delay == Duration.zero) {
      _controller.forward();
    } else {
      _timer = Timer(widget.delay, () {
        if (mounted) _controller.forward();
      });
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _progress.dispose();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (Motion.reduced(context)) return widget.child;
    return FadeTransition(
      opacity: _progress,
      child: AnimatedBuilder(
        animation: _progress,
        builder: (context, child) => Transform.translate(offset: Offset(0, widget.offset * (1 - _progress.value)), child: child),
        child: widget.child,
      ),
    );
  }
}

/// A list item that reveals with a delay based on its position.
class StaggeredItem extends StatelessWidget {
  const StaggeredItem({super.key, required this.index, required this.child, this.baseDelay = Duration.zero});

  final int index;
  final Widget child;
  final Duration baseDelay;

  @override
  Widget build(BuildContext context) {
    if (index >= Motion.maxStaggered) return child;
    return Reveal(delay: baseDelay + Motion.stagger * index, child: child);
  }
}

/// Wraps each child in a [StaggeredItem], for `ListView(children: ...)` and columns.
List<Widget> staggered(Iterable<Widget> children, {int startIndex = 0, Duration baseDelay = Duration.zero}) => [
      for (final (i, child) in children.indexed) StaggeredItem(index: startIndex + i, baseDelay: baseDelay, child: child),
    ];

/// Scales its child down slightly while a finger is on it. It only listens to
/// pointers, so taps still reach the InkWell / ListTile / button inside.
class Pressable extends StatefulWidget {
  const Pressable({super.key, required this.child, this.scale = 0.97, this.enabled = true});

  final Widget child;
  final double scale;
  final bool enabled;

  @override
  State<Pressable> createState() => _PressableState();
}

class _PressableState extends State<Pressable> {
  bool _pressed = false;
  Offset? _origin;

  void _set(bool pressed) {
    if (_pressed != pressed) setState(() => _pressed = pressed);
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.enabled || Motion.reduced(context)) return widget.child;
    return Listener(
      onPointerDown: (e) {
        _origin = e.position;
        _set(true);
      },
      // Scrolling the list isn't a press: let go once the finger travels.
      onPointerMove: (e) {
        if (_pressed && _origin != null && (e.position - _origin!).distance > kTouchSlop) _set(false);
      },
      onPointerUp: (_) => _set(false),
      onPointerCancel: (_) => _set(false),
      child: AnimatedScale(
        scale: _pressed ? widget.scale : 1,
        duration: _pressed ? const Duration(milliseconds: 90) : Motion.fast,
        curve: Curves.easeOut,
        child: widget.child,
      ),
    );
  }
}

/// Cross-fades (with a small rise) between states such as loading / content / error.
/// [state] identifies the current state; changing it triggers the transition.
class FadeSwitcher extends StatelessWidget {
  const FadeSwitcher({super.key, required this.state, required this.child, this.duration = Motion.medium, this.alignment = Alignment.topCenter});

  final Object state;
  final Widget child;
  final Duration duration;
  final AlignmentGeometry alignment;

  @override
  Widget build(BuildContext context) {
    return AnimatedSwitcher(
      duration: Motion.reduced(context) ? Duration.zero : duration,
      switchInCurve: Motion.curve,
      switchOutCurve: Curves.easeInCubic,
      layoutBuilder: (current, previous) => Stack(
        alignment: alignment,
        children: [...previous, if (current != null) current],
      ),
      transitionBuilder: (child, animation) => FadeTransition(
        opacity: animation,
        child: SlideTransition(
          position: animation.drive(Tween<Offset>(begin: const Offset(0, 0.015), end: Offset.zero)),
          child: child,
        ),
      ),
      child: KeyedSubtree(key: ValueKey<Object>(state), child: child),
    );
  }
}

/// Paints a soft highlight sweeping across its child. Use with [SkeletonBox]es.
class Shimmer extends StatefulWidget {
  const Shimmer({super.key, required this.child});

  final Widget child;

  @override
  State<Shimmer> createState() => _ShimmerState();
}

class _ShimmerState extends State<Shimmer> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 1400));

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (Motion.reduced(context)) {
      _controller.stop();
    } else if (!_controller.isAnimating) {
      _controller.repeat();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (Motion.reduced(context)) return widget.child;
    final scheme = Theme.of(context).colorScheme;
    final base = scheme.surfaceContainerHighest;
    final highlight = Color.lerp(base, scheme.surface, 0.7)!;
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) => ShaderMask(
        blendMode: BlendMode.srcATop,
        shaderCallback: (bounds) => LinearGradient(
          colors: [base, highlight, base],
          stops: const [0.35, 0.5, 0.65],
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
          transform: _SlidingGradient(_controller.value * 2 - 1),
        ).createShader(bounds),
        child: child,
      ),
      child: widget.child,
    );
  }
}

class _SlidingGradient extends GradientTransform {
  const _SlidingGradient(this.percent);

  final double percent;

  @override
  Matrix4? transform(Rect bounds, {TextDirection? textDirection}) => Matrix4.translationValues(bounds.width * percent, 0, 0);
}

/// A placeholder block for skeleton layouts.
class SkeletonBox extends StatelessWidget {
  const SkeletonBox({super.key, this.width, this.height = 12, this.radius = 6});

  final double? width;
  final double height;
  final double radius;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: width,
      height: height,
      decoration: BoxDecoration(color: Theme.of(context).colorScheme.surfaceContainerHighest, borderRadius: BorderRadius.circular(radius)),
    );
  }
}

/// A shimmering stack of card-shaped placeholders, shown while a list loads.
class SkeletonList extends StatelessWidget {
  const SkeletonList({super.key, this.itemCount = 6, this.padding = const EdgeInsets.all(16), this.leading = true});

  final int itemCount;
  final EdgeInsetsGeometry padding;
  final bool leading;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'Loading',
      child: ListView.separated(
        padding: padding,
        itemCount: itemCount,
        separatorBuilder: (_, _) => const SizedBox(height: 10),
        // The shimmer sits inside the card so only the placeholder blocks catch the highlight.
        itemBuilder: (context, i) => Card(
          child: Shimmer(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Row(
                children: [
                  if (leading) ...[
                    const SkeletonBox(width: 44, height: 44, radius: 12),
                    const SizedBox(width: 14),
                  ],
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        FractionallySizedBox(widthFactor: i.isEven ? 0.7 : 0.55, child: const SkeletonBox(height: 14)),
                        const SizedBox(height: 10),
                        FractionallySizedBox(widthFactor: i.isEven ? 0.4 : 0.5, child: const SkeletonBox(height: 10)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// A dot with a ring that softly pulses outward, e.g. for "live" status.
class PulsingDot extends StatefulWidget {
  const PulsingDot({super.key, required this.color, this.size = 8});

  final Color color;
  final double size;

  @override
  State<PulsingDot> createState() => _PulsingDotState();
}

class _PulsingDotState extends State<PulsingDot> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 1500));

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (Motion.reduced(context)) {
      _controller.stop();
    } else if (!_controller.isAnimating) {
      _controller.repeat();
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final dot = Container(
      width: widget.size,
      height: widget.size,
      decoration: BoxDecoration(color: widget.color, shape: BoxShape.circle),
    );
    final extent = widget.size * 2.4;
    if (Motion.reduced(context)) return SizedBox.square(dimension: extent, child: Center(child: dot));
    return SizedBox.square(
      dimension: extent,
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) {
          final t = Curves.easeOut.transform(_controller.value);
          return Stack(
            alignment: Alignment.center,
            children: [
              Container(
                width: widget.size * (1 + 1.4 * t),
                height: widget.size * (1 + 1.4 * t),
                decoration: BoxDecoration(
                  color: widget.color.withValues(alpha: 0.45 * (1 - t)),
                  shape: BoxShape.circle,
                ),
              ),
              child!,
            ],
          );
        },
        child: dot,
      ),
    );
  }
}

/// App-wide page transition: the incoming page fades in while rising and
/// settling from a slightly smaller scale.
class SoftPageTransitionsBuilder extends PageTransitionsBuilder {
  const SoftPageTransitionsBuilder();

  @override
  Duration get transitionDuration => Motion.medium;

  @override
  Widget buildTransitions<T>(
    PageRoute<T> route,
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    if (Motion.reduced(context)) return child;
    return _SoftPageTransition(animation: animation, child: child);
  }
}

class _SoftPageTransition extends StatelessWidget {
  _SoftPageTransition({required Animation<double> animation, required this.child})
      : _opacity = animation.drive(_fadeCurve),
        _position = animation.drive(_rise),
        _scale = animation.drive(_settle);

  static final _fadeCurve = CurveTween(curve: const Interval(0, 0.65, curve: Curves.easeOut));
  static final _rise = Tween<Offset>(begin: const Offset(0, 0.03), end: Offset.zero).chain(CurveTween(curve: Curves.easeOutCubic));
  static final _settle = Tween<double>(begin: 0.985, end: 1).chain(CurveTween(curve: Curves.easeOutCubic));

  final Animation<double> _opacity;
  final Animation<Offset> _position;
  final Animation<double> _scale;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _opacity,
      child: SlideTransition(
        position: _position,
        child: ScaleTransition(scale: _scale, child: child),
      ),
    );
  }
}

/// Bouncy, always-scrollable lists everywhere (so pull-to-refresh works even on
/// short lists), without the Android stretch/glow on top of the bounce.
class EduScrollBehavior extends MaterialScrollBehavior {
  const EduScrollBehavior();

  @override
  ScrollPhysics getScrollPhysics(BuildContext context) => const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics());

  @override
  Widget buildOverscrollIndicator(BuildContext context, Widget child, ScrollableDetails details) => child;
}