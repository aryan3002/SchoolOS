/**
 * Status Components
 *
 * Progress indicators, badges, and status displays
 */

import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Text, Caption } from './Text';
import { useTheme } from '@/theme';

// Grade display
export interface GradeDisplayProps {
  grade: string | number;
  subject?: string;
  trend?: 'up' | 'down' | 'stable';
  previousGrade?: string | number;
  size?: 'small' | 'medium' | 'large';
}

export function GradeDisplay({
  grade,
  subject,
  trend,
  previousGrade,
  size = 'medium',
}: GradeDisplayProps) {
  const theme = useTheme();

  const getGradeColor = (g: string | number) => {
    const numGrade = typeof g === 'string' ? parseGrade(g) : g;
    if (numGrade >= 90) return theme.colors.success[500];
    if (numGrade >= 80) return theme.colors.primary[500];
    if (numGrade >= 70) return theme.colors.accent[600];
    if (numGrade >= 60) return theme.colors.warning[500];
    return theme.colors.error[500];
  };

  const parseGrade = (g: string): number => {
    const letterGrades: Record<string, number> = {
      'A+': 97, A: 93, 'A-': 90,
      'B+': 87, B: 83, 'B-': 80,
      'C+': 77, C: 73, 'C-': 70,
      'D+': 67, D: 63, 'D-': 60,
      F: 50,
    };
    return letterGrades[g.toUpperCase()] || parseInt(g, 10) || 0;
  };

  const sizeStyles = {
    small: { circle: 40, font: 'body' as const },
    medium: { circle: 56, font: 'h3' as const },
    large: { circle: 80, font: 'h1' as const },
  };

  const { circle, font } = sizeStyles[size];
  const gradeColor = getGradeColor(grade);

  const trendIcons = {
    up: '↑',
    down: '↓',
    stable: '→',
  };

  const trendColors = {
    up: theme.colors.success[500],
    down: theme.colors.error[500],
    stable: theme.colors.neutral[400],
  };

  return (
    <View style={styles.gradeContainer}>
      <View
        style={[
          styles.gradeCircle,
          {
            width: circle,
            height: circle,
            borderRadius: circle / 2,
            borderColor: gradeColor,
            borderWidth: 3,
          },
        ]}
      >
        <Text variant={font} color={gradeColor} style={{ fontWeight: '700' }}>
          {grade}
        </Text>
      </View>
      {subject && (
        <Text
          variant="bodySmall"
          color={theme.colors.text.secondary}
          style={styles.subject}
        >
          {subject}
        </Text>
      )}
      {trend && (
        <View style={styles.trendContainer}>
          <Text style={{ color: trendColors[trend], fontSize: 14 }}>
            {trendIcons[trend]}
          </Text>
          {previousGrade && (
            <Caption color={theme.colors.text.tertiary}>
              from {previousGrade}
            </Caption>
          )}
        </View>
      )}
    </View>
  );
}

// Progress bar
export interface ProgressBarProps {
  progress: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  color?: string;
  height?: number;
}

export function ProgressBar({
  progress,
  label,
  showPercentage = true,
  color,
  height = 8,
}: ProgressBarProps) {
  const theme = useTheme();
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const barColor = color || theme.colors.primary[500];

  return (
    <View style={styles.progressContainer}>
      {(label || showPercentage) && (
        <View style={styles.progressHeader}>
          {label && (
            <Text variant="bodySmall" color={theme.colors.text.secondary}>
              {label}
            </Text>
          )}
          {showPercentage && (
            <Text
              variant="bodySmall"
              color={theme.colors.text.primary}
              style={{ fontWeight: '600' }}
            >
              {Math.round(clampedProgress)}%
            </Text>
          )}
        </View>
      )}
      <View
        style={[
          styles.progressTrack,
          {
            height,
            backgroundColor: theme.colors.neutral[200],
          },
        ]}
      >
        <View
          style={[
            styles.progressFill,
            {
              width: `${clampedProgress}%`,
              backgroundColor: barColor,
            },
          ]}
        />
      </View>
    </View>
  );
}

// Attendance indicator
export interface AttendanceIndicatorProps {
  present: number;
  absent: number;
  tardy: number;
  total: number;
}

export function AttendanceIndicator({
  present,
  absent,
  tardy,
  total,
}: AttendanceIndicatorProps) {
  const theme = useTheme();
  const attendanceRate = total > 0 ? (present / total) * 100 : 0;

  return (
    <View style={styles.attendanceContainer}>
      <View style={styles.attendanceHeader}>
        <Text variant="h4" color={theme.colors.text.primary}>
          Attendance
        </Text>
        <Text
          variant="body"
          color={
            attendanceRate >= 95
              ? theme.colors.success[600]
              : attendanceRate >= 90
                ? theme.colors.warning[600]
                : theme.colors.error[600]
          }
          style={{ fontWeight: '600' }}
        >
          {attendanceRate.toFixed(1)}%
        </Text>
      </View>
      <View style={styles.attendanceRow}>
        <AttendanceStat
          label="Present"
          count={present}
          color={theme.colors.success[500]}
        />
        <AttendanceStat
          label="Absent"
          count={absent}
          color={theme.colors.error[500]}
        />
        <AttendanceStat
          label="Tardy"
          count={tardy}
          color={theme.colors.warning[500]}
        />
      </View>
    </View>
  );
}

function AttendanceStat({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  const theme = useTheme();

  return (
    <View style={styles.attendanceStat}>
      <View style={[styles.attendanceDot, { backgroundColor: color }]} />
      <Text variant="h4" color={theme.colors.text.primary}>
        {count}
      </Text>
      <Caption color={theme.colors.text.tertiary}>{label}</Caption>
    </View>
  );
}

// Badge
export interface BadgeProps {
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'small' | 'medium';
}

export function Badge({
  label,
  variant = 'default',
  size = 'medium',
}: BadgeProps) {
  const theme = useTheme();

  const variantStyles = {
    default: {
      bg: theme.colors.neutral[200],
      text: theme.colors.text.secondary,
    },
    success: {
      bg: theme.colors.success[100],
      text: theme.colors.success[700],
    },
    warning: {
      bg: theme.colors.warning[100],
      text: theme.colors.warning[700],
    },
    error: {
      bg: theme.colors.error[100],
      text: theme.colors.error[700],
    },
    info: {
      bg: theme.colors.info[100],
      text: theme.colors.info[700],
    },
  };

  const { bg, text } = variantStyles[variant];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bg,
          paddingVertical: size === 'small' ? 2 : 4,
          paddingHorizontal: size === 'small' ? 6 : 10,
        },
      ]}
    >
      <Text
        variant={size === 'small' ? 'caption' : 'bodySmall'}
        color={text}
        style={{ fontWeight: '600' }}
      >
        {label}
      </Text>
    </View>
  );
}

// Status dot
export interface StatusDotProps {
  status: 'online' | 'offline' | 'busy' | 'away';
  size?: number;
  showLabel?: boolean;
}

export function StatusDot({ status, size = 10, showLabel }: StatusDotProps) {
  const theme = useTheme();

  const statusColors = {
    online: theme.colors.success[500],
    offline: theme.colors.neutral[400],
    busy: theme.colors.error[500],
    away: theme.colors.warning[500],
  };

  const statusLabels = {
    online: 'Online',
    offline: 'Offline',
    busy: 'Busy',
    away: 'Away',
  };

  return (
    <View style={styles.statusDotContainer}>
      <View
        style={[
          styles.statusDot,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: statusColors[status],
          },
        ]}
      />
      {showLabel && (
        <Caption color={theme.colors.text.secondary}>
          {statusLabels[status]}
        </Caption>
      )}
    </View>
  );
}

// Loading skeleton
export interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
}

export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = 4,
}: SkeletonProps) {
  const theme = useTheme();
  const opacity = React.useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          backgroundColor: theme.colors.neutral[200],
          opacity,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  // Grade display
  gradeContainer: {
    alignItems: 'center',
  },
  gradeCircle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  subject: {
    marginTop: 4,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },

  // Progress bar
  progressContainer: {
    marginVertical: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressTrack: {
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },

  // Attendance
  attendanceContainer: {
    padding: 16,
  },
  attendanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  attendanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  attendanceStat: {
    alignItems: 'center',
    gap: 4,
  },
  attendanceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Badge
  badge: {
    borderRadius: 6,
    alignSelf: 'flex-start',
  },

  // Status dot
  statusDotContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {},

  // Skeleton
  skeleton: {},
});
