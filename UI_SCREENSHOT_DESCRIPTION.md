# UI Screenshot Description - Chat-Based Flow

Since automated screenshots are not available in this environment, this document provides a detailed description of what the new chat-based UI looks like.

## Overall Layout

The side panel is a **380px wide × 600px tall** vertical layout with three main sections:

### 1. Header (Top, Fixed)
```
┌─────────────────────────────────────┐
│ 💬 Stepper Assistant    [🎨] [↺]  │  ← Light gray background
└─────────────────────────────────────┘
```
- **Left**: "💬 Stepper Assistant" title in bold
- **Right**: Two icon buttons:
  - 🎨 Theme toggle button (white background, gray border)
  - ↺ Reset button (white background, gray border)
- **Below title** (when stepping): Stepping stones progress indicator
  - Only visible when an article is in progress
  - Shows cartoon boy jumping across colored stepping stones
  - Blue stones = completed, Green = current, Gray = upcoming

### 2. Messages Area (Middle, Scrollable)
```
┌─────────────────────────────────────┐
│ Assistant                           │
│ ┌─────────────────────────────────┐ │  ← Gray bubble, left-aligned
│ │ Hello! I'm here to help you     │ │
│ │ troubleshoot issues step by     │ │
│ │ step. What problem are you      │ │
│ │ experiencing?                    │ │
│ └─────────────────────────────────┘ │
│                                     │
│                            You      │
│ ┌─────────────────────────────────┐ │  ← Light blue bubble, right-aligned
│ │ Email not sending               │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Assistant                           │
│ ┌─────────────────────────────────┐ │
│ │ I found 2 possible solutions.   │ │
│ │ Please select:                  │ │
│ │                                 │ │
│ │ ┌─ Card ─────────────────────┐ │ │
│ │ │ Email Not Sending - Gmail   │ │ │  ← Hoverable white cards
│ │ │ Troubleshoot Gmail delivery │ │ │     with border
│ │ └─────────────────────────────┘ │ │
│ │ ┌─ Card ─────────────────────┐ │ │
│ │ │ Email Not Sending - Outlook │ │ │
│ │ │ Troubleshoot Outlook issues │ │ │
│ │ └─────────────────────────────┘ │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Assistant                           │
│ ┌─────────────────────────────────┐ │
│ │ Step 1 of 6:                    │ │
│ │                                 │ │
│ │ Check the outbox for stuck      │ │
│ │ emails                          │ │
│ │                                 │ │
│ │ ┌─ Expected Outcome ──────────┐ │ │  ← Light blue box
│ │ │ Outbox should be empty or   │ │ │     with blue left border
│ │ │ show pending emails         │ │ │
│ │ └─────────────────────────────┘ │ │
│ │                                 │ │
│ │ [Continue →] [This didn't work] │ │  ← Action buttons
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

### 3. Input Area (Bottom, Fixed)
```
┌─────────────────────────────────────┐
│ [Describe the issue...      ] [Send]│  ← Light gray background
└─────────────────────────────────────┘
```
- Text input field (flexible width)
- "Send" button (blue, primary color)

## Visual Design Details

### Colors & Theme
- **Background**: White
- **Surface (header/footer)**: Light gray (#f8f9fa)
- **Primary**: Blue (#0066cc)
- **Borders**: Light gray (#dee2e6)
- **Agent messages**: Light blue background (#e3f2fd)
- **Assistant messages**: Light gray background (#f8f9fa)

### Typography
- **Font**: System fonts (San Francisco, Segoe UI, Roboto)
- **Header title**: 18px, bold
- **Message text**: 14px, regular
- **Button text**: 13px, medium weight
- **Small labels**: 12px

### Animations
1. **Message appearance**: Slide in from below with fade (0.3s)
2. **Typing indicator**: Three dots bouncing up and down
3. **Stepping stones**: Boy jumps across stones when Continue is clicked
4. **Card hover**: Slight translate right and border color change

### Interactive Elements

#### Article Cards
- White background
- 1px gray border
- Rounded corners
- On hover:
  - Border becomes blue
  - Background becomes very light blue
  - Slight translate right (4px)
  - Cursor pointer

#### Buttons
- **Continue**: Blue background, white text, rounded
- **Back**: Gray background, white text (only shown after step 1)
- **This didn't work**: Yellow/warning background, dark text
- **Send**: Blue background, white text

#### Stepping Stones
- Horizontal row of circular stones
- Boy character (simple cartoon) positioned on current stone
- **Completed stones**: Blue (#4a90e2)
- **Current stone**: Green (#5cb85c) with boy on top
- **Upcoming stones**: Faded gray (#e8e8e8)
- **Animation**: Boy jumps up and forward (0.4s cubic-bezier)

### Spacing & Layout
- **Panel width**: 380px (optimized for Chrome side panel)
- **Header height**: ~70px (more when stepping stones visible)
- **Input area height**: ~60px
- **Message padding**: 12px
- **Gap between messages**: 12px
- **Card padding**: 12px
- **Button padding**: 8px horizontal, 12px vertical

## Interaction Flow Visualization

### Step 1: Initial State
```
[Header: Stepper Assistant]
┌─ Assistant ────────────┐
│ Hello! I'm here to    │
│ help...               │
└───────────────────────┘
[Input: Describe the issue...]
```

### Step 2: User Types
```
[Header: Stepper Assistant]
┌─ Assistant ────────────┐
│ Hello! I'm here...    │
└───────────────────────┘
        ┌─ You ─────────┐
        │ Email not    │
        │ sending      │
        └──────────────┘
[Input: [disabled]]
```

### Step 3: Assistant Typing
```
[Header: Stepper Assistant]
...previous messages...
┌─ Assistant ────────────┐
│ ...                   │  ← Three animated dots
└───────────────────────┘
[Input: [disabled]]
```

### Step 4: Article Selection
```
[Header: Stepper Assistant]
...previous messages...
┌─ Assistant ────────────┐
│ I found 2 solutions:  │
│ [Card: Gmail]         │
│ [Card: Outlook]       │
└───────────────────────┘
[Input: [disabled]]
```

### Step 5: In Progress (Stepping Stones Visible)
```
[Header: Stepper Assistant]
[Stepping Stones: ● ● ○ ○ ○ ○]
                  └──👦
...previous messages...
┌─ Assistant ────────────┐
│ Step 1 of 6:          │
│ Check the outbox...   │
│ [Expected Outcome]    │
│ [Continue →]          │
│ [This didn't work]    │
└───────────────────────┘
[Input: [disabled]]
```

### Step 6: Completion
```
[Header: Stepper Assistant]
(Stepping stones hidden)
...all steps shown...
┌─ Assistant ────────────┐
│ ✅ Process complete!  │
│ You completed all     │
│ steps successfully!   │
└───────────────────────┘
[Input: Describe another issue...]
```

## Comparison with Old UI

### Old UI (List-based)
- Article list view with all articles visible
- Search box at top
- Separate step view with card layout
- Say-to-customer collapsible sections
- Full article view toggle
- Complex multi-view navigation

### New UI (Chat-based)
- Chat conversation layout
- One message at a time, chronological
- Articles as selectable cards in chat
- No say-to-customer (removed)
- Steps appear inline in chat
- Simple single-view design
- Stepping stones in header for progress

## Accessibility

- Proper semantic HTML (header, buttons, inputs)
- Focus states on interactive elements
- Keyboard navigation (Enter to send, Escape to close modals)
- Clear visual hierarchy
- High contrast text
- Animated elements can be disabled via theme toggle

## Responsive Behavior

- Fixed 380px width (side panel standard)
- Messages scroll vertically
- Long text wraps within bubbles (max 85% width)
- Buttons stack when needed
- Stepping stones scroll horizontally if many steps (>7)
