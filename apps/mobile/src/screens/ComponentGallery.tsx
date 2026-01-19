/**
 * Component Gallery - View all UI components
 * 
 * This file documents all available components with visual examples
 * To view: Create a separate route in app/ that imports this
 */

import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';
import {
  Text,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  BodyText,
  Caption,
  Label,
  Button,
  Card,
  TextInput,
  ChatInput,
  ChatBubble,
  ActionCard,
  ChildSwitcher,
  ChildChip,
  DaySummary,
  EventItem,
  GradeDisplay,
  ProgressBar,
  AttendanceIndicator,
  Badge,
  StatusDot,
} from '@/components/ui';

/**
 * COMPONENT GALLERY
 * 
 * This is a comprehensive visual guide to all UI components
 * To view this gallery, add a route in app/gallery.tsx:
 * 
 * import { ComponentGallery } from '@/screens/ComponentGallery';
 * export default ComponentGallery;
 */

export function ComponentGallery() {
  const theme = useTheme();

  const mockChild = {
    id: '1',
    firstName: 'Emma',
    lastName: 'Johnson',
    gradeLevel: '5th Grade',
    schoolName: 'Lincoln Elementary',
  };

  const mockChildren = [
    { ...mockChild, id: '1' },
    {
      ...mockChild,
      id: '2',
      firstName: 'Lucas',
      lastName: 'Johnson',
      gradeLevel: '2nd Grade',
    },
  ];

  const mockAction = {
    id: '1',
    title: 'Permission Slip - Field Trip',
    description: 'Science museum visit on March 15th requires parent signature',
    urgency: 'high' as const,
    type: 'permission' as const,
    childName: 'Emma',
    deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    quickActions: [
      { id: 'approve', label: 'Approve', variant: 'primary' as const },
      { id: 'deny', label: 'Deny', variant: 'outline' as const },
    ],
  };

  const mockEvent = {
    id: '1',
    title: 'Math Test',
    date: new Date(),
    startTime: '10:00 AM',
    type: 'class' as const,
    location: 'Room 204',
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background.primary }]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {/* Title */}
        <Heading1 color={theme.colors.primary[600]} style={styles.galleryTitle}>
          Component Gallery
        </Heading1>
        <Caption color={theme.colors.text.tertiary} style={styles.gallerySubtitle}>
          Visual guide to all SchoolOS UI components
        </Caption>

        {/* Typography Section */}
        <Section title="Typography">
          <Heading1>Heading 1 - 40px</Heading1>
          <Heading2>Heading 2 - 32px</Heading2>
          <Heading3>Heading 3 - 28px</Heading3>
          <Heading4>Heading 4 - 24px</Heading4>
          <BodyText>Body - 16px (default paragraph text)</BodyText>
          <Text variant="bodySmall">Body Small - 14px</Text>
          <Caption>Caption - 12px (subtle text)</Caption>
          <Label>Label - 12px bold (form labels)</Label>
        </Section>

        {/* Buttons Section */}
        <Section title="Buttons">
          <View style={styles.buttonGrid}>
            <Button variant="primary" onPress={() => {}}>
              Primary
            </Button>
            <Button variant="secondary" onPress={() => {}}>
              Secondary
            </Button>
            <Button variant="outline" onPress={() => {}}>
              Outline
            </Button>
            <Button variant="ghost" onPress={() => {}}>
              Ghost
            </Button>
            <Button variant="danger" onPress={() => {}}>
              Danger
            </Button>
          </View>

          <Text variant="h4" style={{ marginTop: 16, marginBottom: 8 }}>
            Sizes
          </Text>
          <View style={styles.buttonGrid}>
            <Button size="sm" onPress={() {}}>
              Small
            </Button>
            <Button size="md" onPress={() {}}>
              Medium
            </Button>
            <Button size="lg" onPress={() {}}>
              Large
            </Button>
          </View>
        </Section>

        {/* Cards Section */}
        <Section title="Cards">
          <Card variant="elevated" padding="large">
            <Text variant="body">Elevated Card with large padding</Text>
            <Caption style={{ marginTop: 8 }}>
              Used for important content
            </Caption>
          </Card>

          <Card variant="default" style={{ marginTop: 12 }}>
            <Text variant="body">Default Card</Text>
            <Caption style={{ marginTop: 8 }}>Used for lists and content</Caption>
          </Card>
        </Section>

        {/* Input Section */}
        <Section title="Input Fields">
          <TextInput
            label="Standard Input"
            placeholder="Enter text..."
            hint="Helper text appears here"
          />
          <TextInput
            label="With Error"
            placeholder="Invalid input"
            error="This field is required"
          />
        </Section>

        {/* Status Components */}
        <Section title="Status & Progress">
          <Text variant="h4" style={styles.sectionSubtitle}>
            Grades
          </Text>
          <View style={styles.gradeRow}>
            <GradeDisplay grade="A" subject="Math" trend="up" size="small" />
            <GradeDisplay grade="B+" subject="Science" trend="stable" size="small" />
            <GradeDisplay grade="A-" subject="Reading" trend="up" size="small" />
          </View>

          <Text variant="h4" style={styles.sectionSubtitle}>
            Progress Bar
          </Text>
          <ProgressBar progress={75} label="Assignment Completion" />
          <ProgressBar progress={45} label="Quiz Average" color={theme.colors.warning[500]} />

          <Text variant="h4" style={styles.sectionSubtitle}>
            Attendance
          </Text>
          <Card variant="elevated">
            <AttendanceIndicator present={45} absent={1} tardy={2} total={48} />
          </Card>

          <Text variant="h4" style={styles.sectionSubtitle}>
            Badges
          </Text>
          <View style={styles.badgeRow}>
            <Badge label="Default" />
            <Badge label="Success" variant="success" />
            <Badge label="Warning" variant="warning" />
            <Badge label="Error" variant="error" />
          </View>

          <Text variant="h4" style={styles.sectionSubtitle}>
            Status Dots
          </Text>
          <View style={styles.statusRow}>
            <StatusDot status="online" showLabel />
            <StatusDot status="offline" showLabel />
            <StatusDot status="busy" showLabel />
            <StatusDot status="away" showLabel />
          </View>
        </Section>

        {/* Chat Components */}
        <Section title="Chat Components">
          <Text variant="h4" style={styles.sectionSubtitle}>
            User Message
          </Text>
          <ChatBubble
            content="How is Emma doing in math?"
            role="user"
            timestamp={new Date()}
          />

          <Text variant="h4" style={[styles.sectionSubtitle, { marginTop: 16 }]}>
            Assistant Message (with Citations)
          </Text>
          <ChatBubble
            content="Emma is doing well in math! Her current grade is a B+ (87%). She's shown improvement in her multiplication facts."
            role="assistant"
            timestamp={new Date()}
            citations={[
              { id: '1', title: 'Math Gradebook', source: 'Ms. Peterson' },
              { id: '2', title: 'Recent Test', source: 'March 6, 2024' },
            ]}
            followUpQuestions={[
              'What topics is she struggling with?',
              'When is her next math test?',
            ]}
            confidenceScore={0.95}
          />
        </Section>

        {/* Action Cards */}
        <Section title="Action Cards">
          <ActionCard
            action={mockAction}
            onPress={() => {}}
            onQuickAction={() => {}}
          />
        </Section>

        {/* Child Switcher */}
        <Section title="Child Switcher">
          <Text variant="h4" style={styles.sectionSubtitle}>
            Full Switcher
          </Text>
          <ChildSwitcher
            children={mockChildren}
            selectedChildId="1"
            onSelectChild={() => {}}
          />

          <Text variant="h4" style={styles.sectionSubtitle}>
            Chip Variant
          </Text>
          <View style={{ gap: 8 }}>
            <ChildChip child={mockChild} />
            <ChildChip child={mockChildren[1]} />
          </View>
        </Section>

        {/* Calendar Components */}
        <Section title="Calendar Components">
          <Text variant="h4" style={styles.sectionSubtitle}>
            Event Item
          </Text>
          <EventItem
            event={mockEvent}
            onPress={() => {}}
            compact
          />

          <EventItem
            event={mockEvent}
            onPress={() => {}}
            compact={false}
            style={{ marginTop: 12 }}
          />
        </Section>

        {/* Colors Palette */}
        <Section title="Color Palette">
          <View style={styles.colorGrid}>
            <ColorSwatch
              name="Primary"
              color={theme.colors.primary[500]}
            />
            <ColorSwatch
              name="Accent"
              color={theme.colors.accent[500]}
            />
            <ColorSwatch
              name="Success"
              color={theme.colors.success[500]}
            />
            <ColorSwatch
              name="Error"
              color={theme.colors.error[500]}
            />
            <ColorSwatch
              name="Warning"
              color={theme.colors.warning[500]}
            />
            <ColorSwatch
              name="Info"
              color={theme.colors.info[500]}
            />
          </View>
        </Section>

        {/* Spacing Reference */}
        <Section title="Spacing Scale">
          <Text variant="bodySmall" color={theme.colors.text.tertiary}>
            Base unit: 4px
          </Text>
          {[4, 8, 12, 16, 20, 24, 32, 40, 48].map((size) => (
            <View
              key={size}
              style={{
                height: size,
                backgroundColor: theme.colors.primary[500],
                marginVertical: 4,
                borderRadius: 4,
              }}
            >
              <Text variant="caption" color={theme.colors.text.inverse}>
                {size}px
              </Text>
            </View>
          ))}
        </Section>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// Helper Components
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();

  return (
    <View style={styles.section}>
      <Heading3 color={theme.colors.primary[600]} style={styles.sectionTitle}>
        {title}
      </Heading3>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

function ColorSwatch({
  name,
  color,
}: {
  name: string;
  color: string;
}) {
  const theme = useTheme();

  return (
    <View style={styles.colorSwatch}>
      <View
        style={[styles.colorBox, { backgroundColor: color }]}
      />
      <Text variant="caption" color={theme.colors.text.secondary}>
        {name}
      </Text>
      <Text variant="caption" color={theme.colors.text.tertiary}>
        {color}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  galleryTitle: {
    marginBottom: 4,
  },
  gallerySubtitle: {
    marginBottom: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  sectionSubtitle: {
    marginBottom: 8,
    marginTop: 16,
    fontSize: 16,
  },
  sectionContent: {
    gap: 8,
  },
  buttonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gradeRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusRow: {
    flexDirection: 'row',
    gap: 16,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorSwatch: {
    flex: 1,
    minWidth: '30%',
    alignItems: 'center',
  },
  colorBox: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginBottom: 8,
  },
});

export default ComponentGallery;
