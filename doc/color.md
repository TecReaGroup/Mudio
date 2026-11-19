# color

## Use this color palette for the library

### 1. Overall Color Strategy

The palette is dominated by a **warm grey canvas, near-black ink, and soft ivory panels**, maintaining a low-contrast, gallery-like restraint. Rather than using colored section bands or saturated buttons, color is concentrated strictly within **luminous orb artwork, media frames, and bounded gradient statement panels**.

---

### 2. Neutral Palette

| Name | Value | Token | Roles | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Warm grey canvas** | `#e5e4e0` | `--color-canvas` | background, text, surface, action | Default page ground and capsule button fill; also serves as the light source color for difference-blended large lettering. |
| **Ivory panel** | `#f1f0ec` | `--color-panel` | surface | Light media mats, capability panels, and testimonial cards (keeps low contrast against the canvas). |
| **Charcoal ink** | `#1d1d1d` | `--color-ink` | text, border, accent, link | Readable body/label text, outlined label borders, and small symbols. |
| **Light bloom** | `#ffffff` | `--color-white` | accent, text | Diffused highlights inside color artwork and light captions over dark imagery. |
| **Soft grey rule** | `#cdcdc9` *Alpha recipe: `rgba(111, 111, 111, 0.2)`* | `--color-rule` | border | `#cdcdc9` is the visual result of the alpha recipe over `#e5e4e0`. Use the `rgba` recipe for separators and faint edges so they adapt naturally to their backing. |
| **Orbital grey** | `#bfbebe` | `--color-orbit` | border | Fine dashed circular outlines sitting behind page content. |

---

### 3. Accent / Luminous Palette

| Name | Value | Token | Roles | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Luminous yellow** | `#facb0e` | `--color-yellow` | accent, background | Warm light inside the iridescent orb and bounded gradient art, softened by broad white diffusion. |
| **Pearlescent pink** | `#f06ba8` | `--color-pink` | accent, background | Pink light along the left of the sphere and one end of the gradient art. |
| **Pearlescent blue** | `#78bae6` | `--color-blue` | accent, background | Cool rim light on the sphere and the blue side of gradient art. |

---

### 4. Page-Type Variants

| Scope | Name | Value | Token | Roles | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Recruitment listings only** | **Listing white** | `#f4f4f4` | `--color-listing` | surface | A brighter neutral surface for repeated opportunity rows. |

---

### 5. Special Color Recipes & Blend Modes

* **Iridescent Gradient Panel**:
  * Primary gradient: `linear-gradient(255deg, #facb0e, #f06ba8 30%, #78bae6 65%, #ffffff)`
  * Secondary layer swaps the pink and yellow ordering, paired with a translucent white veil to lower contrast.
* **Pearlescent Orb Color Layering**:
  * Combines pink (`#f06ba8`) on the left, yellow (`#facb0e`) at the upper right, and blue (`#78bae6`) along the lower rim, softened by a central white (`#ffffff`) radial bloom at `0.65` alpha, plus a soft white upper-right highlight and a darker translucent lower rim.
* **Blend Modes**:
  * **`difference` blending**: Applied only to controlled large display lettering using `#e5e4e0`—this renders near-black over the warm grey ground and shifts to complementary colors over media. (Never use for small text; keep small text in `#1d1d1d`.)
  * **`darken` blending**: Applied to the bounded immersive statement panel carrying cool-to-warm luminous color fields.

---

### 6. Color Don'ts

* **Do not swap the ground**: Never replace the warm `#e5e4e0` canvas with a stark pure-white SaaS background or a dark page theme (including keeping the footer light rather than turning it into a dark utility band).
* **Do not use accents for solid actions or links**: Pink (`#f06ba8`), yellow (`#facb0e`), and blue (`#78bae6`) are strictly for luminous artwork—never use them as solid button fills or default link colors.
* **Do not use colored icon badges**: Avoid placing icons inside colored circles.
* **Do not alternate colored bands**: Keep the warm grey canvas uninterrupted as the connective tissue across sections rather than stacking multi-colored background strips.

## Use this color palette for the video player

### Overall Color Strategy

A cinematic, high-contrast dark palette built almost entirely on **near-black (`#101010`)** and **warm white (`#fffdf9`)**. There are no alternating solid-color bands, colored UI cards, or filled buttons. All chromatic color is strictly confined to **optical refraction and atmospheric lighting**—subtle blue-cyan-violet halos fading into darkness and tiny spectral rainbow slivers along glass edges—while photographic color remains local to portrait frames.

---

### Neutral Palette

| Name | Value | Token | Roles | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Warm white** | `#fffdf9` | `--color-text` | text, border, link, action | All primary text, monochrome proof marks, small icons, navigation contact outline, and inline action underlines (used instead of stark blue-white). |
| **Near-black canvas** | `#101010` | `--color-canvas` | background, surface | Continuous, unbroken page field behind typography, atmospheric artwork, and the footer. |
| **Dim warm rule** | `#403f3f`<*Alpha recipe: `rgba(255, 253, 249, 0.2)`* | `--color-rule` | border | Visual result of warm white at 20% opacity over the canvas. Use the `rgba` recipe for subtle bottom separators on service modules. |

---

### Accent Palette

| Name | Value | Token | Roles | Usage |
| :--- | :--- | :--- | :--- | :--- |
| **Slate blue rule** | `#495764`*Alpha recipe: `rgba(111, 135, 156, 0.6)`* | `--color-cool-rule` | border, accent | Visual result of slate `#6f879c` at 60% opacity over the canvas. Use the `rgba` recipe strictly as an edge/border color for proof-row and accordion separators—never as a panel fill. |

---

### Optical & Atmospheric Color Recipes (Artwork Only)

* **Refractive Modular Sculpture**:
  * **Faces**: Near-canvas dark (`#101010`) at low opacity so underlying darkness keeps foreground text legible.
  * **Edges & Glow**: Bright warm-white (`#fffdf9`) strokes along exposed top bevels, backed by softly blurred translucent electric blue.
  * **Prismatic Slivers**: Narrow **red → yellow → cyan → blue** linear-gradient strips restricted to just one or two bevels per glass cube.
* **Peripheral Spectral Halo**:
  * **Perimeter Light**: Uneven, cloudy, softly defocused strokes of translucent **blue, cyan, and violet** around the outer edges, lightly broken up with faint monochrome grain.
  * **Center Falloff**: Masked with a dark radial falloff so the reading center stays nearly black and `#fffdf9` typography remains the brightest layer.
* **Media & Marks**:
  * **Partner Marks & Icons**: Single-color monochrome warm white (`#fffdf9`).
  * **Portraits**: Natural full color against pale studio-like backgrounds with a faint trace of colored light to harmonize with the halo, without recoloring the surrounding page.

---

### Color Don'ts

* **Do not use stark blue-white**: Always use warm white (`#fffdf9`) for text, icons, and hairlines.
* **Do not promote the slate accent into a surface**: Keep `#495764` (`rgba(111, 135, 156, 0.6)`) strictly as a hairline separator, never as a large blue panel or card fill.
* **Do not put rainbow gradients on UI elements**: Never apply spectral/rainbow gradients to body text or button fills—they belong exclusively to glass edge refraction.
* **Do not make the halo a sharp neon ring**: Keep atmospheric color cloudy, optical, and peripheral; never let it brighten the dark reading center.
* **Do not break the continuous dark canvas**: Avoid alternating solid-color section bands, enclosed background cards, or a differently colored footer block.
* **Do not use multicolor icon tiles**: Keep UI symbols and client logos strictly monochrome warm white.
