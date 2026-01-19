# SchoolOS Mobile App - Preview & Setup Guide

## 🚀 Quick Start

### Option 1: Using Expo Go (Easiest - Recommended)

```bash
cd apps/mobile
npm install
npm start
```

Then:
- **iOS**: Open Camera app and scan the QR code
- **Android**: Open Expo Go app and scan the QR code
- **Web**: Press `w` in terminal for web preview

### Option 2: iOS Simulator (Mac)

```bash
cd apps/mobile
npm install
npm start
# Press 'i' in terminal
```

### Option 3: Android Emulator

```bash
cd apps/mobile
npm install
npm start
# Press 'a' in terminal
```

---

## 📱 What You'll See

### Home Screen (Clarity Screen)
- **"What matters for MY child today"**
- Zero scrolling - all critical info above the fold
- Greeting and child switcher
- AI Ask entry point (prominent button)
- Action items that need attention (permissions, payments)
- Today's events and quick stats
- GPA, attendance, upcoming tests

### Ask Tab (AI Chat)
- Conversation with Emma about school
- AI responses with source citations
- Clickable citation chips showing where info came from
- Suggested follow-up questions
- Typing indicator animation
- Full conversation history

### Calendar Tab
- Month view selector
- Week view with event indicators
- Events color-coded by type:
  - 🏫 School events (primary blue)
  - 📚 Class items (info color)
  - 👥 Meetings (accent color)
  - ⏰ Deadlines (error color)
  - 🎉 Holidays (success color)
- Event details with location and description

### Profile Tab
- Child's avatar and info
- **Attendance**: Present/Absent/Tardy breakdown
- **Current Grades**: All subjects with trends
- **Upcoming Assignments**: Due dates
- **Recently Graded**: Latest submissions
- Quick links: Message Teacher, Report Card, etc.

---

## 🎨 Design System Features

✅ **Color Palette**
- Primary: Serene blue (#3D87CC)
- Accent: Warm amber (#FFB800)
- Success: Green (#4CAF50)
- Error: Red (#EF4444)
- Warm grays (not cold)

✅ **Typography**
- Generous sizing for 40+ parents
- System fonts (Inter/SF Pro)
- Clear hierarchy

✅ **Spacing & Layout**
- 4px base unit
- Touch targets: 44px minimum
- Tab bar: 84px height (iOS safe)

✅ **Interactions**
- Haptic feedback on all interactions
- Smooth animations
- Keyboard handling
- Gesture support

---

## 🔧 Development

### Project Structure

```
apps/mobile/
├── app/                          # Expo Router navigation
│   ├── _layout.tsx              # Root layout with providers
│   ├── (tabs)/                  # Tab navigation
│   │   ├── _layout.tsx
│   │   ├── index.tsx            # Home
│   │   ├── ask.tsx              # Chat
│   │   ├── calendar.tsx
│   │   └── profile.tsx
│   └── chat.tsx                 # Modal chat route
├── src/
│   ├── components/
│   │   └── ui/                  # Reusable UI components
│   │       ├── Text.tsx
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       ├── ChatBubble.tsx
│   │       ├── ActionCard.tsx
│   │       ├── ChildSwitcher.tsx
│   │       ├── Input.tsx
│   │       ├── Calendar.tsx
│   │       ├── Status.tsx
│   │       └── index.ts
│   ├── screens/                 # Full screens
│   │   ├── HomeScreen.tsx
│   │   ├── ChatScreen.tsx
│   │   ├── CalendarScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   └── index.ts
│   ├── hooks/                   # React Query hooks
│   │   ├── useConversation.ts
│   │   ├── useChildren.ts
│   │   ├── useCalendar.ts
│   │   ├── useActions.ts
│   │   └── index.ts
│   ├── store/                   # Zustand state
│   │   ├── appStore.ts
│   │   └── index.ts
│   └── theme/                   # Design system
│       ├── colors.ts
│       ├── typography.ts
│       ├── spacing.ts
│       └── index.ts
├── app.json                     # Expo config
├── tsconfig.json
└── package.json
```

### Tech Stack
- **React Native** with Expo
- **Expo Router** for navigation (file-based)
- **React Query** for server state
- **Zustand** for app state
- **TypeScript** for type safety

---

## 🔗 API Integration

The app includes fully-typed React Query hooks that connect to:

- **Chat API** (`POST /chat/message`) - AI responses
- **Student API** (`GET /students/:id`) - Grades, assignments
- **Calendar API** (`GET /calendar/events`) - Events
- **Actions API** (`GET /actions`) - Permissions, payments

Environment variable:
```
EXPO_PUBLIC_API_URL=http://localhost:3001/api
```

---

## ✨ Key Features Implemented

### 1. AI-First Architecture
- Conversation replaces navigation
- Natural language QA about student
- Every answer shows sources

### 2. Parent-Centric Design
- "Clarity screen" - not another dashboard
- Zero scrolling for critical info
- One-tap child switcher

### 3. Real-Time Features
- Haptic feedback on every action
- Smooth animations
- Typing indicators
- Progressive disclosure of complexity

### 4. Accessibility
- WCAG 2.1 AA minimum
- Large touch targets (44px)
- High contrast colors
- Clear typography

### 5. Performance
- Lazy loading screens
- Optimized animations
- Efficient re-renders
- Query caching

---

## 📊 Performance Targets

- ⚡ Home screen: <1s load
- ⚡ AI response: <3s for simple queries
- ⚡ Navigation: <100ms transitions

---

## 🐛 Troubleshooting

### Port 8081 already in use
```bash
lsof -ti:8081 | xargs kill -9
```

### Clear cache
```bash
cd apps/mobile
rm -rf .expo
npx expo start --clear
```

### Reset node_modules
```bash
cd apps/mobile
rm -rf node_modules
npm install
```

### TypeScript errors
```bash
npm run typecheck
```

---

## 🎯 Next Steps

1. **Connect to Backend**
   - Update `EXPO_PUBLIC_API_URL` to your API
   - Implement auth with tokens

2. **Add Real Data**
   - Connect to your student database
   - Integrate calendar service
   - Connect to AI orchestrator

3. **Deploy**
   - Build APK for Android
   - Build IPA for iOS
   - Submit to App Store / Play Store

---

## 📚 Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Docs](https://reactnative.dev/)
- [Expo Router](https://docs.expo.dev/routing/introduction/)
- [React Query](https://tanstack.com/query/latest)
- [Zustand](https://github.com/pmndrs/zustand)

---

**Happy coding! 🚀**
