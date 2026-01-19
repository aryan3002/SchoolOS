/**
 * Tab Layout
 *
 * Bottom tab navigation for parent app
 * - Home (Clarity Screen)
 * - Ask (AI Chat)
 * - Calendar
 * - Profile
 */

import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform, Text as RNText } from 'react-native';
import * as Haptics from 'expo-haptics';

// Tab icon component
function TabIcon({
  icon,
  label,
  focused,
}: {
  icon: string;
  label: string;
  focused: boolean;
}) {
  return (
    <View style={styles.tabItem}>
      <RNText style={{ fontSize: focused ? 26 : 24 }}>{icon}</RNText>
      <RNText
        style={[
          styles.tabLabel,
          {
            color: focused ? '#3D87CC' : '#9CA3AF',
            fontWeight: focused ? '600' : '400',
          },
        ]}
      >
        {label}
      </RNText>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E7EB',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 24 : 8,
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#3D87CC',
        tabBarInactiveTintColor: '#9CA3AF',
      }}
      screenListeners={{
        tabPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="🏠" label="Home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="ask"
        options={{
          title: 'Ask',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="💬" label="Ask" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="📅" label="Calendar" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="👤" label="Profile" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabLabel: {
    fontSize: 11,
  },
});
