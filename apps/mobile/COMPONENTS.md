# Component Showcase & Code Examples

## 📱 Ready-to-Use Components

Here are the key components with usage examples:

### 1. Text Components

```typescript
import { Heading1, Heading2, BodyText, Caption } from '@/components/ui';

export function Example() {
  return (
    <>
      <Heading1>Page Title</Heading1>
      <Heading2>Section Header</Heading2>
      <BodyText>This is body text content</BodyText>
      <Caption>This is subtle helper text</Caption>
    </>
  );
}
```

**Features:**
- 8 typography variants
- Automatic color mapping
- Consistent sizing scale

---

### 2. Buttons

```typescript
import { Button } from '@/components/ui';

export function Example() {
  return (
    <View style={{ gap: 8 }}>
      {/* Primary Button */}
      <Button 
        variant="primary" 
        size="lg"
        onPress={() => console.log('clicked')}
      >
        Save
      </Button>

      {/* Secondary Button */}
      <Button 
        variant="secondary" 
        size="md"
        onPress={() => {}}
      >
        Cancel
      </Button>

      {/* Outline Button */}
      <Button 
        variant="outline" 
        onPress={() => {}}
      >
        Maybe Later
      </Button>

      {/* Danger Button */}
      <Button 
        variant="danger" 
        onPress={() => {}}
      >
        Delete
      </Button>
    </View>
  );
}
```

**Props:**
- `variant`: primary | secondary | outline | ghost | danger
- `size`: sm | md | lg
- `disabled`: boolean
- `isLoading`: boolean
- `onPress`: callback

---

### 3. Cards

```typescript
import { Card } from '@/components/ui';
import { Text } from '@/components/ui';

export function Example() {
  return (
    <>
      {/* Elevated Card */}
      <Card variant="elevated" padding="large">
        <Text variant="h4">Important Content</Text>
        <Text variant="body">This is highlighted content</Text>
      </Card>

      {/* Default Card */}
      <Card variant="default">
        <Text variant="body">Regular content card</Text>
      </Card>

      {/* Pressable Card */}
      <Card 
        variant="elevated" 
        onPress={() => router.push('/detail')}
      >
        <Text>Tap to navigate</Text>
      </Card>
    </>
  );
}
```

**Props:**
- `variant`: elevated | default
- `padding`: small | medium | large
- `onPress`: makes card pressable

---

### 4. Chat Bubble

```typescript
import { ChatBubble } from '@/components/ui';

export function Example() {
  return (
    <>
      {/* User Message */}
      <ChatBubble
        content="How is Emma doing in math?"
        role="user"
        timestamp={new Date()}
      />

      {/* AI Response with Citations */}
      <ChatBubble
        content="Emma is doing well! B+ (87%) with improvement in multiplication."
        role="assistant"
        timestamp={new Date()}
        citations={[
          { id: '1', title: 'Math Gradebook', source: 'Ms. Peterson' },
          { id: '2', title: 'Recent Test', source: 'March 6' },
        ]}
        followUpQuestions={[
          'What topics is she struggling with?',
          'When is her next test?',
        ]}
        confidenceScore={0.95}
        onCitationPress={(citation) => console.log(citation)}
      />
    </>
  );
}
```

**Features:**
- User vs AI styling
- Clickable citations
- Suggested follow-ups
- Confidence scores
- Typing indicators

---

### 5. Action Card

```typescript
import { ActionCard } from '@/components/ui';

export function Example() {
  const action = {
    id: '1',
    title: 'Permission Slip - Field Trip',
    description: 'Science museum visit on March 15th',
    urgency: 'high' as const,
    type: 'permission' as const,
    deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    quickActions: [
      { id: 'approve', label: 'Approve', variant: 'primary' as const },
      { id: 'deny', label: 'Deny', variant: 'outline' as const },
    ],
  };

  return (
    <ActionCard
      action={action}
      onPress={() => router.push(`/action/${action.id}`)}
      onQuickAction={(qaId) => {
        if (qaId === 'approve') {
          // Handle approval
        }
      }}
    />
  );
}
```

**Urgency Levels:**
- low (blue background)
- medium (yellow background)
- high (orange background)
- critical (red background)

**Action Types:**
- form, payment, permission, meeting, document, other

---

### 6. Child Switcher

```typescript
import { ChildSwitcher } from '@/components/ui';

export function Example() {
  const children = [
    {
      id: '1',
      firstName: 'Emma',
      lastName: 'Johnson',
      gradeLevel: '5th Grade',
      schoolName: 'Lincoln Elementary',
    },
    {
      id: '2',
      firstName: 'Lucas',
      lastName: 'Johnson',
      gradeLevel: '2nd Grade',
      schoolName: 'Lincoln Elementary',
    },
  ];

  const [selectedId, setSelectedId] = useState('1');

  return (
    <ChildSwitcher
      children={children}
      selectedChildId={selectedId}
      onSelectChild={setSelectedId}
    />
  );
}
```

**Features:**
- Horizontal scroll
- Visual selection state
- Avatar initials
- Grade level display

---

### 7. Text Input

```typescript
import { TextInput } from '@/components/ui';

export function Example() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  return (
    <>
      {/* Standard Input */}
      <TextInput
        label="Email"
        placeholder="your@email.com"
        value={email}
        onChangeText={setEmail}
        hint="We'll never share your email"
      />

      {/* Error State */}
      <TextInput
        label="Password"
        placeholder="Enter password"
        error="Password is required"
        secureTextEntry
      />

      {/* With Left Icon */}
      <TextInput
        label="Username"
        placeholder="@username"
        leftIcon={<Text>@</Text>}
      />
    </>
  );
}
```

---

### 8. Chat Input

```typescript
import { ChatInput } from '@/components/ui';

export function Example() {
  const [message, setMessage] = useState('');

  return (
    <ChatInput
      value={message}
      onChangeText={setMessage}
      onSend={() => {
        console.log('Sending:', message);
        setMessage('');
      }}
      placeholder="Ask anything about your child..."
      isLoading={false}
    />
  );
}
```

**Features:**
- Multi-line support
- Send button
- Loading state
- Haptic feedback
- Character limit (1000)

---

### 9. Grade Display

```typescript
import { GradeDisplay } from '@/components/ui';

export function Example() {
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      {/* Letter Grade */}
      <GradeDisplay
        grade="A"
        subject="Math"
        trend="up"
        previousGrade="B+"
        size="small"
      />

      {/* Percentage */}
      <GradeDisplay
        grade={87}
        subject="Science"
        trend="stable"
        size="medium"
      />

      {/* Large */}
      <GradeDisplay
        grade="B+"
        subject="Reading"
        trend="down"
        size="large"
      />
    </View>
  );
}
```

**Props:**
- `grade`: string or number
- `subject`: string
- `trend`: up | down | stable
- `size`: small | medium | large

---

### 10. Progress Bar

```typescript
import { ProgressBar } from '@/components/ui';

export function Example() {
  return (
    <>
      <ProgressBar
        progress={75}
        label="Assignment Completion"
        showPercentage
      />

      <ProgressBar
        progress={45}
        label="Quiz Average"
        color="#FFB800"
      />

      <ProgressBar
        progress={95}
        height={12}
      />
    </>
  );
}
```

---

### 11. Attendance Indicator

```typescript
import { AttendanceIndicator } from '@/components/ui';

export function Example() {
  return (
    <AttendanceIndicator
      present={45}
      absent={1}
      tardy={2}
      total={48}
    />
  );
}
```

**Shows:**
- Attendance rate percentage
- Present/Absent/Tardy breakdown
- Visual indicators

---

### 12. Badges

```typescript
import { Badge } from '@/components/ui';

export function Example() {
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      <Badge label="Default" />
      <Badge label="Success" variant="success" />
      <Badge label="Warning" variant="warning" />
      <Badge label="Error" variant="error" />
      <Badge label="Info" variant="info" size="small" />
    </View>
  );
}
```

---

## 🎨 Using the Theme

```typescript
import { useTheme } from '@/theme';
import { View } from 'react-native';
import { Text } from '@/components/ui';

export function Example() {
  const theme = useTheme();

  return (
    <View style={{ backgroundColor: theme.colors.background.primary }}>
      <Text color={theme.colors.primary[500]}>
        Primary Text
      </Text>

      <View
        style={{
          borderColor: theme.colors.neutral[200],
          borderRadius: theme.spacing.md,
          padding: theme.spacing.lg,
        }}
      >
        <Text>Themed content</Text>
      </View>
    </View>
  );
}
```

**Theme Object:**
```typescript
{
  colors: {
    primary: { 50, 100, 200, ..., 900 },
    accent: { ... },
    success: { ... },
    error: { ... },
    warning: { ... },
    info: { ... },
    neutral: { ... },
    text: { primary, secondary, tertiary, inverse },
    background: { primary, secondary },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    // ... more
  },
  typography: {
    h1, h2, h3, h4,
    body, bodySmall,
    caption, label,
  },
}
```

---

## 🏗️ Building Custom Components

### Example: Custom Card Component

```typescript
import { Card, Text, Button } from '@/components/ui';
import { useTheme } from '@/theme';

interface CustomCardProps {
  title: string;
  description: string;
  action: {
    label: string;
    onPress: () => void;
  };
}

export function CustomCard({
  title,
  description,
  action,
}: CustomCardProps) {
  const theme = useTheme();

  return (
    <Card variant="elevated" padding="large">
      <Text variant="h3" style={{ marginBottom: 8 }}>
        {title}
      </Text>
      
      <Text
        variant="body"
        color={theme.colors.text.secondary}
        style={{ marginBottom: 16 }}
      >
        {description}
      </Text>

      <Button
        variant="primary"
        size="sm"
        onPress={action.onPress}
      >
        {action.label}
      </Button>
    </Card>
  );
}
```

---

## 📚 Complete Screen Example

```typescript
import React, { useState } from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';
import {
  Text,
  Heading1,
  Button,
  Card,
  ChildSwitcher,
  ActionCard,
  GradeDisplay,
} from '@/components/ui';

export function ExampleScreen() {
  const theme = useTheme();
  const [selectedChild, setSelectedChild] = useState('1');

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: theme.colors.background.primary }}
    >
      <ScrollView style={{ flex: 1, padding: 20 }}>
        {/* Header */}
        <Heading1>Emma's Status</Heading1>

        {/* Child Switcher */}
        <ChildSwitcher
          children={mockChildren}
          selectedChildId={selectedChild}
          onSelectChild={setSelectedChild}
        />

        {/* Grades */}
        <View style={{ marginTop: 24 }}>
          <Text variant="h4">Current Grades</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
            <GradeDisplay grade="A" subject="Math" trend="up" />
            <GradeDisplay grade="B+" subject="Science" trend="stable" />
            <GradeDisplay grade="A-" subject="Reading" trend="up" />
          </View>
        </View>

        {/* Actions */}
        <View style={{ marginTop: 24 }}>
          <Text variant="h4">Pending Actions</Text>
          <ActionCard
            action={mockAction}
            onPress={() => {}}
            onQuickAction={() => {}}
            style={{ marginTop: 12 }}
          />
        </View>

        {/* Button */}
        <Button
          variant="primary"
          size="lg"
          style={{ marginTop: 24 }}
          onPress={() => console.log('Ask something')}
        >
          Ask About Emma
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}
```

---

## 🚀 Component Development Checklist

When creating a new component:

- [ ] Define TypeScript interfaces
- [ ] Use theme colors from `useTheme()`
- [ ] Add haptic feedback for interactions
- [ ] Support disabled state
- [ ] Add accessibility labels
- [ ] Test on different screen sizes
- [ ] Document with JSDoc
- [ ] Add to `components/ui/index.ts`
- [ ] Create usage example
- [ ] Add to ComponentGallery

---

**All components are fully typed and ready to use! 🎉**
