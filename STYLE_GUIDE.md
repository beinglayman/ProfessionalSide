# InChronicle Design System & Style Guide

## Overview
InChronicle follows a professional, modern design system built with TailwindCSS and Radix UI components. This guide documents the established patterns, components, and design principles used throughout the application.

## Color System

### Primary Colors
**Purple Theme (#5D259F)**
- `primary-50`: `#F3EBFC` - Lightest backgrounds
- `primary-100`: `#E7D7F9` - Light backgrounds, tags
- `primary-200`: `#CFAFF3` - Borders, dividers
- `primary-300`: `#B787ED` - Hover states
- `primary-400`: `#9F5FE7` - Active states
- `primary-500`: `#5D259F` - Primary brand color
- `primary-600`: `#4B1E80` - Hover on primary
- `primary-700`: `#391660` - Active on primary
- `primary-800`: `#270F40` - Deep emphasis
- `primary-900`: `#150720` - Darkest text

### Gray Colors
**Neutral Grays (#3C3C3C)**
- `gray-50`: `#F5F5F5` - Background surfaces
- `gray-100`: `#E6E6E6` - Light borders, secondary backgrounds
- `gray-200`: `#CCCCCC` - Borders, separators
- `gray-300`: `#B3B3B3` - Placeholder text, icons
- `gray-400`: `#999999` - Muted text
- `gray-500`: `#3C3C3C` - Body text
- `gray-600`: `#303030` - Headings
- `gray-700`: `#242424` - Dark text
- `gray-800`: `#181818` - Emphasis text
- `gray-900`: `#0C0C0C` - Darkest text

### Semantic Colors
**Status and Feedback**
- `green-*`: Success, completion, positive metrics
- `blue-*`: Information, links, workspace tags
- `yellow-*`: Warnings, pending states
- `red-*`: Errors, destructive actions
- `purple-*`: Features, skills, achievements
- `indigo-*`: Following connections
- `amber-*`: Discovery recommendations
- `orange-*`: Network notifications

## Typography

### Font Family
- **Primary**: Inter (sans-serif)
- **Fallback**: System UI fonts

### Text Scale
- `text-xs`: 12px - Captions, metadata
- `text-sm`: 14px - Body text, descriptions
- `text-base`: 16px - Default text size
- `text-lg`: 18px - Small headings, card titles
- `text-xl`: 20px - Section headings
- `text-2xl`: 24px - Page headings
- `text-3xl`: 30px - Main headlines

### Font Weights
- `font-normal`: 400 - Body text
- `font-medium`: 500 - Labels, captions
- `font-semibold`: 600 - Headings, emphasis
- `font-bold`: 700 - Strong emphasis

## Component Library

### Buttons
**Variants:**
- `default`: Primary purple (`bg-primary-500 text-white hover:bg-primary-600`)
- `secondary`: Gray background (`bg-gray-100 text-gray-900 hover:bg-gray-200`)
- `outline`: White with border (`border border-gray-200 bg-white hover:bg-gray-100`)
- `ghost`: Transparent (`hover:bg-gray-100 hover:text-gray-900`)

**Sizes:**
- `sm`: 32px height (`h-8 rounded-md px-3 text-xs`)
- `default`: 36px height (`h-9 px-4 py-2`)
- `lg`: 40px height (`h-10 rounded-md px-8`)
- `icon`: 36x36px square (`h-9 w-9`)

### Cards
**Standard Pattern:**
```css
.card {
  @apply rounded-lg border border-gray-200 bg-white shadow-sm;
  @apply transition-shadow hover:shadow-md;
}

.card-header {
  @apply p-6 pb-4;
}

.card-content {
  @apply px-6 pb-4;
}

.card-footer {
  @apply border-t px-6 py-3;
}
```

### Tags & Badges
**Skill Tags:**
- `bg-purple-50 text-purple-700` - Skills, expertise
- `bg-primary-100 text-primary-800` - Goals, achievements

**Status Badges:**
- `bg-green-100 text-green-700` - Published, completed
- `bg-gray-100 text-gray-600` - Private, workspace-only
- `bg-blue-100 text-blue-700` - Workspace names

**Connection Types:**
- `bg-blue-50 text-blue-700 border-blue-200` - Core Network
- `bg-purple-50 text-purple-700 border-purple-200` - Extended Network
- `bg-indigo-50 text-indigo-700 border-indigo-200` - Following
- `bg-amber-50 text-amber-700 border-amber-200` - Professional Discovery

### Form Elements
**Input Fields:**
```css
.input {
  @apply rounded-md border border-gray-300 bg-white px-3 py-2 text-sm;
  @apply focus:ring-2 focus:ring-primary-500 focus:ring-offset-2;
  @apply disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500;
}
```

**Tag Input:**
- Blue theme (`bg-blue-100 text-blue-800`)
- Removable with X button
- Dropdown suggestions with search

### Avatars
**Standard Pattern:**
- 48px (h-12 w-12) for profile headers
- 40px (h-10 w-10) for collaborators/reviewers  
- 32px (h-8 w-8) for mentions
- 24px (h-6 w-6) for team members

**Fallback:**
- Gradient background (`bg-gradient-to-br from-blue-500 to-purple-600`)
- White initials (`text-white font-semibold`)

### Navigation
**Header:**
- Sticky positioning (`sticky top-0 z-50`)
- Backdrop blur (`bg-white/80 backdrop-blur-md`)
- Underline indicators on active links

**Mobile Menu:**
- Animated hamburger icon
- Slide-down navigation
- Icon + text pattern for menu items

## Layout Patterns

### Spacing System
- `gap-1`: 4px - Tight element spacing
- `gap-2`: 8px - Related elements
- `gap-3`: 12px - Component spacing
- `gap-4`: 16px - Section spacing
- `gap-6`: 24px - Major sections
- `gap-8`: 32px - Page sections

### Responsive Breakpoints
- Mobile: < 768px
- Tablet: 768px - 1023px
- Desktop: 1024px+

### Container Widths
- `max-w-7xl`: Main content container
- `max-w-4xl`: Article/form content
- `max-w-md`: Modals, small forms

## Interaction States

### Hover Effects
- Buttons: Background color change + transition
- Cards: Shadow elevation (`hover:shadow-md`)
- Links: Color change (`hover:text-primary-600`)
- Interactive elements: Background tint (`hover:bg-gray-50`)

### Focus States
- Ring styling: `focus:ring-2 focus:ring-primary-500 focus:ring-offset-2`
- Outline removal: `focus:outline-none`

### Loading States
- Disabled opacity: `disabled:opacity-50`
- Pointer events: `disabled:pointer-events-none`

## Animation & Transitions

### Standard Transitions
- `transition-colors`: Color changes
- `transition-shadow`: Shadow changes
- `transition-transform`: Scale/transform changes
- `transition-all duration-200`: General interactions

### Custom Animations
**Fade In:**
```css
@keyframes fade-in {
  0% { opacity: 0; transform: translateY(10px); }
  100% { opacity: 1; transform: translateY(0); }
}
```

## Icon Guidelines

### Icon Library
- **Primary**: Lucide React icons
- **Size**: 16px (h-4 w-4), 20px (h-5 w-5), 24px (h-6 w-6)
- **Color**: Inherit from parent or semantic colors

### Icon Semantic Mapping
- `FileText`: Documents, journal entries
- `Users`: Collaborators, teams
- `Target`: Goals, achievements
- `Calendar`: Dates, scheduling
- `Building2`: Organizations, companies
- `Globe`: Published content
- `Shield`: Private/confidential content
- `Heart`: Appreciation, likes
- `MessageSquare`: Comments, discussions
- `RepeatIcon`: ReChronicle, sharing

## Content Guidelines

### Text Hierarchy
1. **Page Title**: `text-2xl font-semibold text-gray-900`
2. **Section Heading**: `text-lg font-semibold text-gray-900`
3. **Card Title**: `text-base font-medium text-gray-900`
4. **Body Text**: `text-sm text-gray-700`
5. **Caption**: `text-xs text-gray-500`

### Truncation Patterns
- Single line: `truncate`
- Multiple lines: `line-clamp-3`
- Responsive: Show full text on larger screens

## Accessibility Standards

### Color Contrast
- All text meets WCAG AA standards
- Interactive elements have sufficient contrast
- Focus indicators are clearly visible

### Keyboard Navigation
- Tab order follows logical flow
- All interactive elements are focusable
- Modal trapping implemented
- Escape key closes overlays

### Screen Reader Support
- Semantic HTML structure
- ARIA labels and descriptions
- Alt text for images
- Live regions for dynamic content

## Implementation Guidelines

### CSS Utility Classes
- Use Tailwind utilities over custom CSS
- Group related utilities logically
- Use `cn()` helper for conditional classes
- Maintain consistent spacing patterns

### Component Architecture
- Feature-based organization (`components/journal/`, `components/profile/`)
- Reusable UI components in `components/ui/`
- Props interface for customization
- Default values for optional props

### Performance Considerations
- Lazy load heavy components
- Optimize images and avatars  
- Use React.memo for expensive renders
- Implement proper key props for lists

## Best Practices

### Design Consistency
- Follow established color patterns
- Use consistent spacing throughout
- Maintain visual hierarchy
- Test on multiple screen sizes

### Code Maintainability
- Document complex UI logic
- Use TypeScript interfaces
- Follow naming conventions
- Keep components focused and small

### User Experience
- Provide loading states
- Show error messages clearly
- Maintain intuitive navigation
- Ensure responsive behavior