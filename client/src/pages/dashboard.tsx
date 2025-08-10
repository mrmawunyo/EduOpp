import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/providers/AuthProvider';
import { useQuery } from '@tanstack/react-query';
import { opportunitiesApi, interestsApi, reportsApi } from '@/lib/api';
import { Link } from 'wouter';
import { CalendarDays, Clock, Briefcase, Users, TrendingUp, Award, Calendar } from 'lucide-react';
import OpportunityCard from '@/components/opportunities/OpportunityCard';
import OpportunityDetailModal from '@/components/opportunities/OpportunityDetailModal';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export default function Dashboard() {
  const { user } = useAuth();
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<number | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Fetch opportunities
  const { 
    data: opportunities, 
    isLoading: isLoadingOpportunities 
  } = useQuery({
    queryKey: ['/api/opportunities'],
    queryFn: opportunitiesApi.getAll,
  });

  // Fetch student's interests if user can manage preferences
  const { 
    data: interests,
    isLoading: isLoadingInterests
  } = useQuery({
    queryKey: ['/api/student-interests/student'],
    queryFn: interestsApi.getForStudent,
    enabled: user?.permissions?.canManagePreferences,
  });

  // Fetch opportunity stats for users who can view reports
  const {
    data: opportunityStats,
    isLoading: isLoadingStats
  } = useQuery({
    queryKey: ['/api/reports/opportunities'],
    queryFn: reportsApi.getOpportunityStats,
    enabled: user?.permissions?.canViewReports,
  });

  // Fetch interest stats for users who can view reports
  const {
    data: interestStats,
    isLoading: isLoadingInterestStats
  } = useQuery({
    queryKey: ['/api/reports/interests'],
    queryFn: reportsApi.getInterestStats,
    enabled: user?.permissions?.canViewReports,
  });

  const handleViewDetails = (id: number) => {
    setSelectedOpportunityId(id);
    setShowDetailModal(true);
  };

  // Prepare chart data
  const chartColors = ['#3f51b5', '#757de8', '#002984', '#f50057', '#bb002f', '#00bcd4', '#62efff'];

  const getIndustryChartData = () => {
    if (!opportunityStats?.byIndustry) return [];
    return opportunityStats.byIndustry.slice(0, 7);
  };

  const getInterestByIndustryData = () => {
    if (!interestStats?.byIndustry) return [];
    return interestStats.byIndustry.slice(0, 7);
  };

  // Get upcoming deadlines (next 7 days)
  const getUpcomingDeadlines = () => {
    if (!opportunities) return [];
    
    const now = new Date();
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(now.getDate() + 7);
    
    return opportunities
      .filter(opp => 
        opp.applicationDeadline && 
        new Date(opp.applicationDeadline) >= now && 
        new Date(opp.applicationDeadline) <= sevenDaysLater
      )
      .sort((a, b) => 
        new Date(a.applicationDeadline!).getTime() - 
        new Date(b.applicationDeadline!).getTime()
      );
  };

  // Get student's registered opportunities
  const getRegisteredOpportunities = () => {
    if (!opportunities || !interests) return [];
    
    const interestOpportunityIds = interests.map((interest: any) => interest.opportunityId);
    return opportunities.filter(opp => interestOpportunityIds.includes(opp.id));
  };

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-medium text-neutral-400 dark:text-white mb-6">Dashboard</h1>
      
      {/* Stats cards for teachers/admins */}
      {(user?.permissions?.canCreateOpportunities || user?.permissions?.canManageUsers || user?.permissions?.canEditAllOpportunities) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Opportunities</p>
                  {isLoadingStats ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-3xl font-bold">{opportunityStats?.activeOpportunities || 0}</p>
                  )}
                </div>
                <Briefcase className="h-8 w-8 text-primary opacity-80" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Interests</p>
                  {isLoadingInterestStats ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-3xl font-bold">{interestStats?.totalInterests || 0}</p>
                  )}
                </div>
                <Users className="h-8 w-8 text-primary opacity-80" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Upcoming Deadlines</p>
                  {isLoadingOpportunities ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-3xl font-bold">{getUpcomingDeadlines().length}</p>
                  )}
                </div>
                <Clock className="h-8 w-8 text-warning opacity-80" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Teachers</p>
                  {isLoadingStats ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-3xl font-bold">{opportunityStats?.teacherStats?.activeTeachers || 0}</p>
                  )}
                </div>
                <Award className="h-8 w-8 text-success opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Stats and summary for students */}
      {user?.permissions?.canManagePreferences && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Registered Interests</p>
                  {isLoadingInterests ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-3xl font-bold">{interests?.length || 0}</p>
                  )}
                </div>
                <TrendingUp className="h-8 w-8 text-primary opacity-80" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Available Opportunities</p>
                  {isLoadingOpportunities ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-3xl font-bold">{opportunities?.length || 0}</p>
                  )}
                </div>
                <Briefcase className="h-8 w-8 text-primary opacity-80" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Upcoming Deadlines</p>
                  {isLoadingOpportunities ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-3xl font-bold">{getUpcomingDeadlines().length}</p>
                  )}
                </div>
                <Calendar className="h-8 w-8 text-warning opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts for users who can view reports */}
        {user?.permissions?.canViewReports && (
          <>
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Opportunities by Industry</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingStats ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={getIndustryChartData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="industry" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#3f51b5" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Student Interests by Industry</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingInterestStats ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={getInterestByIndustryData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="industry"
                        label={({ industry, count }) => `${industry}: ${count}`}
                      >
                        {getInterestByIndustryData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Upcoming deadlines */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Upcoming Deadlines</CardTitle>
            <CardDescription>Opportunities with deadlines in the next 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingOpportunities ? (
              <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : getUpcomingDeadlines().length > 0 ? (
              <div className="space-y-4">
                {getUpcomingDeadlines().map(opportunity => (
                  <div 
                    key={opportunity.id} 
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                    onClick={() => handleViewDetails(opportunity.id)}
                  >
                    <div>
                      <p className="font-medium dark:text-white">{opportunity.title}</p>
                      <p className="text-sm text-muted-foreground">{opportunity.organization}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-error dark:text-red-400">
                        {format(new Date(opportunity.applicationDeadline!), 'MMM d, yyyy')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {Math.ceil((new Date(opportunity.applicationDeadline!).getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000))} days left
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No upcoming deadlines in the next 7 days</p>
            )}
          </CardContent>
        </Card>

        {/* Registered opportunities for students */}
        {user?.permissions?.canViewOpportunities && !(user?.permissions?.canCreateOpportunities || user?.permissions?.canManageUsers || user?.permissions?.canEditAllOpportunities) && (
          <Card>
            <CardHeader>
              <CardTitle>Your Registered Opportunities</CardTitle>
              <CardDescription>Opportunities you've shown interest in</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingOpportunities || isLoadingInterests ? (
                <div className="space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : getRegisteredOpportunities().length > 0 ? (
                <div className="space-y-4">
                  {getRegisteredOpportunities().map(opportunity => (
                    <div 
                      key={opportunity.id} 
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                      onClick={() => handleViewDetails(opportunity.id)}
                    >
                      <div>
                        <p className="font-medium dark:text-white">{opportunity.title}</p>
                        <p className="text-sm text-muted-foreground">{opportunity.organization}</p>
                      </div>
                      <div className="flex items-center text-primary">
                        <CalendarDays className="h-4 w-4 mr-1" />
                        <span className="text-xs">
                          {format(new Date(opportunity.startDate), 'MMM d')} - {format(new Date(opportunity.endDate), 'MMM d')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <p>You haven't registered for any opportunities yet</p>
                  <Link href="/opportunities">
                    <a className="text-primary hover:underline mt-2 inline-block">Browse opportunities</a>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent opportunities for teachers */}
      {(user?.permissions?.canCreateOpportunities || user?.permissions?.canManageUsers || user?.permissions?.canEditAllOpportunities) && (
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Recently Added Opportunities</CardTitle>
              <CardDescription>The latest opportunities added to the platform</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingOpportunities ? (
                <div className="space-y-4">
                  <Skeleton className="h-40 md:h-32 w-full" />
                  <Skeleton className="h-40 md:h-32 w-full" />
                </div>
              ) : opportunities && opportunities.length > 0 ? (
                <div className="space-y-4">
                  {opportunities.slice(0, 3).map(opportunity => (
                    <OpportunityCard
                      key={opportunity.id}
                      opportunity={opportunity}
                      onViewDetails={handleViewDetails}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No opportunities found</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Opportunity Detail Modal */}
      <OpportunityDetailModal
        opportunityId={selectedOpportunityId}
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
      />
    </div>
  );
}
