import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { apiRequest } from '../services/api';
import { Opportunity, SearchFilters } from '../types';

interface OpportunitiesScreenProps {
  navigation: any;
}

export default function OpportunitiesScreen({ navigation }: OpportunitiesScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const queryClient = useQueryClient();

  // Fetch opportunities
  const { data: opportunities = [], isLoading, error, refetch } = useQuery({
    queryKey: ['opportunities', searchQuery, filters],
    queryFn: () => fetchOpportunities(searchQuery, filters),
    staleTime: 5 * 60 * 1000,
  });

  // Register interest mutation
  const registerInterestMutation = useMutation({
    mutationFn: (opportunityId: number) =>
      apiRequest(`/api/opportunities/${opportunityId}/register`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      Alert.alert('Success', 'Interest registered successfully!');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to register interest');
    },
  });

  // Unregister interest mutation
  const unregisterInterestMutation = useMutation({
    mutationFn: (opportunityId: number) =>
      apiRequest(`/api/opportunities/${opportunityId}/unregister`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      Alert.alert('Success', 'Interest removed successfully!');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to remove interest');
    },
  });

  const fetchOpportunities = async (query: string, filters: SearchFilters) => {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(key, v));
        } else {
          params.append(key, value);
        }
      }
    });
    
    return apiRequest(`/api/opportunities/search?${params.toString()}`);
  };

  const handleRegisterInterest = (opportunity: Opportunity) => {
    if (opportunity.isRegistered) {
      unregisterInterestMutation.mutate(opportunity.id);
    } else {
      registerInterestMutation.mutate(opportunity.id);
    }
  };

  const formatDeadline = (deadline: string) => {
    const date = new Date(deadline);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    return `${diffDays} days left`;
  };

  const renderOpportunityCard = ({ item }: { item: Opportunity }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('OpportunityDetail', { opportunity: item })}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.title}>{item.title}</Text>
        <View style={styles.organizationContainer}>
          <Icon name="business" size={16} color="#6b7280" />
          <Text style={styles.organization}>{item.organizationName}</Text>
        </View>
      </View>

      <Text style={styles.description} numberOfLines={3}>
        {item.description}
      </Text>

      <View style={styles.detailsContainer}>
        <View style={styles.detailItem}>
          <Icon name="location-on" size={16} color="#6b7280" />
          <Text style={styles.detailText}>{item.location}</Text>
        </View>
        
        <View style={styles.detailItem}>
          <Icon name="category" size={16} color="#6b7280" />
          <Text style={styles.detailText}>{item.category}</Text>
        </View>
        
        <View style={styles.detailItem}>
          <Icon name="schedule" size={16} color="#6b7280" />
          <Text style={styles.detailText}>{formatDeadline(item.applicationDeadline)}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.tagsContainer}>
          {item.tags.slice(0, 2).map((tag, index) => (
            <View key={index} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
          {item.tags.length > 2 && (
            <Text style={styles.moreTagsText}>+{item.tags.length - 2} more</Text>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.interestButton,
            item.isRegistered && styles.interestedButton,
          ]}
          onPress={() => handleRegisterInterest(item)}
          disabled={registerInterestMutation.isPending || unregisterInterestMutation.isPending}
        >
          <Icon
            name={item.isRegistered ? "favorite" : "favorite-border"}
            size={16}
            color={item.isRegistered ? "#dc2626" : "#2563eb"}
          />
          <Text
            style={[
              styles.interestButtonText,
              item.isRegistered && styles.interestedButtonText,
            ]}
          >
            {item.isRegistered ? 'Interested' : 'Show Interest'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Icon name="error-outline" size={48} color="#dc2626" />
        <Text style={styles.errorText}>Failed to load opportunities</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Icon name="search" size={24} color="#6b7280" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search opportunities..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9ca3af"
          />
        </View>
      </View>

      <FlatList
        data={opportunities}
        renderItem={renderOpportunityCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={styles.loadingText}>Loading opportunities...</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Icon name="work-off" size={64} color="#9ca3af" />
              <Text style={styles.emptyText}>No opportunities found</Text>
              <Text style={styles.emptySubtext}>
                Try adjusting your search criteria
              </Text>
            </View>
          )
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  searchContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#374151',
  },
  listContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardHeader: {
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  organizationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  organization: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 4,
  },
  description: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 16,
  },
  detailsContainer: {
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tag: {
    backgroundColor: '#e0e7ff',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
  },
  tagText: {
    fontSize: 12,
    color: '#3730a3',
    fontWeight: '500',
  },
  moreTagsText: {
    fontSize: 12,
    color: '#6b7280',
  },
  interestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  interestedButton: {
    backgroundColor: '#fef2f2',
  },
  interestButtonText: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
    marginLeft: 4,
  },
  interestedButtonText: {
    color: '#dc2626',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#dc2626',
    marginTop: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 16,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});