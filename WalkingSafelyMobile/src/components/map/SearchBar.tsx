/**
 * SearchBar Component
 * Address search with debounce and results list
 * Requirements: 4.1, 4.2, 4.3, 15.1, 15.2
 */

import React, {useState, useCallback, useRef, useEffect, memo} from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Text,
  Keyboard,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {useTranslation} from 'react-i18next';
import {Address} from '../../types/models';
import {geocodingService} from '../../services/api/geocoding';
import {colors} from '../../theme/colors';
import {spacing} from '../../theme/spacing';
import {fontSize} from '../../theme/typography';
import {DEBOUNCE_DELAY, MAX_SEARCH_RESULTS} from '../../utils/constants';

/**
 * Props for SearchBar component
 */
export interface SearchBarProps {
  /** Callback when an address is selected */
  onSelectAddress: (address: Address) => void;
  /** Callback when search input changes */
  onSearchChange?: (query: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether the search bar is disabled */
  disabled?: boolean;
  /** Initial value */
  initialValue?: string;
  /** Auto focus on mount */
  autoFocus?: boolean;
}

/**
 * Debounce hook for search input
 */
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * SearchBar Component
 * Provides address search functionality with debounced API calls
 */
const SearchBarComponent: React.FC<SearchBarProps> = ({
  onSelectAddress,
  onSearchChange,
  placeholder,
  disabled = false,
  initialValue = '',
  autoFocus = false,
}) => {
  const {t} = useTranslation();
  const inputRef = useRef<TextInput>(null);

  // State
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // Debounced query value (500ms delay per requirement 4.1)
  const debouncedQuery = useDebounce(query, DEBOUNCE_DELAY);

  // Track if component is mounted to prevent state updates after unmount
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  /**
   * Perform search when debounced query changes
   */
  useEffect(() => {
    const performSearch = async () => {
      // Don't search if query is too short
      if (debouncedQuery.trim().length < 2) {
        setResults([]);
        setShowResults(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Limit results to MAX_SEARCH_RESULTS (5) per requirement 4.2
        const searchResults = await geocodingService.search(
          debouncedQuery,
          MAX_SEARCH_RESULTS,
        );

        if (isMounted.current) {
          // Ensure we never show more than MAX_SEARCH_RESULTS
          setResults(searchResults.slice(0, MAX_SEARCH_RESULTS));
          setShowResults(searchResults.length > 0);
        }
      } catch (err) {
        if (isMounted.current) {
          setError(t('search.error'));
          setResults([]);
          setShowResults(false);
        }
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    };

    performSearch();
  }, [debouncedQuery, t]);

  /**
   * Handle text input change
   */
  const handleChangeText = useCallback(
    (text: string) => {
      setQuery(text);
      onSearchChange?.(text);

      // Clear results if input is cleared
      if (text.trim().length === 0) {
        setResults([]);
        setShowResults(false);
      }
    },
    [onSearchChange],
  );

  /**
   * Handle address selection
   */
  const handleSelectAddress = useCallback(
    (address: Address) => {
      setQuery(address.formattedAddress);
      setShowResults(false);
      setResults([]);
      Keyboard.dismiss();
      onSelectAddress(address);
    },
    [onSelectAddress],
  );

  /**
   * Handle clear button press
   */
  const handleClear = useCallback(() => {
    setQuery('');
    setResults([]);
    setShowResults(false);
    setError(null);
    inputRef.current?.focus();
    onSearchChange?.('');
  }, [onSearchChange]);

  /**
   * Handle input focus
   */
  const handleFocus = useCallback(() => {
    setIsFocused(true);
    if (results.length > 0) {
      setShowResults(true);
    }
  }, [results.length]);

  /**
   * Handle input blur
   */
  const handleBlur = useCallback(() => {
    setIsFocused(false);
    // Delay hiding results to allow tap on result item
    setTimeout(() => {
      if (isMounted.current && !isFocused) {
        setShowResults(false);
      }
    }, 200);
  }, [isFocused]);

  /**
   * Render a single result item
   */
  const renderResultItem = useCallback(
    ({item}: {item: Address}) => (
      <TouchableOpacity
        style={styles.resultItem}
        onPress={() => handleSelectAddress(item)}
        activeOpacity={0.7}>
        <View style={styles.resultIcon}>
          <Text style={styles.resultIconText}>📍</Text>
        </View>
        <View style={styles.resultContent}>
          <Text style={styles.resultAddress} numberOfLines={1}>
            {item.formattedAddress}
          </Text>
          {item.city && (
            <Text style={styles.resultCity} numberOfLines={1}>
              {[item.city, item.state].filter(Boolean).join(', ')}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    ),
    [handleSelectAddress],
  );

  /**
   * Render empty state
   */
  const renderEmptyState = useCallback(() => {
    if (isLoading) {
      return null;
    }

    if (error) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>{error}</Text>
        </View>
      );
    }

    if (debouncedQuery.trim().length >= 2 && results.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>{t('search.noResults')}</Text>
        </View>
      );
    }

    return null;
  }, [isLoading, error, debouncedQuery, results.length, t]);

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputContainerFocused,
          disabled && styles.inputContainerDisabled,
        ]}>
        {/* Search Icon */}
        <View style={styles.searchIcon}>
          <Text style={styles.searchIconText}>🔍</Text>
        </View>

        {/* Text Input */}
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={query}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder || t('search.placeholder')}
          placeholderTextColor={colors.text.tertiary}
          editable={!disabled}
          autoFocus={autoFocus}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="never" // We use custom clear button
        />

        {/* Loading Indicator */}
        {isLoading && (
          <ActivityIndicator
            size="small"
            color={colors.primary.main}
            style={styles.loadingIndicator}
          />
        )}

        {/* Clear Button */}
        {query.length > 0 && !isLoading && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClear}
            hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Results List */}
      {showResults && (
        <View style={styles.resultsContainer}>
          <FlatList
            data={results}
            keyExtractor={(item, index) => item?.id || `result_${index}`}
            renderItem={renderResultItem}
            ListEmptyComponent={renderEmptyState}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.resultsList}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    height: 48,
    shadowColor: colors.neutral.black,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  inputContainerFocused: {
    borderColor: colors.primary.main,
    shadowOpacity: 0.15,
  },
  inputContainerDisabled: {
    backgroundColor: colors.background.secondary,
    opacity: 0.7,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchIconText: {
    fontSize: 16,
  },
  input: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.text.primary,
    paddingVertical: Platform.OS === 'ios' ? spacing.sm : spacing.xs,
  },
  loadingIndicator: {
    marginLeft: spacing.xs,
  },
  clearButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  clearButtonText: {
    fontSize: 14,
    color: colors.text.tertiary,
  },
  resultsContainer: {
    position: 'absolute',
    top: 56,
    left: 0,
    right: 0,
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    shadowColor: colors.neutral.black,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    maxHeight: 250,
    overflow: 'hidden',
  },
  resultsList: {
    flex: 1,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  resultIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  resultIconText: {
    fontSize: 14,
  },
  resultContent: {
    flex: 1,
  },
  resultAddress: {
    fontSize: fontSize.md,
    color: colors.text.primary,
    fontWeight: '500',
  },
  resultCity: {
    fontSize: fontSize.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  emptyState: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: fontSize.md,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});

/**
 * Memoized SearchBar to prevent unnecessary re-renders
 * Requirement 15.1, 15.2: Optimize performance
 */
export const SearchBar = memo(SearchBarComponent, (prevProps, nextProps) => {
  // Only re-render if props that affect behavior changed
  if (prevProps.disabled !== nextProps.disabled) {
    return false;
  }
  if (prevProps.placeholder !== nextProps.placeholder) {
    return false;
  }
  if (prevProps.initialValue !== nextProps.initialValue) {
    return false;
  }
  if (prevProps.autoFocus !== nextProps.autoFocus) {
    return false;
  }
  // Callbacks are compared by reference - parent should memoize them
  if (prevProps.onSelectAddress !== nextProps.onSelectAddress) {
    return false;
  }
  if (prevProps.onSearchChange !== nextProps.onSearchChange) {
    return false;
  }
  return true;
});

SearchBar.displayName = 'SearchBar';

export default SearchBar;
