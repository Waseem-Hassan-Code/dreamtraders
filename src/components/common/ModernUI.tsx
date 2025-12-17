import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { shadows, borderRadius } from '@/utils/theme';

const { width } = Dimensions.get('window');

interface ModernCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  theme: any;
  onPress?: () => void;
  animated?: boolean;
  delay?: number;
}

export const ModernCard: React.FC<ModernCardProps> = ({
  children,
  style,
  theme,
  onPress,
  animated = false,
  delay = 0,
}) => {
  const fadeAnim = useRef(new Animated.Value(animated ? 0 : 1)).current;
  const scaleAnim = useRef(new Animated.Value(animated ? 0.95 : 1)).current;

  useEffect(() => {
    if (animated) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          delay,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          delay,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, []);

  const cardContent = (
    <Animated.View
      style={[
        styles.modernCard,
        {
          backgroundColor: theme.card,
          borderColor: theme.borderLight,
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
        shadows.small,
        style,
      ]}
    >
      {children}
    </Animated.View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
        {cardContent}
      </TouchableOpacity>
    );
  }

  return cardContent;
};

interface GradientButtonProps {
  title: string;
  icon?: string;
  colors: string[];
  onPress: () => void;
  style?: ViewStyle;
  disabled?: boolean;
}

export const GradientButton: React.FC<GradientButtonProps> = ({
  title,
  icon,
  colors,
  onPress,
  style,
  disabled = false,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={0.9}
    >
      <Animated.View
        style={[
          { transform: [{ scale: scaleAnim }], opacity: disabled ? 0.6 : 1 },
          style,
        ]}
      >
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientButton}
        >
          {icon && <Icon name={icon} size={20} color="#fff" />}
          <Text style={styles.gradientButtonText}>{title}</Text>
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
};

interface StatCardProps {
  icon: string;
  value: string | number;
  label: string;
  color: string;
  theme: any;
  onPress?: () => void;
  animated?: boolean;
  delay?: number;
}

export const StatCard: React.FC<StatCardProps> = ({
  icon,
  value,
  label,
  color,
  theme,
  onPress,
  animated = true,
  delay = 0,
}) => {
  const fadeAnim = useRef(new Animated.Value(animated ? 0 : 1)).current;
  const translateY = useRef(new Animated.Value(animated ? 20 : 0)).current;

  useEffect(() => {
    if (animated) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 400,
          delay,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, []);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} disabled={!onPress}>
      <Animated.View
        style={[
          styles.statCard,
          {
            backgroundColor: theme.card,
            borderColor: theme.borderLight,
            opacity: fadeAnim,
            transform: [{ translateY }],
          },
          shadows.small,
        ]}
      >
        <View
          style={[styles.statIconContainer, { backgroundColor: color + '15' }]}
        >
          <Icon name={icon} size={24} color={color} />
        </View>
        <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
        <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
          {label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

interface BadgeProps {
  text: string;
  color: string;
  backgroundColor?: string;
  icon?: string;
  size?: 'small' | 'medium' | 'large';
}

export const Badge: React.FC<BadgeProps> = ({
  text,
  color,
  backgroundColor,
  icon,
  size = 'medium',
}) => {
  const sizeStyles = {
    small: { paddingHorizontal: 6, paddingVertical: 2, fontSize: 10 },
    medium: { paddingHorizontal: 10, paddingVertical: 4, fontSize: 12 },
    large: { paddingHorizontal: 14, paddingVertical: 6, fontSize: 14 },
  };

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: backgroundColor || color + '15',
          paddingHorizontal: sizeStyles[size].paddingHorizontal,
          paddingVertical: sizeStyles[size].paddingVertical,
        },
      ]}
    >
      {icon && (
        <Icon
          name={icon}
          size={sizeStyles[size].fontSize}
          color={color}
          style={{ marginRight: 4 }}
        />
      )}
      <Text
        style={[
          styles.badgeText,
          { color, fontSize: sizeStyles[size].fontSize },
        ]}
      >
        {text}
      </Text>
    </View>
  );
};

interface AvatarProps {
  name: string;
  size?: number;
  color: string;
  backgroundColor?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  size = 48,
  color,
  backgroundColor,
}) => {
  const initial = name.charAt(0).toUpperCase();

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 3,
          backgroundColor: backgroundColor || color + '15',
        },
      ]}
    >
      <Text style={[styles.avatarText, { color, fontSize: size / 2.5 }]}>
        {initial}
      </Text>
    </View>
  );
};

interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle: string;
  actionText?: string;
  onAction?: () => void;
  theme: any;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  subtitle,
  actionText,
  onAction,
  theme,
}) => {
  return (
    <View style={styles.emptyState}>
      <View
        style={[
          styles.emptyIconContainer,
          { backgroundColor: theme.primary + '15' },
        ]}
      >
        <Icon name={icon} size={48} color={theme.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
        {subtitle}
      </Text>
      {actionText && onAction && (
        <TouchableOpacity
          style={[styles.emptyActionButton, { backgroundColor: theme.primary }]}
          onPress={onAction}
          activeOpacity={0.8}
        >
          <Text style={styles.emptyActionText}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

interface SectionHeaderProps {
  title: string;
  icon?: string;
  iconColor?: string;
  rightElement?: React.ReactNode;
  theme: any;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  icon,
  iconColor,
  rightElement,
  theme,
}) => {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        {icon && (
          <Icon name={icon} size={22} color={iconColor || theme.primary} />
        )}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {title}
        </Text>
      </View>
      {rightElement}
    </View>
  );
};

interface FloatingActionButtonProps {
  icon: string;
  onPress: () => void;
  color: string;
  size?: number;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  icon,
  onPress,
  color,
  size = 56,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.9}
      style={styles.fabContainer}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <LinearGradient
          colors={[color, adjustColor(color, -20)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.fab,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
            shadows.medium,
          ]}
        >
          <Icon name={icon} size={size * 0.5} color="#fff" />
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
};

// Helper function to adjust color brightness
const adjustColor = (color: string, amount: number): string => {
  const clamp = (val: number) => Math.min(255, Math.max(0, val));

  let hex = color.replace('#', '');
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map(c => c + c)
      .join('');
  }

  const num = parseInt(hex, 16);
  const r = clamp((num >> 16) + amount);
  const g = clamp(((num >> 8) & 0x00ff) + amount);
  const b = clamp((num & 0x0000ff) + amount);

  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
};

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  theme: any;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Search...',
  theme,
}) => {
  return (
    <View
      style={[
        styles.searchBar,
        { backgroundColor: theme.card, borderColor: theme.borderLight },
        shadows.small,
      ]}
    >
      <Icon name="magnify" size={22} color={theme.textTertiary} />
      <Text
        style={[styles.searchInput, { color: theme.text }]}
        numberOfLines={1}
      >
        {value || placeholder}
      </Text>
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChangeText('')}>
          <Icon name="close-circle" size={18} color={theme.textTertiary} />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  modernCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  gradientButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  statCard: {
    width: (width - 48) / 2,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
  },
  badgeText: {
    fontWeight: '600',
  },
  avatar: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyActionButton: {
    marginTop: 24,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
  },
  emptyActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 24,
    right: 24,
  },
  fab: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 8,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
});
