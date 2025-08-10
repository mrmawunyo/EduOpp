import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, ChevronDown, ChevronUp, Filter, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';
import { filterOptionsApi, preferencesApi } from '@/lib/api';

interface FilterSidebarProps {
  onFilterChange: (filters: any) => void;
  initialFilters?: any;
  opportunities?: any[];
}

export default function FilterSidebar({ onFilterChange, initialFilters = {}, opportunities = [] }: FilterSidebarProps) {
  // State for filters
  const [industries, setIndustries] = useState<string[]>(initialFilters.industries || []);
  const [ageGroups, setAgeGroups] = useState<string[]>(initialFilters.ageGroups || []);
  const [location, setLocation] = useState<string>(initialFilters.location || '');
  const [startDate, setStartDate] = useState<Date | undefined>(initialFilters.startDate);
  const [endDate, setEndDate] = useState<Date | undefined>(initialFilters.endDate);
  const [ethnicityFocus, setEthnicityFocus] = useState<string>(initialFilters.ethnicityFocus || '');
  const [genderFocus, setGenderFocus] = useState<string>(initialFilters.genderFocus || '');
  const [isVirtual, setIsVirtual] = useState<boolean | undefined>(initialFilters.isVirtual);
  const [opportunityTypes, setOpportunityTypes] = useState<string[]>(initialFilters.opportunityTypes || []);
  
  // State for expanded sections
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [industriesOpen, setIndustriesOpen] = useState(false);
  const [ageGroupsOpen, setAgeGroupsOpen] = useState(false);
  const [opportunityTypesOpen, setOpportunityTypesOpen] = useState(false);

  // Extract unique locations from opportunities
  const uniqueLocations = Array.from(new Set(
    opportunities
      .map(opp => opp?.location)
      .filter(loc => loc && loc.trim() !== '')
  )).sort();

  // Fetch filter options from API
  const { data: industryOptions = [], isLoading: isLoadingIndustries } = useQuery({
    queryKey: ['/api/filter-options', 'industry'],
    queryFn: () => filterOptionsApi.getByCategory('industry'),
  });

  const { data: ageGroupOptions = [], isLoading: isLoadingAgeGroups } = useQuery({
    queryKey: ['/api/filter-options', 'ageGroup'],
    queryFn: () => filterOptionsApi.getByCategory('ageGroup'),
  });

  const { data: ethnicityOptions = [], isLoading: isLoadingEthnicities } = useQuery({
    queryKey: ['/api/filter-options', 'ethnicity'],
    queryFn: () => filterOptionsApi.getByCategory('ethnicity'),
  });

  const { data: genderOptions = [], isLoading: isLoadingGenders } = useQuery({
    queryKey: ['/api/filter-options', 'gender'],
    queryFn: () => filterOptionsApi.getByCategory('gender'),
  });

  const { data: opportunityTypeOptions = [], isLoading: isLoadingOpportunityTypes } = useQuery({
    queryKey: ['/api/filter-options', 'opportunityType'],
    queryFn: () => filterOptionsApi.getByCategory('opportunityType'),
  });

  // Fetch student preferences to auto-populate filters
  const { data: studentPreferences } = useQuery({
    queryKey: ['/api/student-preferences'],
    queryFn: () => preferencesApi.get(),
    retry: false
  });

  // Auto-populate filters with student preferences on component mount
  useEffect(() => {
    if (studentPreferences && Object.keys(initialFilters).length === 0) {
      // Only auto-populate if no initial filters are provided
      if (studentPreferences.industries?.length > 0) {
        setIndustries(studentPreferences.industries);
      }
      if (studentPreferences.ageGroups?.length > 0) {
        setAgeGroups(studentPreferences.ageGroups);
      }
      if (studentPreferences.opportunityTypes?.length > 0) {
        setOpportunityTypes(studentPreferences.opportunityTypes);
      }
    }
  }, [studentPreferences, initialFilters]);

  // Auto-apply filters when preferences are loaded (once on mount)
  useEffect(() => {
    if (studentPreferences && Object.keys(initialFilters).length === 0) {
      const autoFilters = {
        industries: studentPreferences.industries || [],
        ageGroups: studentPreferences.ageGroups || [],
        opportunityTypes: studentPreferences.opportunityTypes || [],
        location: '',
        startDate: undefined,
        endDate: undefined,
        ethnicityFocus: '',
        genderFocus: '',
        isVirtual: undefined
      };
      onFilterChange(autoFilters);
    }
  }, [studentPreferences, initialFilters, onFilterChange]);

  // Apply filters manually when button is clicked
  const applyFilters = () => {
    const filters = {
      industries: industries.length > 0 ? industries : undefined,
      ageGroups: ageGroups.length > 0 ? ageGroups : undefined,
      location: location && location !== 'all' ? location : undefined,
      startDate,
      endDate,
      ethnicityFocus: ethnicityFocus && ethnicityFocus !== 'all' ? ethnicityFocus : undefined,
      genderFocus: genderFocus && genderFocus !== 'all' ? genderFocus : undefined,
      isVirtual,
      opportunityTypes: opportunityTypes.length > 0 ? opportunityTypes : undefined,
    };
    onFilterChange(filters);
  };

  const handleIndustryChange = (industry: string, checked: boolean) => {
    if (checked) {
      setIndustries([...industries, industry]);
    } else {
      setIndustries(industries.filter(i => i !== industry));
    }
  };

  const handleAgeGroupChange = (ageGroup: string, checked: boolean) => {
    if (checked) {
      setAgeGroups([...ageGroups, ageGroup]);
    } else {
      setAgeGroups(ageGroups.filter(ag => ag !== ageGroup));
    }
  };

  const handleOpportunityTypeChange = (type: string, checked: boolean) => {
    if (checked) {
      setOpportunityTypes([...opportunityTypes, type]);
    } else {
      setOpportunityTypes(opportunityTypes.filter(t => t !== type));
    }
  };

  const clearAllFilters = () => {
    setIndustries([]);
    setAgeGroups([]);
    setLocation('');
    setStartDate(undefined);
    setEndDate(undefined);
    setEthnicityFocus('');
    setGenderFocus('');
    setIsVirtual(undefined);
    setOpportunityTypes([]);
  };

  return (
    <div className="w-80 bg-white border-r border-gray-200 p-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Filter className="h-5 w-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={clearAllFilters}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Clear all
        </Button>
      </div>

      <div className="space-y-6">
        {/* Industries Multi-Select */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-900">Industries</Label>
          <div className="relative">
            <Button
              variant="outline"
              className="w-full justify-between text-left font-normal"
              onClick={() => setIndustriesOpen(!industriesOpen)}
            >
              <span className="truncate">
                {industries.length === 0 
                  ? "Select industries..." 
                  : industries.length === 1 
                    ? industries[0]
                    : `${industries.length} selected`
                }
              </span>
              {industriesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            
            {industriesOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                {isLoadingIndustries ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading...
                  </div>
                ) : (
                  <div className="p-2">
                    {industryOptions.map((option: any) => (
                      <div key={option.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                        <Checkbox
                          id={`industry-${option.id}`}
                          checked={industries.includes(option.value)}
                          onCheckedChange={(checked) => handleIndustryChange(option.value, checked as boolean)}
                        />
                        <label
                          htmlFor={`industry-${option.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {option.label}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Selected industries tags */}
          {industries.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {industries.map((industry) => (
                <span
                  key={industry}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                >
                  {industry}
                  <button
                    onClick={() => handleIndustryChange(industry, false)}
                    className="ml-1 hover:text-blue-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Age Groups Multi-Select */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-900">Age Groups</Label>
          <div className="relative">
            <Button
              variant="outline"
              className="w-full justify-between text-left font-normal"
              onClick={() => setAgeGroupsOpen(!ageGroupsOpen)}
            >
              <span className="truncate">
                {ageGroups.length === 0 
                  ? "Select age groups..." 
                  : ageGroups.length === 1 
                    ? ageGroups[0]
                    : `${ageGroups.length} selected`
                }
              </span>
              {ageGroupsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            
            {ageGroupsOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                {isLoadingAgeGroups ? (
                  <div className="flex items-center justify-center p-4">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Loading...
                  </div>
                ) : (
                  <div className="p-2">
                    {ageGroupOptions.map((option: any) => (
                      <div key={option.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                        <Checkbox
                          id={`age-${option.id}`}
                          checked={ageGroups.includes(option.value)}
                          onCheckedChange={(checked) => handleAgeGroupChange(option.value, checked as boolean)}
                        />
                        <label
                          htmlFor={`age-${option.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {option.label}
                        </label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Selected age groups tags */}
          {ageGroups.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {ageGroups.map((ageGroup) => (
                <span
                  key={ageGroup}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800"
                >
                  {ageGroup}
                  <button
                    onClick={() => handleAgeGroupChange(ageGroup, false)}
                    className="ml-1 hover:text-green-600"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Location Filter */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-900">Location</Label>
          <Select value={location} onValueChange={setLocation}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {uniqueLocations.map((loc) => (
                <SelectItem key={loc} value={loc}>
                  {loc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Toggle for More Filters */}
        <Button
          variant="ghost"
          onClick={() => setShowMoreFilters(!showMoreFilters)}
          className="w-full justify-between p-0 h-auto text-sm text-gray-600 hover:text-gray-900"
        >
          <span>More Filters</span>
          {showMoreFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>

        {showMoreFilters && (
          <div className="space-y-6">
            {/* Opportunity Types Multi-Select */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-900">Opportunity Types</Label>
              <div className="relative">
                <Button
                  variant="outline"
                  className="w-full justify-between text-left font-normal"
                  onClick={() => setOpportunityTypesOpen(!opportunityTypesOpen)}
                >
                  <span className="truncate">
                    {opportunityTypes.length === 0 
                      ? "Select types..." 
                      : opportunityTypes.length === 1 
                        ? opportunityTypes[0]
                        : `${opportunityTypes.length} selected`
                    }
                  </span>
                  {opportunityTypesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
                
                {opportunityTypesOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                    {isLoadingOpportunityTypes ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Loading...
                      </div>
                    ) : (
                      <div className="p-2">
                        {opportunityTypeOptions.map((option: any) => (
                          <div key={option.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                            <Checkbox
                              id={`type-${option.id}`}
                              checked={opportunityTypes.includes(option.value)}
                              onCheckedChange={(checked) => handleOpportunityTypeChange(option.value, checked as boolean)}
                            />
                            <label
                              htmlFor={`type-${option.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              {option.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Selected opportunity types tags */}
              {opportunityTypes.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {opportunityTypes.map((type) => (
                    <span
                      key={type}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800"
                    >
                      {type}
                      <button
                        onClick={() => handleOpportunityTypeChange(type, false)}
                        className="ml-1 hover:text-purple-600"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Ethnicity Focus */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-900">Ethnicity Focus</Label>
              <Select value={ethnicityFocus} onValueChange={setEthnicityFocus}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Ethnicities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ethnicities</SelectItem>
                  {isLoadingEthnicities ? (
                    <div className="flex items-center justify-center p-2">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Loading...
                    </div>
                  ) : (
                    ethnicityOptions.map((option: any) => (
                      <SelectItem key={option.id} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Gender Focus */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-900">Gender Focus</Label>
              <Select value={genderFocus} onValueChange={setGenderFocus}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Genders" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genders</SelectItem>
                  {isLoadingGenders ? (
                    <div className="flex items-center justify-center p-2">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Loading...
                    </div>
                  ) : (
                    genderOptions.map((option: any) => (
                      <SelectItem key={option.id} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-900">Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-900">End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Virtual/In-Person */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-900">Format</Label>
              <Select value={isVirtual === undefined ? '' : isVirtual.toString()} onValueChange={(value) => setIsVirtual(value === '' ? undefined : value === 'true')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All Formats" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Formats</SelectItem>
                  <SelectItem value="true">Virtual</SelectItem>
                  <SelectItem value="false">In-Person</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Apply Filters Button */}
        <div className="pt-6 border-t border-gray-200 mt-6">
          <Button 
            onClick={applyFilters}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            Apply Filters
          </Button>
        </div>
      </div>
    </div>
  );
}