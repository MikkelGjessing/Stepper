# Stepping Stones Playful Theme

A delightful visual enhancement to the step progress indicator featuring a cartoon boy jumping across stepping stones.

## Overview

The Stepping Stones theme replaces the standard text-based "Step X of Y" progress indicator with an animated visual representation:
- **Stepping stones** arranged horizontally, each representing a step
- **Cartoon boy character** positioned on the current step
- **Jump animation** when advancing to the next step
- **Visual states** for completed, current, and upcoming steps

## Features

### Visual Design

**Stepping Stones:**
- **Completed stones**: Solid blue (`#4a90e2`) - steps already done
- **Current stone**: Highlighted green (`#5cb85c`) - active step with the boy
- **Upcoming stones**: Faded gray (`#e8e8e8`) - steps yet to complete

**Cartoon Boy:**
- Simple stick figure design with:
  - Orange shirt (`#ff9800`)
  - Blue shorts (`#2196f3`)
  - Skin-tone limbs and head (`#ffd0a0`)
- Positioned on top of the current step stone
- Animated jump when moving forward

### Animation

The boy performs a smooth jump animation when:
- Advancing to the next step (Continue button)
- Duration: 0.4 seconds
- Animation: Cubic bezier easing for natural movement
- Vertical lift: 20px at peak

### Theme Toggle

**Toggle Button:**
- Located in the header next to the reset button
- Icon: 🎨 (palette emoji)
- Click to switch between playful and classic themes

**Preferences:**
- Theme preference saved to localStorage
- Persists across sessions
- Key: `stepper_playful_theme_enabled`

## Usage

### Enabling/Disabling

**Via UI:**
1. Click the 🎨 button in the header
2. Theme switches immediately
3. Notification confirms the change

**Via Code:**
```javascript
import { setFeatureFlag } from './modules/config.js';

// Enable playful theme
setFeatureFlag('ENABLE_PLAYFUL_THEME', true);

// Disable playful theme (classic text)
setFeatureFlag('ENABLE_PLAYFUL_THEME', false);
```

**Via Configuration:**
```javascript
// In src/modules/config.js
export const FeatureFlags = {
  ENABLE_PLAYFUL_THEME: true,  // default: true
};
```

### Behavior

**Classic Theme (disabled):**
- Shows text: "Step 2 of 5"
- No animations
- Minimal visual footprint

**Playful Theme (enabled):**
- Shows stepping stones with boy character
- Animated transitions
- More engaging visual feedback

## Technical Details

### Files Modified

1. **src/modules/config.js**
   - Added `ENABLE_PLAYFUL_THEME` flag

2. **src/modules/ui.js**
   - New function: `renderSteppingStones(container, current, total, animate)`
   - Renders stones and boy character dynamically

3. **src/sidepanel.html**
   - Added `stepping-stones-container` div
   - Added theme toggle button
   - Wrapped reset button in controls container

4. **src/sidepanel.css**
   - Added 165+ lines of stepping stones styling
   - Stone states: completed, current, upcoming
   - Boy character styling
   - Jump animation keyframes

5. **src/sidepanel.js**
   - Updated `updateStepProgressIndicator()` to support both themes
   - Added `handleThemeToggle()` function
   - Added localStorage persistence functions
   - Track previous step for animation triggering

### CSS Classes

```css
.stepping-stones-container        /* Main container */
.stepping-stones-container.active  /* Visible state */
.stepping-stone                    /* Individual stone */
.stepping-stone.completed          /* Blue stone */
.stepping-stone.current            /* Green stone with boy */
.stepping-stone.upcoming           /* Faded gray stone */
.boy-character                     /* Boy character */
.boy-character.jumping             /* Jump animation active */
.step-progress.hidden              /* Hidden text progress */
```

### Animation Keyframes

```css
@keyframes jump {
  0%   { transform: translateX(-50%) translateY(0); }
  50%  { transform: translateX(-50%) translateY(-20px); }
  100% { transform: translateX(-50%) translateY(0); }
}
```

## Responsive Design

- Container max-width: 350px
- Stone spacing: Calculated dynamically based on total steps
- Works on narrow side panels (380px optimized)
- Horizontal scroll if many steps (>7)

### Stone Positioning

```javascript
const containerWidth = Math.min(total * 50, 350);
const stoneSpacing = containerWidth / Math.max(total - 1, 1);
const stonePosition = index * stoneSpacing;
```

## Examples

### 3 Steps - Current Step 2
```
○ ● ○
  👦
```

### 5 Steps - Current Step 3
```
● ● ● ○ ○
    👦
```

### 7 Steps - Current Step 5
```
● ● ● ● ● ○ ○
        👦
```

Legend:
- ● = Completed stone (blue)
- ● = Current stone (green)
- ○ = Upcoming stone (gray)
- 👦 = Boy character

## Accessibility

- Theme toggle has descriptive title attribute
- Animation can be disabled by switching to classic theme
- No reliance on color alone (stones also have position context)
- Keyboard navigation unaffected

## Performance

- Efficient SVG rendering (inline, minimal DOM nodes)
- CSS-based animations (GPU-accelerated)
- No performance impact on step operations
- LocalStorage operations are minimal

## Browser Compatibility

- Chrome/Edge 88+ (Manifest V3 requirement)
- Modern browsers with ES6 module support
- CSS animations and SVG support required

## Future Enhancements

Potential improvements:
- More character options (girl, robot, animal)
- Customizable stone colors
- Sound effects for jumps
- Different animation styles
- Stone texture variations
- Alternative themes (bridge, clouds, lily pads)

## Troubleshooting

**Theme not showing:**
- Check console for errors
- Verify `ENABLE_PLAYFUL_THEME` is true
- Check if `stepping-stones-container` has `active` class

**Animation not playing:**
- Animation only triggers on forward progress (Continue)
- Going back doesn't animate
- Check `previousStepIndex` is being tracked

**localStorage not persisting:**
- Check browser privacy settings
- Verify localStorage is available
- Check console for errors

**Stones overlapping:**
- Designed for 3-10 steps typically
- More than 7 steps may require horizontal scroll
- Responsive design adjusts spacing

## Code Review Checklist

- [x] Feature flag properly configured
- [x] Theme toggle UI added
- [x] LocalStorage persistence implemented
- [x] Animation triggers correctly
- [x] Both themes work correctly
- [x] No visual glitches
- [x] Clean code, no console errors
- [x] CSS properly scoped
- [x] Responsive design tested

## Credits

Design inspired by playful UI patterns and gamification principles. Cartoon character designed to be friendly and encouraging for users following step-by-step procedures.
