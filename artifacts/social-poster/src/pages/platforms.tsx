import { useState } from "react";
import { useListPlatforms, useUpsertPlatform, useDisconnectPlatform, getListPlatformsQueryKey, getGetDashboardStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiBluesky, SiMastodon, SiDevdotto, SiHashnode, SiTumblr, SiReddit } from "react-icons/si";
import { Share2, Link as LinkIcon, Unlink, Activity, BookOpen, Cloud, Pocket, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PlatformConnection } from "@workspace/api-client-react";

const PLATFORMS = [
  { id: "bluesky", name: "Bluesky", icon: SiBluesky, color: "text-[#0285FF]" },
  { id: "mastodon", name: "Mastodon", icon: SiMastodon, color: "text-[#563ACC]" },
  { id: "misskey", name: "Misskey", icon: Share2, color: "text-[#86B300]" },
  { id: "pixelfed", name: "Pixelfed", icon: Share2, color: "text-[#F1126A]" },
  { id: "dev.to", name: "Dev.to", icon: SiDevdotto, color: "text-foreground" },
  { id: "hashnode", name: "Hashnode", icon: SiHashnode, color: "text-[#2962FF]" },
  { id: "tumblr", name: "Tumblr", icon: SiTumblr, color: "text-[#35465C]" },
  { id: "reddit", name: "Reddit", icon: SiReddit, color: "text-[#FF4500]" },
  { id: "diigo", name: "Diigo", icon: BookOpen, color: "text-[#4078C8]" },
  { id: "raindrop", name: "Raindrop.io", icon: Cloud, color: "text-[#0D85D8]" },
  { id: "pocket", name: "Pocket", icon: Pocket, color: "text-[#EF4056]" },
  { id: "instapaper", name: "Instapaper", icon: FileText, color: "text-foreground" },
];

export default function Platforms() {
  const { data: connections, isLoading } = useListPlatforms();
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);

  const getPlatformConnection = (id: string) => {
    return connections?.find((c: PlatformConnection) => c.platform === id);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tight">Connected Platforms</h1>
        <p className="text-muted-foreground font-mono mt-1 text-sm uppercase">Manage external integrations</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {PLATFORMS.map((platform) => {
          const connection = getPlatformConnection(platform.id);
          const isConnected = connection?.connected;

          return (
            <Card key={platform.id} className="border-muted bg-card/50 flex flex-col relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-muted" style={{ backgroundColor: isConnected ? "hsl(var(--primary))" : undefined }} />
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <div className={`p-3 rounded-xl bg-background border ${isConnected ? "border-primary/50 shadow-[0_0_15px_rgba(var(--primary),0.2)]" : "border-border"}`}>
                  <platform.icon className={`h-6 w-6 ${isConnected ? platform.color : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">{platform.name}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    {isLoading ? (
                      <Skeleton className="h-4 w-16" />
                    ) : isConnected ? (
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-mono text-xs">Connected</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground font-mono text-xs">Disconnected</Badge>
                    )}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex-1 text-sm text-muted-foreground pt-4 pb-6">
                {isConnected && connection ? (
                  <div className="space-y-2 font-mono text-xs">
                    {connection.username && <p><span className="text-foreground">User:</span> {connection.username}</p>}
                    {connection.instanceUrl && <p><span className="text-foreground">Instance:</span> {connection.instanceUrl}</p>}
                    <p><span className="text-foreground">Connected:</span> {new Date(connection.updatedAt).toLocaleDateString()}</p>
                  </div>
                ) : (
                  <p>Connect this platform to automatically publish posts from your campaigns.</p>
                )}
              </CardContent>
              <CardFooter className="pt-0 border-t border-border/50 bg-muted/20 p-4">
                {isConnected ? (
                  <div className="flex gap-2 w-full">
                    <Button variant="outline" className="flex-1 text-xs uppercase tracking-wider" onClick={() => setSelectedPlatform(platform.id)}>
                      <Activity className="h-3 w-3 mr-2" /> Reconfigure
                    </Button>
                    <DisconnectButton platformId={platform.id} />
                  </div>
                ) : (
                  <Button className="w-full text-xs uppercase tracking-wider" variant="secondary" onClick={() => setSelectedPlatform(platform.id)}>
                    <LinkIcon className="h-3 w-3 mr-2" /> Connect
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {selectedPlatform && (
        <PlatformDialog
          platformId={selectedPlatform}
          onClose={() => setSelectedPlatform(null)}
          connection={getPlatformConnection(selectedPlatform)}
        />
      )}
    </div>
  );
}

function DisconnectButton({ platformId }: { platformId: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const disconnectMutation = useDisconnectPlatform();

  const handleDisconnect = () => {
    disconnectMutation.mutate({ platform: platformId }, {
      onSuccess: () => {
        toast({ title: "Platform disconnected", description: "Successfully disconnected the platform." });
        queryClient.invalidateQueries({ queryKey: getListPlatformsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to disconnect platform", variant: "destructive" });
      }
    });
  };

  return (
    <Button variant="destructive" size="icon" onClick={handleDisconnect} disabled={disconnectMutation.isPending} title="Disconnect">
      <Unlink className="h-4 w-4" />
    </Button>
  );
}

type PlatformField = {
  key: string;
  label: string;
  placeholder: string;
  type?: string;
  hint?: string;
};

type PlatformConfig = {
  description: string;
  helpUrl: string;
  fields: PlatformField[];
  fieldMapping: (values: Record<string, string>) => Record<string, string | undefined>;
};

const PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
  bluesky: {
    description: "Use your Bluesky handle and an App Password (not your main password) generated in Settings → App Passwords.",
    helpUrl: "https://bsky.app/settings/app-passwords",
    fields: [
      { key: "username", label: "Handle", placeholder: "you.bsky.social" },
      { key: "appPassword", label: "App Password", placeholder: "xxxx-xxxx-xxxx-xxxx", type: "password", hint: "Generate at bsky.app → Settings → App Passwords" },
    ],
    fieldMapping: (v) => ({ username: v.username, accessToken: v.appPassword }),
  },
  mastodon: {
    description: "Enter your Mastodon instance URL and an access token from your account's development settings.",
    helpUrl: "https://docs.joinmastodon.org/client/token/",
    fields: [
      { key: "instanceUrl", label: "Instance URL", placeholder: "https://mastodon.social" },
      { key: "accessToken", label: "Access Token", placeholder: "••••••••••••••••", type: "password", hint: "Preferences → Development → New Application" },
    ],
    fieldMapping: (v) => ({ instanceUrl: v.instanceUrl, accessToken: v.accessToken }),
  },
  misskey: {
    description: "Enter your Misskey instance URL and an access token from your account settings.",
    helpUrl: "https://misskey-hub.net/en/docs/",
    fields: [
      { key: "instanceUrl", label: "Instance URL", placeholder: "https://misskey.io" },
      { key: "accessToken", label: "Access Token", placeholder: "••••••••••••••••", type: "password", hint: "Settings → API → Generate access token" },
    ],
    fieldMapping: (v) => ({ instanceUrl: v.instanceUrl, accessToken: v.accessToken }),
  },
  pixelfed: {
    description: "Enter your Pixelfed instance URL and an access token from your account's developer settings.",
    helpUrl: "https://pixelfed.social",
    fields: [
      { key: "instanceUrl", label: "Instance URL", placeholder: "https://pixelfed.social" },
      { key: "accessToken", label: "Access Token", placeholder: "••••••••••••••••", type: "password", hint: "Settings → Applications → Create new token" },
    ],
    fieldMapping: (v) => ({ instanceUrl: v.instanceUrl, accessToken: v.accessToken }),
  },
  "dev.to": {
    description: "Create an API key in your Dev.to account settings under Extensions → DEV API Keys.",
    helpUrl: "https://dev.to/settings/extensions",
    fields: [
      { key: "apiKey", label: "API Key", placeholder: "••••••••••••••••", type: "password", hint: "dev.to → Settings → Extensions → DEV API Keys" },
    ],
    fieldMapping: (v) => ({ apiKey: v.apiKey }),
  },
  hashnode: {
    description: "Enter your Hashnode publication ID (slug from your blog URL) and a personal access token.",
    helpUrl: "https://hashnode.com/settings/developer",
    fields: [
      { key: "username", label: "Publication ID / Username", placeholder: "my-blog" },
      { key: "apiKey", label: "Personal Access Token", placeholder: "••••••••••••••••", type: "password", hint: "hashnode.com → Account Settings → Developer" },
    ],
    fieldMapping: (v) => ({ username: v.username, apiKey: v.apiKey }),
  },
  tumblr: {
    description: "Tumblr uses OAuth 1.0a. Register an app at Tumblr's developer portal to get your consumer key and secret, then authorize to receive OAuth tokens.",
    helpUrl: "https://www.tumblr.com/oauth/apps",
    fields: [
      { key: "apiKey", label: "Consumer Key", placeholder: "••••••••••••••••", type: "password", hint: "Tumblr → Apps → Register Application" },
      { key: "apiSecret", label: "Consumer Secret", placeholder: "••••••••••••••••", type: "password" },
      { key: "accessToken", label: "OAuth Token", placeholder: "••••••••••••••••", type: "password", hint: "Obtained after OAuth authorization" },
      { key: "refreshToken", label: "OAuth Token Secret", placeholder: "••••••••••••••••", type: "password" },
    ],
    fieldMapping: (v) => ({ apiKey: v.apiKey, apiSecret: v.apiSecret, accessToken: v.accessToken, refreshToken: v.refreshToken }),
  },
  reddit: {
    description: "Create a 'script' type app on Reddit. Use your Reddit username and password along with the client ID and secret.",
    helpUrl: "https://www.reddit.com/prefs/apps",
    fields: [
      { key: "apiKey", label: "Client ID", placeholder: "••••••••••••", type: "password", hint: "reddit.com → Preferences → Apps → Create app (script type)" },
      { key: "apiSecret", label: "Client Secret", placeholder: "••••••••••••••••••••••••••••••", type: "password" },
      { key: "username", label: "Reddit Username", placeholder: "u/yourname" },
      { key: "password", label: "Reddit Password", placeholder: "••••••••", type: "password" },
    ],
    fieldMapping: (v) => ({ apiKey: v.apiKey, apiSecret: v.apiSecret, username: v.username, password: v.password }),
  },
  diigo: {
    description: "Diigo uses API key authentication. Get your API key from Diigo's tools page. Your Diigo username is also required.",
    helpUrl: "https://www.diigo.com/api_keys/new/",
    fields: [
      { key: "apiKey", label: "API Key", placeholder: "••••••••••••••••", type: "password", hint: "diigo.com/api_keys/new/" },
      { key: "username", label: "Diigo Username", placeholder: "yourusername" },
    ],
    fieldMapping: (v) => ({ apiKey: v.apiKey, username: v.username }),
  },
  raindrop: {
    description: "Create a test token from your Raindrop.io developer settings. No complex OAuth setup required.",
    helpUrl: "https://app.raindrop.io/settings/integrations",
    fields: [
      { key: "accessToken", label: "Access Token / Test Token", placeholder: "••••••••••••••••", type: "password", hint: "app.raindrop.io → Settings → Integrations → Create app → Test token" },
    ],
    fieldMapping: (v) => ({ accessToken: v.accessToken }),
  },
  pocket: {
    description: "Pocket uses OAuth. Register an app to get a consumer key, then complete the OAuth flow to receive an access token.",
    helpUrl: "https://getpocket.com/developer/apps/new",
    fields: [
      { key: "apiKey", label: "Consumer Key", placeholder: "••••••-••••-••••-••••-••••••••••••••", type: "password", hint: "getpocket.com/developer/apps/new" },
      { key: "accessToken", label: "Access Token", placeholder: "••••••••-••••-••••-••••-••••••••••••••", type: "password", hint: "Obtained after OAuth authorization" },
    ],
    fieldMapping: (v) => ({ apiKey: v.apiKey, accessToken: v.accessToken }),
  },
  instapaper: {
    description: "Instapaper uses your account email and password for API access. No separate API key required for basic integration.",
    helpUrl: "https://www.instapaper.com/api",
    fields: [
      { key: "username", label: "Email / Username", placeholder: "you@example.com" },
      { key: "password", label: "Password", placeholder: "••••••••", type: "password" },
    ],
    fieldMapping: (v) => ({ username: v.username, password: v.password }),
  },
};

function PlatformDialog({ platformId, onClose, connection }: { platformId: string, onClose: () => void, connection?: PlatformConnection }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const upsertMutation = useUpsertPlatform();

  const platform = PLATFORMS.find(p => p.id === platformId);
  const config = PLATFORM_CONFIGS[platformId];

  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    if (config) {
      config.fields.forEach(f => { init[f.key] = ""; });
    }
    if (connection?.username) init["username"] = connection.username;
    if (connection?.instanceUrl) init["instanceUrl"] = connection.instanceUrl;
    return init;
  });

  const handleSave = () => {
    if (!config) return;
    const mapped = config.fieldMapping(values);
    upsertMutation.mutate({
      platform: platformId,
      data: mapped,
    }, {
      onSuccess: () => {
        toast({ title: "Platform connected", description: `Successfully connected ${platform?.name}.` });
        queryClient.invalidateQueries({ queryKey: getListPlatformsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
        onClose();
      },
      onError: () => {
        toast({ title: "Connection failed", description: "Could not save platform credentials.", variant: "destructive" });
      }
    });
  };

  if (!config) return null;

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {platform?.icon && <platform.icon className={`h-5 w-5 ${platform.color}`} />}
            Connect {platform?.name}
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            {config.description}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          {config.fields.map(field => (
            <div key={field.key} className="grid gap-1.5">
              <Label htmlFor={field.key}>{field.label}</Label>
              <Input
                id={field.key}
                type={field.type ?? "text"}
                value={values[field.key] ?? ""}
                onChange={e => setValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                className="font-mono text-sm"
              />
              {field.hint && (
                <p className="text-[11px] text-muted-foreground font-mono">{field.hint}</p>
              )}
            </div>
          ))}
          <a
            href={config.helpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary underline underline-offset-2 font-mono"
          >
            → Open {platform?.name} developer settings ↗
          </a>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={upsertMutation.isPending}>
            {upsertMutation.isPending ? "Connecting..." : "Connect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
