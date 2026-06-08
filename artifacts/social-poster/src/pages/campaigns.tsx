import { useState } from "react";
import { useListCampaigns, getListCampaignsQueryKey } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Search, Plus, Calendar, Settings2, BarChart2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Campaigns() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string>("");
  const limit = 10;

  const { data: campaignsList, isLoading } = useListCampaigns({ status: status || undefined, page, limit });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground font-mono mt-1 text-sm uppercase">Manage automated workflows</p>
        </div>
        <Button asChild>
          <Link href="/campaigns/new">
            <Plus className="mr-2 h-4 w-4" /> Create Campaign
          </Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search campaigns..." className="pl-9 bg-card/50" disabled />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px] bg-card/50">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          [...Array(3)].map((_, i) => (
            <Card key={i} className="border-muted bg-card/50">
              <CardContent className="p-6">
                <Skeleton className="h-6 w-1/3 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))
        ) : campaignsList?.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 border rounded-lg bg-card/20 border-dashed text-center">
            <Settings2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-bold">No campaigns found</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-2 mb-6">You haven't created any campaigns yet. Create one to start automating your social media posts.</p>
            <Button asChild>
              <Link href="/campaigns/new">Create Campaign</Link>
            </Button>
          </div>
        ) : (
          campaignsList?.items.map(campaign => (
            <Card key={campaign.id} className="border-muted bg-card/50 hover:border-primary/50 transition-colors group overflow-hidden">
              <div className="flex flex-col md:flex-row">
                <div className="p-6 flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <Link href={`/campaigns/${campaign.id}`} className="text-xl font-bold hover:text-primary transition-colors line-clamp-1">
                      {campaign.name}
                    </Link>
                    <Badge variant={
                      campaign.status === 'active' ? 'default' : 
                      campaign.status === 'paused' ? 'secondary' : 
                      campaign.status === 'completed' ? 'outline' : 'outline'
                    } className="uppercase text-[10px] tracking-wider ml-2 shrink-0">
                      {campaign.status}
                    </Badge>
                  </div>
                  
                  {campaign.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                      {campaign.description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-4 text-xs font-mono text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {campaign.scheduleType === 'frequency' ? `Every ${campaign.frequency}` : new Date(campaign.scheduledAt || '').toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <BarChart2 className="h-3.5 w-3.5" />
                      {campaign.platforms.length} Platforms
                    </div>
                  </div>
                </div>

                <div className="bg-muted/20 border-t md:border-t-0 md:border-l border-border p-6 flex flex-col justify-center w-full md:w-64 shrink-0">
                  <div className="flex justify-between text-xs font-mono mb-2">
                    <span>Progress</span>
                    <span className="font-bold">{campaign.processedUrls} / {campaign.totalUrls}</span>
                  </div>
                  <Progress value={campaign.progressPct || 0} className="h-2 bg-muted-foreground/20" />
                  <div className="mt-4 flex gap-2">
                    <Button asChild variant="secondary" className="w-full text-xs h-8">
                      <Link href={`/campaigns/${campaign.id}`}>Manage</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Basic Pagination */}
      {campaignsList && campaignsList.total > limit && (
        <div className="flex justify-center gap-2 mt-8">
          <Button variant="outline" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</Button>
          <Button variant="outline" disabled={page * limit >= campaignsList.total} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}