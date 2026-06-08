import { useGetDashboardStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Megaphone, 
  Activity, 
  CheckCircle2, 
  XCircle, 
  Share2, 
  Clock,
  ArrowRight,
  Terminal
} from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const { data: stats, isLoading, isError } = useGetDashboardStats();

  if (isError) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center text-center space-y-4">
        <XCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-bold">Failed to load dashboard data</h2>
        <p className="text-muted-foreground">Please check your connection and try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">Overview</h1>
          <p className="text-muted-foreground font-mono mt-1 text-sm uppercase">System Status: <span className="text-primary font-bold">Nominal</span></p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/platforms">Manage Platforms</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/campaigns/new">New Campaign</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard 
          title="Total Campaigns" 
          value={stats?.totalCampaigns} 
          icon={<Megaphone className="h-4 w-4 text-muted-foreground" />} 
          isLoading={isLoading} 
        />
        <StatCard 
          title="Active Campaigns" 
          value={stats?.activeCampaigns} 
          icon={<Activity className="h-4 w-4 text-primary" />} 
          isLoading={isLoading} 
        />
        <StatCard 
          title="Scheduled Posts" 
          value={stats?.scheduledPosts} 
          icon={<Clock className="h-4 w-4 text-chart-3" />} 
          isLoading={isLoading} 
        />
        <StatCard 
          title="Published Posts" 
          value={stats?.publishedPosts} 
          icon={<CheckCircle2 className="h-4 w-4 text-chart-2" />} 
          isLoading={isLoading} 
        />
        <StatCard 
          title="Failed Posts" 
          value={stats?.failedPosts} 
          icon={<XCircle className="h-4 w-4 text-destructive" />} 
          isLoading={isLoading} 
        />
        <StatCard 
          title="Connected Platforms" 
          value={stats?.connectedPlatforms} 
          icon={<Share2 className="h-4 w-4 text-chart-4" />} 
          isLoading={isLoading} 
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1 border-muted bg-card/50">
          <CardHeader>
            <CardTitle className="text-sm font-medium uppercase tracking-wider">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : stats?.recentActivity && stats.recentActivity.length > 0 ? (
              <div className="space-y-4">
                {stats.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4 pb-4 border-b border-border/50 last:border-0 last:pb-0">
                    <div className="mt-0.5 rounded-full p-1.5 bg-muted">
                      <Activity className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm leading-none font-medium">{activity.message}</p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {new Date(activity.createdAt).toLocaleString()} {activity.platform && `• ${activity.platform}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Activity className="h-8 w-8 text-muted-foreground/50 mb-4" />
                <p className="text-sm text-muted-foreground">No recent activity found.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="bg-primary/5 border-primary/20 relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-10">
              <Megaphone className="h-32 w-32 -mt-4 -mr-4" />
            </div>
            <CardHeader>
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-primary">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button asChild variant="secondary" className="w-full justify-between h-12 bg-background/50 hover:bg-background">
                <Link href="/campaigns/new">
                  <span className="flex items-center gap-2"><Megaphone className="h-4 w-4 text-primary" /> Create Campaign</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </Button>
              <Button asChild variant="secondary" className="w-full justify-between h-12 bg-background/50 hover:bg-background">
                <Link href="/platforms">
                  <span className="flex items-center gap-2"><Share2 className="h-4 w-4 text-chart-4" /> Connect Platforms</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </Button>
              <Button asChild variant="secondary" className="w-full justify-between h-12 bg-background/50 hover:bg-background">
                <Link href="/logs">
                  <span className="flex items-center gap-2"><Terminal className="h-4 w-4 text-muted-foreground" /> View System Logs</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, isLoading }: { title: string, value?: number | string, icon: React.ReactNode, isLoading: boolean }) {
  return (
    <Card className="border-muted bg-card/50">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-2xl font-black font-mono" data-testid={`stat-${title.toLowerCase().replace(' ', '-')}`}>
            {value !== undefined ? value : "-"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}