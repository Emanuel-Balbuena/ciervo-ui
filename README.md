<div align="center">
  <h1>ciervo-ui</h1>
  <p><strong>A highly dynamic, physical, and acoustic Vue 3 component library.</strong></p>
</div>

> Born from artistic exploration and the need for a highly dynamic interface. This is not a generic library designed to please everyone; it has a very personal, opinionated architectural style. I don't pretend it works for every use case, but if you like my work, the code is yours.

**[View the Interactive Playground & Documentation](https://emanuel-balbuena.github.io/ciervo-ui/)**

---

## Installation

```bash
npm install ciervo-ui
```

*(Note: Ciervo UI is fully tree-shakable. Your bundler will only include the components you actually import).*

---

## Core Features

* **The Physics & Spring**: Buttons shouldn't feel like dead pixels. Every interaction is driven by a custom 390ms linear spring easing curve, carefully tuned to mimic the fast, precise response of a laptop keyboard switch. It relies on hardware-accelerated layer compositing (`translateZ(0)`) to guarantee flawless 60/120fps animations without repainting the layout.
* **Zero Layout Shift Morphing**: When a button enters the loading state, an SVG spinner expands smoothly from a collapsed zero-geometry state. No layout shifts, no ternary operators for text changes, and a built-in native circuit-breaker to prevent duplicate form submissions.
* **Mathematical Geometry**: Border radii are mathematically scaled based on a strict 1/3 height ratio. The curvature of the square variant remains proportionally perfect across all scales, while the round variant maintains a flawless pill shape.
* **Acoustic Feedback (Cuelume)**: Sound is not a decoration; it is haptic affordance. Integrated natively with the Cuelume audio engine, each button variant maps to an exact acoustic profile:

| Variant | Sound Profile | Acoustic Mapping |
| :--- | :--- | :--- |
| `solid` / `framed` | **Press** | Compact synthetic chirp |
| `soft` | **Tick** | Fast three-step locator |
| `outline` | **Release** | Mechanical click-clack |
| `ghost` | **Whisper** | Soft hush with a falling tone |

*(Note: Acoustic feedback is automatically disabled on mobile devices to prevent media interruptions, or can be bypassed globally via the `:sound="false"` prop).*

---

## Basic Usage

```vue
<script setup>
import { Button } from 'ciervo-ui'
import 'ciervo-ui/style.css'
</script>

<template>
  <!-- Primary Action -->
  <Button color="orange" shape="round" variant="solid">
    Confirm Purchase
  </Button>

  <!-- Secondary Action with Loading State -->
  <Button :loading="isSubmitting" color="black" shape="square" variant="soft">
    Save changes
  </Button>
</template>
```

### Typography (Recommended)
Ciervo UI is crafted around the **Instrument Sans** typeface. Add the font link to your `index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@500;600;700&display=swap" rel="stylesheet">
```

### Theme Configuration (Required)
Ciervo UI uses an explicit dual-theme architecture. Apply either `theme-light` or `theme-dark` class to your root `<html>`, `<body>`, or a container wrapper:

```html
<html class="theme-dark">
```

---

## The System Matrix

The library includes a strict visual hierarchy designed for modern applications, fully compatible with Dark/Light view transitions:

| System | Available Tokens |
| :--- | :--- |
| **Variants (5)** | `solid`, `framed`, `soft`, `outline`, `ghost` |
| **Colors (10)** | `black`, `red`, `orange`, `yellow`, `lime`, `green`, `cyan`, `blue`, `violet`, `pink` |
| **Sizes (5)** | `micro`, `tiny`, `small`, `medium`, `large` |
| **Shapes (2)** | `square`, `round` |

---

## License

MIT © 2026 Ciervo