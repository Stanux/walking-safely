/**
 * HamburgerMenu
 * Floating hamburger menu with slide-out drawer
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { tokens } from '@/shared/theme/tokens';
import { useTheme } from '@/shared/theme/ThemeProvider';
import { logoutUseCase } from '@/features/auth/domain/useCases/logoutUseCase';
import { useAuthStore } from '@/features/auth/store/authStore';
import { Button } from '@/shared/components/Button';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MENU_WIDTH = SCREEN_WIDTH * 0.75;

interface MenuItem {
  id: string;
  icon: string;
  label: string;
  onPress?: () => void;
  danger?: boolean;
}

interface HamburgerMenuProps {
  style?: object;
}

export const HamburgerMenu: React.FC<HamburgerMenuProps> = ({ style }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [isOpen, setIsOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const slideAnim = useRef(new Animated.Value(-MENU_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  const user = useAuthStore(state => state.user);
  const firstName = user?.name?.split(' ')[0] || 'Usuário';

  const openMenu = () => {
    setIsOpen(true);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeMenu = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -MENU_WIDTH,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsOpen(false);
    });
  };

  const handleLogout = () => {
    closeMenu();
    setTimeout(() => {
      setShowLogoutConfirm(true);
    }, 300);
  };

  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
    try {
      await logoutUseCase();
    } catch (error) {
      console.warn('[HamburgerMenu] Logout error:', error);
    }
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const handleMenuItemPress = (item: MenuItem) => {
    if (item.id === 'logout') {
      handleLogout();
    } else {
      closeMenu();
      // Placeholder para futuras funcionalidades - sem alert
    }
  };

  const menuItems: MenuItem[] = [
    { id: 'notifications', icon: '🔔', label: 'Notificações' },
    { id: 'settings', icon: '⚙️', label: 'Configurações' },
    { id: 'help', icon: '❓', label: 'Ajuda' },
    { id: 'logout', icon: '🚪', label: 'Sair', danger: true },
  ];

  return (
    <>
      {/* Hamburger Button */}
      <TouchableOpacity
        style={[
          styles.hamburgerButton,
          { backgroundColor: isDark ? tokens.colors.surface.dark : tokens.colors.background.light },
          style,
        ]}
        onPress={openMenu}
        accessibilityLabel="Abrir menu"
        accessibilityRole="button"
      >
        <View style={styles.hamburgerLines}>
          <View style={[styles.hamburgerLine, { backgroundColor: isDark ? '#fff' : '#333' }]} />
          <View style={[styles.hamburgerLine, { backgroundColor: isDark ? '#fff' : '#333' }]} />
          <View style={[styles.hamburgerLine, { backgroundColor: isDark ? '#fff' : '#333' }]} />
        </View>
      </TouchableOpacity>

      {/* Menu Modal */}
      <Modal
        visible={isOpen}
        transparent
        animationType="none"
        onRequestClose={closeMenu}
      >
        <View style={styles.modalContainer}>
          {/* Backdrop */}
          <TouchableWithoutFeedback onPress={closeMenu}>
            <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
          </TouchableWithoutFeedback>

          {/* Menu Drawer */}
          <Animated.View
            style={[
              styles.menuDrawer,
              {
                backgroundColor: isDark ? tokens.colors.surface.dark : tokens.colors.background.light,
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            {/* Header */}
            <View style={[styles.menuHeader, { borderBottomColor: isDark ? '#333' : '#eee' }]}>
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>{firstName.charAt(0).toUpperCase()}</Text>
              </View>
              <Text
                style={[
                  styles.userName,
                  { color: isDark ? tokens.colors.text.primary.dark : tokens.colors.text.primary.light },
                ]}
              >
                {firstName}
              </Text>
            </View>

            {/* Menu Items */}
            <View style={styles.menuItems}>
              {menuItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.menuItem}
                  onPress={() => handleMenuItemPress(item)}
                  accessibilityLabel={item.label}
                >
                  <Text style={styles.menuItemIcon}>{item.icon}</Text>
                  <Text
                    style={[
                      styles.menuItemLabel,
                      {
                        color: item.danger
                          ? tokens.colors.error
                          : isDark
                          ? tokens.colors.text.primary.dark
                          : tokens.colors.text.primary.light,
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Logout Confirmation Modal */}
      <Modal
        visible={showLogoutConfirm}
        transparent
        animationType="fade"
        onRequestClose={cancelLogout}
      >
        <View style={styles.modalOverlay}>
          <View style={[
            styles.modalBox,
            { backgroundColor: isDark ? tokens.colors.surface.dark : tokens.colors.background.light }
          ]}>
            <Text style={[
              styles.modalTitle,
              { color: isDark ? tokens.colors.text.primary.dark : tokens.colors.text.primary.light }
            ]}>
              Sair da conta
            </Text>
            <Text style={[
              styles.modalMessage,
              { color: isDark ? tokens.colors.text.secondary.dark : tokens.colors.text.secondary.light }
            ]}>
              Deseja realmente sair da sua conta?
            </Text>
            <View style={styles.modalButtons}>
              <Button
                variant="outline"
                onPress={cancelLogout}
                style={styles.modalButton}
              >
                Não
              </Button>
              <Button
                variant="primary"
                onPress={confirmLogout}
                style={[styles.modalButton, styles.logoutButton]}
              >
                Sim
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  hamburgerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...tokens.shadow.md,
  },
  hamburgerLines: {
    width: 20,
    height: 14,
    justifyContent: 'space-between',
  },
  hamburgerLine: {
    width: 20,
    height: 2,
    borderRadius: 1,
  },
  modalContainer: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuDrawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: MENU_WIDTH,
    ...tokens.shadow.lg,
  },
  menuHeader: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: tokens.colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
  },
  menuItems: {
    paddingTop: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  menuItemIcon: {
    fontSize: 22,
    marginRight: 16,
  },
  menuItemLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
    ...tokens.shadow.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalButton: {
    flex: 1,
  },
  logoutButton: {
    backgroundColor: tokens.colors.error,
  },
});

export default HamburgerMenu;
