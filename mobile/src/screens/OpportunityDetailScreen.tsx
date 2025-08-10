import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
  Share,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { apiRequest } from '../services/api';
import { Opportunity } from '../types';

interface OpportunityDetailScreenProps {
  route: {
    params: {
      opportunity: Opportunity;
    };
  };
  navigation: any;
}

export default function OpportunityDetailScreen({ route, navigation }: OpportunityDetailScreenProps) {
  const { opportunity } = route.params;
  const [isRegistered, setIsRegistered] = useState(opportunity.isRegistered);
  const queryClient = useQueryClient();

  // Register interest mutation
  const registerInterestMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/api/opportunities/${opportunity.id}/register`, {
        method: 'POST',
      }),
    onSuccess: () => {
      setIsRegistered(true);
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      Alert.alert('Success', 'Interest registered successfully!');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to register interest');
    },
  });

  // Unregister interest mutation
  const unregisterInterestMutation = useMutation({
    mutationFn: () =>
      apiRequest(`/api/opportunities/${opportunity.id}/unregister`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      setIsRegistered(false);
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      Alert.alert('Success', 'Interest removed successfully!');
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to remove interest');
    },
  });

  const handleRegisterInterest = () => {
    if (isRegistered) {
      unregisterInterestMutation.mutate();
    } else {
      registerInterestMutation.mutate();
    }
  };

  const handleContactEmail = () => {
    Linking.openURL(`mailto:${opportunity.contactEmail}`);
  };

  const handleContactPhone = () => {
    if (opportunity.contactPhone) {
      Linking.openURL(`tel:${opportunity.contactPhone}`);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out this opportunity: ${opportunity.title} at ${opportunity.organizationName}`,
        title: opportunity.title,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDeadline = (deadline: string) => {
    const date = new Date(deadline);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { text: 'Expired', color: '#dc2626' };
    if (diffDays === 0) return { text: 'Today', color: '#dc2626' };
    if (diffDays <= 7) return { text: `${diffDays} days left`, color: '#f59e0b' };
    return { text: `${diffDays} days left`, color: '#10b981' };
  };

  const deadlineInfo = formatDeadline(opportunity.applicationDeadline);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{opportunity.title}</Text>
            <View style={styles.organizationContainer}>
              <Icon name="business" size={20} color="#6b7280" />
              <Text style={styles.organizationName}>{opportunity.organizationName}</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <Icon name="share" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        <View style={styles.quickInfoContainer}>
          <View style={styles.quickInfoItem}>
            <Icon name="location-on" size={20} color="#2563eb" />
            <Text style={styles.quickInfoText}>{opportunity.location}</Text>
          </View>
          
          <View style={styles.quickInfoItem}>
            <Icon name="category" size={20} color="#2563eb" />
            <Text style={styles.quickInfoText}>{opportunity.category}</Text>
          </View>
          
          <View style={styles.quickInfoItem}>
            <Icon name="schedule" size={20} color={deadlineInfo.color} />
            <Text style={[styles.quickInfoText, { color: deadlineInfo.color }]}>
              {deadlineInfo.text}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.sectionContent}>{opportunity.description}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Requirements</Text>
          <Text style={styles.sectionContent}>{opportunity.requirements}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Benefits</Text>
          <Text style={styles.sectionContent}>{opportunity.benefits}</Text>
        </View>

        {opportunity.applicationProcess && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Application Process</Text>
            <Text style={styles.sectionContent}>{opportunity.applicationProcess}</Text>
          </View>
        )}

        <View style={styles.detailsGrid}>
          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>Duration</Text>
            <Text style={styles.detailValue}>{opportunity.duration}</Text>
          </View>
          
          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>Industry</Text>
            <Text style={styles.detailValue}>{opportunity.industry}</Text>
          </View>
          
          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>Type</Text>
            <Text style={styles.detailValue}>{opportunity.opportunityType}</Text>
          </View>
          
          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>Target Age</Text>
            <Text style={styles.detailValue}>{opportunity.targetAgeGroup}</Text>
          </View>
        </View>

        {opportunity.tags.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tags</Text>
            <View style={styles.tagsContainer}>
              {opportunity.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          
          <TouchableOpacity style={styles.contactItem} onPress={handleContactEmail}>
            <Icon name="email" size={24} color="#2563eb" />
            <Text style={styles.contactText}>{opportunity.contactEmail}</Text>
            <Icon name="open-in-new" size={20} color="#6b7280" />
          </TouchableOpacity>
          
          {opportunity.contactPhone && (
            <TouchableOpacity style={styles.contactItem} onPress={handleContactPhone}>
              <Icon name="phone" size={24} color="#2563eb" />
              <Text style={styles.contactText}>{opportunity.contactPhone}</Text>
              <Icon name="open-in-new" size={20} color="#6b7280" />
            </TouchableOpacity>
          )}
          
          {opportunity.organizationWebsite && (
            <TouchableOpacity 
              style={styles.contactItem} 
              onPress={() => Linking.openURL(opportunity.organizationWebsite!)}
            >
              <Icon name="language" size={24} color="#2563eb" />
              <Text style={styles.contactText}>Visit Website</Text>
              <Icon name="open-in-new" size={20} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={[
            styles.interestButton,
            isRegistered && styles.interestedButton,
          ]}
          onPress={handleRegisterInterest}
          disabled={registerInterestMutation.isPending || unregisterInterestMutation.isPending}
        >
          <Icon
            name={isRegistered ? "favorite" : "favorite-border"}
            size={24}
            color={isRegistered ? "white" : "#2563eb"}
          />
          <Text
            style={[
              styles.interestButtonText,
              isRegistered && styles.interestedButtonText,
            ]}
          >
            {isRegistered ? 'Remove Interest' : 'Show Interest'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  organizationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  organizationName: {
    fontSize: 16,
    color: '#6b7280',
    marginLeft: 8,
  },
  shareButton: {
    padding: 8,
  },
  quickInfoContainer: {
    backgroundColor: 'white',
    padding: 20,
    marginTop: 1,
  },
  quickInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickInfoText: {
    fontSize: 16,
    marginLeft: 12,
    color: '#374151',
  },
  section: {
    backgroundColor: 'white',
    padding: 20,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  sectionContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#4b5563',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    marginTop: 16,
  },
  detailCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    margin: 6,
    width: '45%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#e0e7ff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  tagText: {
    fontSize: 14,
    color: '#3730a3',
    fontWeight: '500',
  },
  contactSection: {
    backgroundColor: 'white',
    padding: 20,
    marginTop: 16,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  contactText: {
    flex: 1,
    fontSize: 16,
    color: '#2563eb',
    marginLeft: 12,
  },
  bottomPadding: {
    height: 100,
  },
  bottomActions: {
    backgroundColor: 'white',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  interestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    borderWidth: 2,
    borderColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  interestedButton: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  interestButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2563eb',
    marginLeft: 8,
  },
  interestedButtonText: {
    color: 'white',
  },
});