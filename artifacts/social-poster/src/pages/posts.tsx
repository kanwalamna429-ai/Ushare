import { useState } from "react";
import { useListPosts, useRetryPost } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, ExternalLink, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SiBluesky, SiMastodon, SiDevdotto, SiHashnode } from "react-icons/si";

const getPlatformIcon = (platform: string) => {
  switch (platform) {
    case 'bluesky': return <SiBluesky className="h-4 w-4 text-[#0285FF]" />;
    case 'mastodon': return <SiMastodon className="h-4 w-4 text-[#563ACC]" />;
    case 'devto': return <SiDevdotto className="h-4 w-4" />;
    case 'hashnode': return <SiHashnode className="h-4 w-4 text-[#2962FF]" />;
    default: return <div className="h-4 w-4 rounded-full bg-muted-foreground/30 flex items-center justify-center text-[8px] font-bold">P</div>;
  }
};

export default function Posts() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const limit = 15;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: postsList, isLoading } = useListPosts({ status: statusFilter || undefined, page, limit });
  const retryMutation = useRetryPost();

  const handleRetry = (id: number) => {
    retryMutation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Post queued for retry" });
        queryClient.invalidateQueries({ queryKey: ["/api/posts"] }); // Invalidate list
      },
      onError: () => toast({ title: "Failed to retry", variant: "destructive" })
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">Posts</h1>
          <p className="text-muted-foreground font-mono mt-1 text-sm uppercase">Global publication log</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val === 'all' ? '' : val); setPage(1); }}>
          <SelectTrigger className="w-[180px] bg-card/50">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-muted bg-card/50">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="font-mono text-xs uppercase w-12">Plat</TableHead>
                <TableHead className="font-mono text-xs uppercase">Content</TableHead>
                <TableHead className="font-mono text-xs uppercase w-32">Status</TableHead>
                <TableHead className="font-mono text-xs uppercase w-40 text-right">Time</TableHead>
                <TableHead className="font-mono text-xs uppercase w-20 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-64" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : postsList?.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground font-mono">No posts found</TableCell>
                </TableRow>
              ) : (
                postsList?.items.map(post => (
                  <TableRow key={post.id} className="border-border/50">
                    <TableCell>{getPlatformIcon(post.platform)}</TableCell>
                    <TableCell className="max-w-[200px] md:max-w-md">
                      <div className="font-medium line-clamp-1">{post.title || "Untitled Post"}</div>
                      {post.errorMessage && (
                        <div className="text-xs text-destructive flex items-center gap-1 mt-1 font-mono line-clamp-1">
                          <AlertCircle className="h-3 w-3 shrink-0" /> {post.errorMessage}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={post.status === 'published' ? 'default' : post.status === 'failed' ? 'destructive' : 'secondary'} className="uppercase text-[10px] tracking-wider">
                        {post.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono text-muted-foreground">
                      {post.status === 'published' && post.publishedAt ? new Date(post.publishedAt).toLocaleString() : 
                       post.scheduledAt ? new Date(post.scheduledAt).toLocaleString() : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {post.status === 'failed' && (
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleRetry(post.id)} title="Retry">
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      )}
                      {post.status === 'published' && post.url && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" asChild title="View Post">
                          <a href={post.url} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3" /></a>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {postsList && postsList.total > limit && (
        <div className="flex justify-center gap-2 mt-4">
          <Button variant="outline" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</Button>
          <span className="flex items-center text-sm font-mono px-4 text-muted-foreground">Page {page}</span>
          <Button variant="outline" disabled={page * limit >= postsList.total} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}