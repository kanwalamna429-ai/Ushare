import { useState } from "react";
import { useParams, Link } from "wouter";
import { 
  useGetCampaign, 
  useListCampaignUrlItems, 
  useAddUrlsToCampaign,
  useRemoveCampaignUrl,
  useExtractUrlContent,
  useGeneratePostContent,
  useActivateCampaign,
  usePauseCampaign,
  useDeleteCampaign,
  getGetCampaignQueryKey,
  getListCampaignUrlItemsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Play, Pause, Trash2, Link as LinkIcon, Download, Sparkles, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function CampaignDetail() {
  const params = useParams();
  const id = parseInt(params.id || "0", 10);
  const [urlsInput, setUrlsInput] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: campaign, isLoading: loadingCampaign } = useGetCampaign(id, {
    query: { enabled: !!id, queryKey: getGetCampaignQueryKey(id) }
  });

  const { data: urlsList, isLoading: loadingUrls } = useListCampaignUrlItems(id, {
    query: { enabled: !!id, queryKey: getListCampaignUrlItemsQueryKey(id) }
  });

  const addUrlsMutation = useAddUrlsToCampaign();
  const activateMutation = useActivateCampaign();
  const pauseMutation = usePauseCampaign();
  const deleteMutation = useDeleteCampaign();
  const extractMutation = useExtractUrlContent();
  const generateMutation = useGeneratePostContent();
  const removeUrlMutation = useRemoveCampaignUrl();

  const handleAddUrls = () => {
    const urls = urlsInput.split("\n").map(u => u.trim()).filter(u => u.length > 0);
    if (urls.length === 0) return;

    addUrlsMutation.mutate({
      id,
      data: { urls }
    }, {
      onSuccess: (result) => {
        toast({ title: "URLs Imported", description: `Added ${result.added}, Duplicate ${result.duplicates}, Invalid ${result.invalid}` });
        setUrlsInput("");
        queryClient.invalidateQueries({ queryKey: getListCampaignUrlItemsQueryKey(id) });
        queryClient.invalidateQueries({ queryKey: getGetCampaignQueryKey(id) });
      },
      onError: () => {
        toast({ title: "Import failed", variant: "destructive" });
      }
    });
  };

  const handleActivate = () => {
    activateMutation.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetCampaignQueryKey(id) })
    });
  };

  const handlePause = () => {
    pauseMutation.mutate({ id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetCampaignQueryKey(id) })
    });
  };

  if (loadingCampaign) return <div className="p-8 space-y-4"><Skeleton className="h-12 w-1/3" /><Skeleton className="h-64 w-full" /></div>;
  if (!campaign) return <div className="p-8">Campaign not found</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Button asChild variant="ghost" size="icon" className="shrink-0 mt-1">
            <Link href="/campaigns"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black uppercase tracking-tight">{campaign.name}</h1>
              <Badge variant={
                campaign.status === 'active' ? 'default' : 
                campaign.status === 'paused' ? 'secondary' : 
                campaign.status === 'completed' ? 'outline' : 'outline'
              } className="uppercase text-[10px] tracking-wider shrink-0">
                {campaign.status}
              </Badge>
            </div>
            <p className="text-muted-foreground font-mono mt-2 text-sm max-w-2xl">{campaign.description || "No description provided."}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {campaign.status !== 'active' && campaign.status !== 'completed' && (
            <Button onClick={handleActivate} disabled={activateMutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Play className="h-4 w-4 mr-2" /> Activate
            </Button>
          )}
          {campaign.status === 'active' && (
            <Button onClick={handlePause} disabled={pauseMutation.isPending} variant="secondary">
              <Pause className="h-4 w-4 mr-2" /> Pause
            </Button>
          )}
          <Button variant="destructive" size="icon" onClick={() => {
            if(confirm("Are you sure you want to delete this campaign?")) {
              deleteMutation.mutate({ id }, {
                onSuccess: () => window.location.href = "/campaigns"
              });
            }
          }}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 border-muted bg-card/50">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wider text-primary">Import Content URLs</CardTitle>
            <CardDescription>Paste one URL per line to add to this campaign pipeline.</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea 
              value={urlsInput} 
              onChange={e => setUrlsInput(e.target.value)} 
              placeholder="https://example.com/article-1&#10;https://example.com/article-2" 
              className="font-mono text-sm bg-background/50 resize-y mb-4" 
              rows={5}
            />
            <Button onClick={handleAddUrls} disabled={addUrlsMutation.isPending || !urlsInput.trim()}>
              <LinkIcon className="h-4 w-4 mr-2" /> Add URLs to Pipeline
            </Button>
          </CardContent>
        </Card>

        <Card className="border-muted bg-card/50">
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wider text-primary">Pipeline Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex justify-between text-xs font-mono mb-2">
                <span className="text-muted-foreground">Overall Progress</span>
                <span className="font-bold">{campaign.processedUrls} / {campaign.totalUrls}</span>
              </div>
              <Progress value={campaign.progressPct || 0} className="h-2" />
            </div>
            
            <div className="space-y-2 text-sm font-mono">
              <div className="flex justify-between pb-2 border-b border-border/50">
                <span className="text-muted-foreground">Schedule</span>
                <span>{campaign.scheduleType === 'frequency' ? `Every ${campaign.frequency}` : 'Custom Date'}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-border/50">
                <span className="text-muted-foreground">Platforms</span>
                <span className="text-right max-w-[120px] truncate">{campaign.platforms.join(", ")}</span>
              </div>
              <div className="flex justify-between pb-2">
                <span className="text-muted-foreground">Created</span>
                <span>{new Date(campaign.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-muted bg-card/50">
        <CardHeader>
          <CardTitle className="text-sm uppercase tracking-wider text-primary">Content Queue</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loadingUrls ? (
            <div className="p-6 space-y-4"><Skeleton className="h-8 w-full"/><Skeleton className="h-8 w-full"/></div>
          ) : urlsList?.items.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground font-mono text-sm">Queue is empty. Import URLs above to start.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="font-mono text-xs uppercase">URL / Title</TableHead>
                  <TableHead className="font-mono text-xs uppercase w-[150px]">Status</TableHead>
                  <TableHead className="font-mono text-xs uppercase text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {urlsList?.items.map(url => (
                  <TableRow key={url.id} className="border-border/50">
                    <TableCell className="max-w-xs md:max-w-md">
                      <div className="font-medium line-clamp-1">{url.title || "No title extracted"}</div>
                      <div className="text-xs text-muted-foreground font-mono line-clamp-1 mt-1" title={url.url}>{url.url}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-[10px] uppercase">{url.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button 
                        variant="secondary" size="icon" className="h-8 w-8" title="Extract Content"
                        onClick={() => extractMutation.mutate({ id, urlId: url.id }, {
                          onSuccess: () => queryClient.invalidateQueries({ queryKey: getListCampaignUrlItemsQueryKey(id) })
                        })}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        variant="secondary" size="icon" className="h-8 w-8" title="Generate AI Posts"
                        onClick={() => generateMutation.mutate({ 
                          id,
                          urlId: url.id,
                          data: { platforms: campaign.platforms }
                        }, {
                          onSuccess: () => queryClient.invalidateQueries({ queryKey: getListCampaignUrlItemsQueryKey(id) })
                        })}
                      >
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                      </Button>
                      <Button 
                        variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" title="Remove"
                        onClick={() => removeUrlMutation.mutate({ id, urlId: url.id }, {
                          onSuccess: () => {
                            queryClient.invalidateQueries({ queryKey: getListCampaignUrlItemsQueryKey(id) });
                            queryClient.invalidateQueries({ queryKey: getGetCampaignQueryKey(id) });
                          }
                        })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}