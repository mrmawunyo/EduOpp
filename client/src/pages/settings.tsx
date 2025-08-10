import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Settings as SettingsIcon, Save, User, Bell, Shield, Palette } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { preferencesApi, filterOptionsApi } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { useAuth } from '@/providers/AuthProvider';

interface PreferencesFormData {
  industries: string[];
  ageGroups: string[];
  opportunityTypes: string[];
  locations: string[];
}

export default function Settings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<PreferencesFormData>({
    industries: [],
    ageGroups: [],
    opportunityTypes: [],
    locations: []
  });

  // Fetch current preferences
  const { data: currentPreferences, isLoading: preferencesLoading } = useQuery({
    queryKey: ['/api/student-preferences'],
    queryFn: () => preferencesApi.get(),
    enabled: !!user
  });

  // Fetch filter options
  const { data: industryOptions } = useQuery({
    queryKey: ['/api/filter-options', 'industry'],
    queryFn: () => filterOptionsApi.getByCategory('industry')
  });

  const { data: ageGroupOptions } = useQuery({
    queryKey: ['/api/filter-options', 'ageGroup'],
    queryFn: () => filterOptionsApi.getByCategory('ageGroup')
  });

  const { data: opportunityTypeOptions } = useQuery({
    queryKey: ['/api/filter-options', 'opportunityType'],
    queryFn: () => filterOptionsApi.getByCategory('opportunityType')
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: preferencesApi.update,
    onSuccess: () => {
      toast({
        title: "Preferences updated!",
        description: "Your opportunity preferences have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/student-preferences'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update preferences",
        variant: "destructive",
      });
    },
  });

  // Load current preferences into form
  useEffect(() => {
    if (currentPreferences) {
      setPreferences({
        industries: currentPreferences.industries || [],
        ageGroups: currentPreferences.ageGroups || [],
        opportunityTypes: currentPreferences.opportunityTypes || [],
        locations: currentPreferences.locations || []
      });
    }
  }, [currentPreferences]);

  const handleCheckboxChange = (category: keyof PreferencesFormData, value: string, checked: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [category]: checked 
        ? [...prev[category], value]
        : prev[category].filter(item => item !== value)
    }));
  };

  const handleSave = () => {
    updatePreferencesMutation.mutate(preferences);
  };

  if (preferencesLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <SettingsIcon className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>
        <div className="animate-pulse">
          <div className="h-32 bg-gray-200 rounded mb-4"></div>
          <div className="h-32 bg-gray-200 rounded mb-4"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-2 mb-6">
        <SettingsIcon className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <div className="grid gap-6">
        {/* User Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Name</Label>
                <p className="text-sm text-gray-600 mt-1">
                  {user?.firstName} {user?.lastName}
                </p>
              </div>
              <div>
                <Label>Email</Label>
                <p className="text-sm text-gray-600 mt-1">{user?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Opportunity Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Opportunity Preferences
            </CardTitle>
            <p className="text-sm text-gray-600">
              Configure your preferences to see opportunities that match your interests. 
              These settings will automatically filter opportunities when you browse.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Industries */}
            <div>
              <Label className="text-base font-medium">Industries</Label>
              <p className="text-sm text-gray-600 mb-3">Select industries you're interested in</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {industryOptions?.map((option: any) => (
                  <div key={option.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`industry-${option.id}`}
                      checked={preferences.industries.includes(option.value)}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange('industries', option.value, checked as boolean)
                      }
                    />
                    <Label 
                      htmlFor={`industry-${option.id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Age Groups */}
            <div>
              <Label className="text-base font-medium">Age Groups</Label>
              <p className="text-sm text-gray-600 mb-3">Select your target age groups</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {ageGroupOptions?.map((option: any) => (
                  <div key={option.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`age-${option.id}`}
                      checked={preferences.ageGroups.includes(option.value)}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange('ageGroups', option.value, checked as boolean)
                      }
                    />
                    <Label 
                      htmlFor={`age-${option.id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Opportunity Types */}
            <div>
              <Label className="text-base font-medium">Opportunity Types</Label>
              <p className="text-sm text-gray-600 mb-3">Select types of opportunities you prefer</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {opportunityTypeOptions?.map((option: any) => (
                  <div key={option.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`type-${option.id}`}
                      checked={preferences.opportunityTypes.includes(option.value)}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange('opportunityTypes', option.value, checked as boolean)
                      }
                    />
                    <Label 
                      htmlFor={`type-${option.id}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button 
                onClick={handleSave}
                disabled={updatePreferencesMutation.isPending}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {updatePreferencesMutation.isPending ? 'Saving...' : 'Save Preferences'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification Preferences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-gray-600">Receive email alerts for new opportunities</p>
                </div>
                <Checkbox defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Weekly Digest</Label>
                  <p className="text-sm text-gray-600">Get a weekly summary of new opportunities</p>
                </div>
                <Checkbox defaultChecked />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Privacy Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Privacy Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Profile Visibility</Label>
                  <p className="text-sm text-gray-600">Allow teachers to see your interest in opportunities</p>
                </div>
                <Checkbox defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Data Sharing</Label>
                  <p className="text-sm text-gray-600">Share anonymized data to improve recommendations</p>
                </div>
                <Checkbox />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}