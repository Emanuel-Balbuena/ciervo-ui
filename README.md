ciervo-ui
A Vue 3 component library born from artistic exploration and the need for a highly dynamic, physical, and acoustic interface. This is not a generic library designed to please everyone; it has a very personal, opinionated architectural style. I don't pretend it works for every use case, but if you like my work, the code is yours.

[View the Interactive Playground & Documentation](https://emanuel-balbuena.github.io/ciervo-ui/)

Installation
Bash
npm install ciervo-ui
(Note: Ciervo UI is fully tree-shakable. Your bundler will only include the components you actually import).

Core Features
The Physics & Spring
Buttons shouldn't feel like dead pixels. Every interaction is driven by a custom 390ms linear spring easing curve, carefully tuned to mimic the fast, precise response of a laptop keyboard switch. It relies on hardware-accelerated layer compositing (translateZ(0)) to guarantee flawless 60/120fps animations on both desktop and mobile devices without repainting the layout.

Zero Layout Shift Morphing
The industry standard for loading states shouldn't involve graying out the UI or causing layout jumps. When a button enters the loading state, an SVG spinner expands smoothly from a collapsed zero-geometry state.

No ternary operators for text changes.

No layout shifts.

Built-in native circuit-breaker to prevent duplicate form submissions.

Acoustic Feedback
Sound is not a decoration; it is haptic affordance. Integrated natively with the Cuelume audio engine, each button variant maps to an exact acoustic profile:

solid / framed → Compact synthetic chirp (Press)

soft → Fast three-step locator (Tick)

outline → Mechanical click-clack (Release)

ghost → Soft hush with a falling tone (Whisper)

(Acoustic feedback is automatically disabled on mobile devices to prevent media interruptions, or can be bypassed globally via the :sound="false" prop).

Mathematical Geometry
The border radii aren't guessed; they are mathematically scaled based on a strict 1/3 height ratio. Whether you are rendering a micro (24px) or large (44px) button, the curvature of the square variant remains proportionally perfect, while the round variant maintains a flawless pill shape.

## Basic Usage

```vue
<script setup>
import { Button } from 'ciervo-ui'
import 'ciervo-ui/style.css'
</script>

<template>
  <Button variant="solid" color="orange" shape="round" :sound="true">
    Press me
  </Button>
</template>
```

### Typography (Recommended)
Ciervo UI is crafted around the **Instrument Sans** typeface. For the intended visual experience, add the font link to your `index.html` `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@500;600;700&display=swap" rel="stylesheet">
```

### Theme Configuration (Required)
Ciervo UI uses an explicit dual-theme architecture. To activate the colors and styles of the components, apply either `theme-light` or `theme-dark` class to your root `<html>`, `<body>`, or a container wrapper:

```html
<!-- Example in index.html -->
<html class="theme-light"> <!-- or class="theme-dark" -->
```

Or toggle dynamically in Vue:

```vue
<div :class="isDark ? 'theme-dark' : 'theme-light'">
  <Button variant="solid" color="orange">Press me</Button>
</div>
```
The System Matrix
The library includes a strict visual hierarchy designed for modern applications, fully compatible with Dark/Light view transitions:

5 Variants: solid, framed, soft, outline, ghost

10 Colors: black, red, orange, yellow, lime, green, cyan, blue, violet, pink

5 Sizes: micro, tiny, small, medium, large

2 Shapes: square, round

License
MIT © 2026 Ciervo