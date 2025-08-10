import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/lib/api';
import PageHeader from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
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
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { format } from 'date-fns';
import { 
  Calendar,
  DownloadCloud, 
  Users, 
  Award, 
  TrendingUp, 
  Briefcase
} from 'lucide-react';

export default function Reports() {
  const [opportunityPeriod, setOpportunityPeriod] = useState<string>('all');
  const [interestPeriod, setInterestPeriod] = useState<string>('all');
  const [teacherPeriod, setTeacherPeriod] = useState<string>('month');
  const [activeTab, setActiveTab] = useState<string>('opportunities');

  // Fetch opportunity stats
  const { 
    data: opportunityStats, 
    isLoading: isLoadingOpportunityStats,
    refetch: refetchOpportunityStats
  } = useQuery({
    queryKey: ['/api/reports/opportunities', opportunityPeriod],
    queryFn: () => reportsApi.getOpportunityStats(),
  });

  // Fetch interest stats
  const {
    data: interestStats,
    isLoading: isLoadingInterestStats,
    refetch: refetchInterestStats
  } = useQuery({
    queryKey: ['/api/reports/interests', interestPeriod],
    queryFn: () => reportsApi.getInterestStats(),
  });

  // Fetch teacher activity stats
  const {
    data: teacherStats,
    isLoading: isLoadingTeacherStats,
    refetch: refetchTeacherStats
  } = useQuery({
    queryKey: ['/api/reports/teacher-activity', teacherPeriod],
    queryFn: () => reportsApi.getTeacherActivityStats(teacherPeriod),
  });

  // Handle period changes
  const handleOpportunityPeriodChange = (value: string) => {
    setOpportunityPeriod(value);
    refetchOpportunityStats();
  };

  const handleInterestPeriodChange = (value: string) => {
    setInterestPeriod(value);
    refetchInterestStats();
  };

  const handleTeacherPeriodChange = (value: string) => {
    setTeacherPeriod(value);
    refetchTeacherStats();
  };

  // Export current report as CSV
  const exportReportCSV = () => {
    let data: any[] = [];
    let filename = '';
    let headers: string[] = [];

    if (activeTab === 'opportunities') {
      if (!opportunityStats?.byIndustry) return;
      data = opportunityStats.byIndustry;
      headers = ['Industry', 'Count'];
      filename = 'opportunity-statistics.csv';
    } else if (activeTab === 'interests') {
      if (!interestStats?.byIndustry) return;
      data = interestStats.byIndustry;
      headers = ['Industry', 'Count'];
      filename = 'interest-statistics.csv';
    } else if (activeTab === 'teachers') {
      if (!teacherStats?.teacherActivity) return;
      data = teacherStats.teacherActivity;
      headers = ['Teacher ID', 'First Name', 'Last Name', 'Count'];
      filename = 'teacher-activity.csv';
    }

    if (data.length === 0) return;

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...data.map(item => {
        if (activeTab === 'opportunities' || activeTab === 'interests') {
          return [item.industry, item.count].join(',');
        } else {
          return [item.teacherId, item.teacherFirstName, item.teacherLastName, item.count].join(',');
        }
      })
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Chart colors
  const chartColors = ['#3f51b5', '#757de8', '#002984', '#f50057', '#bb002f', '#00bcd4', '#62efff', '#008ba3'];
  
  // Format date for display
  const formatDate = (date: string) => {
    return format(new Date(date), 'MMM d, yyyy');
  };

  return (
    <div className="p-4 md:p-6">
      <PageHeader 
        title="Reports"
        description="Analyze data and generate reports about opportunities and student engagement"
        action={{
          label: "Export CSV",
          icon: <DownloadCloud className="h-4 w-4" />,
          onClick: exportReportCSV
        }}
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Opportunities</p>
                {isLoadingOpportunityStats ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-3xl font-bold">{opportunityStats?.totalOpportunities || 0}</p>
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
                <p className="text-sm font-medium text-muted-foreground">Active Opportunities</p>
                {isLoadingOpportunityStats ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-3xl font-bold">{opportunityStats?.activeOpportunities || 0}</p>
                )}
              </div>
              <Calendar className="h-8 w-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Student Interests</p>
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
                <p className="text-sm font-medium text-muted-foreground">Active Teachers</p>
                {isLoadingTeacherStats ? (
                  <Skeleton className="h-8 w-16 mt-1" />
                ) : (
                  <p className="text-3xl font-bold">{teacherStats?.activeTeachers || 0}</p>
                )}
              </div>
              <Award className="h-8 w-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different reports */}
      <Tabs defaultValue="opportunities" onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
          <TabsTrigger value="interests">Student Interests</TabsTrigger>
          <TabsTrigger value="teachers">Teacher Activity</TabsTrigger>
        </TabsList>

        {/* Opportunities Tab */}
        <TabsContent value="opportunities">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Opportunities by Industry</CardTitle>
                  <CardDescription>Distribution of opportunities across different industries</CardDescription>
                </div>
                <Select 
                  value={opportunityPeriod} 
                  onValueChange={handleOpportunityPeriodChange}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="year">Last Year</SelectItem>
                    <SelectItem value="month">Last Month</SelectItem>
                    <SelectItem value="week">Last Week</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                {isLoadingOpportunityStats ? (
                  <Skeleton className="h-[400px] w-full" />
                ) : opportunityStats?.byIndustry && opportunityStats.byIndustry.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={opportunityStats.byIndustry}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="industry" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" name="Number of Opportunities" fill="#3f51b5" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[400px]">
                    <p className="text-muted-foreground">No data available</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => refetchOpportunityStats()}
                    >
                      Refresh Data
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Opportunities by Age Group</CardTitle>
                <CardDescription>Distribution by target age groups</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingOpportunityStats ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : opportunityStats?.byAgeGroup && opportunityStats.byAgeGroup.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={opportunityStats.byAgeGroup}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={110}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="ageGroup"
                        label={({ ageGroup, count }) => `${ageGroup}: ${count}`}
                      >
                        {opportunityStats.byAgeGroup.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[300px]">
                    <p className="text-muted-foreground">No data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active vs. Expired Opportunities</CardTitle>
                <CardDescription>Current state of opportunities</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingOpportunityStats ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Active', value: opportunityStats?.activeOpportunities || 0 },
                          { name: 'Expired', value: opportunityStats?.expiredOpportunities || 0 }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={true}
                        outerRadius={110}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        <Cell fill="#4caf50" />
                        <Cell fill="#f44336" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Student Interests Tab */}
        <TabsContent value="interests">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Student Interests by Industry</CardTitle>
                  <CardDescription>Which industries are most popular among students</CardDescription>
                </div>
                <Select 
                  value={interestPeriod} 
                  onValueChange={handleInterestPeriodChange}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="year">Last Year</SelectItem>
                    <SelectItem value="month">Last Month</SelectItem>
                    <SelectItem value="week">Last Week</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                {isLoadingInterestStats ? (
                  <Skeleton className="h-[400px] w-full" />
                ) : interestStats?.byIndustry && interestStats.byIndustry.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={interestStats.byIndustry}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="industry" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" name="Number of Interests" fill="#f50057" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[400px]">
                    <p className="text-muted-foreground">No data available</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => refetchInterestStats()}
                    >
                      Refresh Data
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Opportunities by Interest</CardTitle>
                <CardDescription>Most popular opportunities among students</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingInterestStats ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : interestStats?.topOpportunities && interestStats.topOpportunities.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart 
                      data={interestStats.topOpportunities.slice(0, 5)} 
                      layout="vertical"
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis 
                        dataKey="opportunityTitle" 
                        type="category" 
                        width={150}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="count" name="Student Interests" fill="#00bcd4" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[300px]">
                    <p className="text-muted-foreground">No data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Interest Distribution</CardTitle>
                <CardDescription>Overall distribution of student interests</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingInterestStats ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : interestStats?.byIndustry && interestStats.byIndustry.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={interestStats.byIndustry}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={110}
                        fill="#8884d8"
                        dataKey="count"
                        nameKey="industry"
                        label={({ industry, count }) => `${industry}: ${count}`}
                      >
                        {interestStats.byIndustry.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[300px]">
                    <p className="text-muted-foreground">No data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Teacher Activity Tab */}
        <TabsContent value="teachers">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Teacher Activity</CardTitle>
                  <CardDescription>Opportunities created by teachers over time</CardDescription>
                </div>
                <Select 
                  value={teacherPeriod} 
                  onValueChange={handleTeacherPeriodChange}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select period" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">Last Week</SelectItem>
                    <SelectItem value="month">Last Month</SelectItem>
                    <SelectItem value="year">Last Year</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </CardHeader>
              <CardContent>
                {isLoadingTeacherStats ? (
                  <Skeleton className="h-[400px] w-full" />
                ) : teacherStats?.teacherActivity && teacherStats.teacherActivity.length > 0 ? (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={teacherStats.teacherActivity}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey={(v) => `${v.teacherFirstName} ${v.teacherLastName}`}
                        label={{ value: 'Teacher', position: 'insideBottom', offset: -5 }}
                      />
                      <YAxis 
                        label={{ value: 'Opportunities Created', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip />
                      <Bar dataKey="count" name="Opportunities Created" fill="#3f51b5" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[400px]">
                    <p className="text-muted-foreground">No data available</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => refetchTeacherStats()}
                    >
                      Refresh Data
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Most Active Teachers</CardTitle>
                <CardDescription>Teachers with the most contributions</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingTeacherStats ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : teacherStats?.teacherActivity && teacherStats.teacherActivity.length > 0 ? (
                  <div className="h-[300px] overflow-auto">
                    <table className="w-full">
                      <thead className="sticky top-0 bg-white dark:bg-gray-800">
                        <tr>
                          <th className="text-left p-2">Teacher</th>
                          <th className="text-right p-2">Opportunities</th>
                        </tr>
                      </thead>
                      <tbody>
                        {teacherStats.teacherActivity
                          .sort((a, b) => b.count - a.count)
                          .map((teacher, index) => (
                            <tr key={index} className="border-b dark:border-gray-700">
                              <td className="p-2">
                                <div className="flex items-center">
                                  {index < 3 && (
                                    <span className="text-yellow-500 mr-2">
                                      <TrendingUp className="h-4 w-4" />
                                    </span>
                                  )}
                                  {teacher.teacherFirstName} {teacher.teacherLastName}
                                </div>
                              </td>
                              <td className="text-right p-2">
                                <Badge>{teacher.count}</Badge>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[300px]">
                    <p className="text-muted-foreground">No data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Teacher Activity Trend</CardTitle>
                <CardDescription>Activity trend over the selected period</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingTeacherStats ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart
                      data={[
                        { name: 'Week 1', value: 12 },
                        { name: 'Week 2', value: 19 },
                        { name: 'Week 3', value: 15 },
                        { name: 'Week 4', value: 27 }
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="value" name="Opportunities" stroke="#3f51b5" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
