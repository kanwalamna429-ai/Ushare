import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  useGetSettings, useUpdateSettings, useChangePassword, useChangeUsername,
  useGetSupabaseConfig, useUpdateSupabaseConfig,
  getGetSettingsQueryKey, getGetSupabaseConfigQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Save, Lock, ShieldAlert, User, Database, Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

const settingsSchema = z.object({
  timezone: z.string(),
  defaultHashtags: z.string(),
  retryCount: z.coerce.number().min(0).max(10),
  schedulerEnabled: z.boolean(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

const usernameSchema = z.object({
  currentPassword: z.string().min(1, "Current password required"),
  newUsername: z.string().min(1, "New username required"),
});

const supabaseSchema = z.object({
  projectUrl: z.string().url("Must be a valid URL (e.g. https://xxx.supabase.co)").or(z.literal("")).optional(),
  anonKey: z.string().optional(),
  serviceRoleKey: z.string().optional(),
  jwtSecret: z.string().optional(),
});

const TIMEZONES = Intl.supportedValuesOf('timeZone');

function MaskedInput({ value, placeholder, onChange, id }: { value: string; placeholder?: string; onChange: (v: string) => void; id?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? "••••••••••••••••"}
        className="bg-background/80 font-mono text-sm pr-10"
      />
      <button type="button" onClick={() => setShow(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: settingsData, isLoading } = useGetSettings();
  const { data: supabaseData, isLoading: supabaseLoading } = useGetSupabaseConfig();
  const updateSettingsMutation = useUpdateSettings();
  const passwordMutation = useChangePassword();
  const usernameMutation = useChangeUsername();
  const supabaseMutation = useUpdateSupabaseConfig();

  const settingsForm = useForm<z.infer<typeof settingsSchema>>({
    resolver: zodResolver(settingsSchema),
    defaultValues: { timezone: "UTC", defaultHashtags: "", retryCount: 3, schedulerEnabled: true },
  });

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "" },
  });

  const usernameForm = useForm<z.infer<typeof usernameSchema>>({
    resolver: zodResolver(usernameSchema),
    defaultValues: { currentPassword: "", newUsername: "" },
  });

  const [supabaseFields, setSupabaseFields] = useState({
    projectUrl: "",
    anonKey: "",
    serviceRoleKey: "",
    jwtSecret: "",
  });

  useEffect(() => {
    if (settingsData) {
      settingsForm.reset({
        timezone: settingsData.timezone || "UTC",
        defaultHashtags: settingsData.defaultHashtags || "",
        retryCount: settingsData.retryCount ?? 3,
        schedulerEnabled: settingsData.schedulerEnabled ?? true,
      });
    }
  }, [settingsData, settingsForm]);

  useEffect(() => {
    if (supabaseData) {
      setSupabaseFields({
        projectUrl: supabaseData.projectUrl ?? "",
        anonKey: supabaseData.anonKey ?? "",
        serviceRoleKey: supabaseData.serviceRoleKey ?? "",
        jwtSecret: supabaseData.jwtSecret ?? "",
      });
    }
  }, [supabaseData]);

  function onSettingsSubmit(values: z.infer<typeof settingsSchema>) {
    updateSettingsMutation.mutate({ data: values }, {
      onSuccess: () => {
        toast({ title: "Settings Saved", description: "Global configuration updated successfully." });
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
      }
    });
  }

  function onPasswordSubmit(values: z.infer<typeof passwordSchema>) {
    passwordMutation.mutate({ data: values }, {
      onSuccess: () => {
        toast({ title: "Password Updated", description: "Your credentials have been changed." });
        passwordForm.reset();
      },
      onError: () => {
        toast({ title: "Update Failed", description: "Please check your current password.", variant: "destructive" });
      }
    });
  }

  function onUsernameSubmit(values: z.infer<typeof usernameSchema>) {
    usernameMutation.mutate({ data: values }, {
      onSuccess: () => {
        toast({ title: "Username Updated", description: "Your admin username has been changed." });
        usernameForm.reset();
      },
      onError: () => {
        toast({ title: "Update Failed", description: "Please check your current password.", variant: "destructive" });
      }
    });
  }

  function onSupabaseSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = supabaseSchema.safeParse(supabaseFields);
    if (!parsed.success) {
      toast({ title: "Validation Error", description: parsed.error.issues[0]?.message ?? "Invalid input.", variant: "destructive" });
      return;
    }
    supabaseMutation.mutate({ data: supabaseFields }, {
      onSuccess: () => {
        toast({ title: "Supabase Config Saved", description: "Integration credentials updated." });
        queryClient.invalidateQueries({ queryKey: getGetSupabaseConfigQueryKey() });
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to save Supabase config.", variant: "destructive" });
      }
    });
  }

  if (isLoading) return <div className="p-8">Loading settings...</div>;

  return (
    <div className="space-y-8 max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tight">System Configuration</h1>
        <p className="text-muted-foreground font-mono mt-1 text-sm uppercase">Global application settings</p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <div className="md:col-span-2 space-y-8">
          {/* Engine Settings */}
          <Card className="border-muted bg-card/50">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wider text-primary">Engine Settings</CardTitle>
              <CardDescription>Configure auto-poster behavior and global defaults.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...settingsForm}>
                <form onSubmit={settingsForm.handleSubmit(onSettingsSubmit)} className="space-y-6">
                  <FormField
                    control={settingsForm.control}
                    name="schedulerEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base font-bold text-primary">Master Switch</FormLabel>
                          <FormDescription className="font-mono text-xs">
                            Enable or disable all outgoing automated posts
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <div className="grid gap-6 md:grid-cols-2">
                    <FormField
                      control={settingsForm.control}
                      name="timezone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>System Timezone</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-background/50 font-mono text-sm">
                                <SelectValue placeholder="Select timezone" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {TIMEZONES.map(tz => <SelectItem key={tz} value={tz}>{tz}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={settingsForm.control}
                      name="retryCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Retries</FormLabel>
                          <FormControl>
                            <Input type="number" min={0} max={10} className="bg-background/50 font-mono" {...field} />
                          </FormControl>
                          <FormDescription className="text-xs">Failed post retry attempts</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={settingsForm.control}
                    name="defaultHashtags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Global Default Hashtags</FormLabel>
                        <FormControl>
                          <Input placeholder="#tech #programming" className="bg-background/50 font-mono" {...field} />
                        </FormControl>
                        <FormDescription className="text-xs">Appended to AI generated posts if space permits</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={updateSettingsMutation.isPending}>
                    {updateSettingsMutation.isPending ? "Saving..." : <><Save className="h-4 w-4 mr-2" /> Save Configuration</>}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Supabase Integration */}
          <Card className="border-muted bg-card/50 relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-5 pointer-events-none">
              <Database className="h-36 w-36 -mt-8 -mr-8 text-emerald-400" />
            </div>
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                <Database className="h-4 w-4" /> Supabase Integration
              </CardTitle>
              <CardDescription>
                Store your Supabase project credentials for client-side database access and realtime features.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {supabaseLoading ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : (
                <form onSubmit={onSupabaseSubmit} className="space-y-5">
                  {supabaseData?.databaseUrl && (
                    <div className="rounded-md border border-border/50 bg-muted/30 p-3 space-y-1">
                      <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Active Database URL</p>
                      <p className="text-xs font-mono text-foreground break-all">{supabaseData.databaseUrl}</p>
                      <Badge variant="outline" className="text-[10px] font-mono mt-1">
                        Set via DATABASE_URL environment variable
                      </Badge>
                    </div>
                  )}

                  <div className="grid gap-1.5">
                    <label className="text-sm font-medium" htmlFor="sb-project-url">Project URL</label>
                    <Input
                      id="sb-project-url"
                      value={supabaseFields.projectUrl}
                      onChange={e => setSupabaseFields(p => ({ ...p, projectUrl: e.target.value }))}
                      placeholder="https://xxxxxxxxxxxxxxxxxxxx.supabase.co"
                      className="bg-background/80 font-mono text-sm"
                    />
                    <p className="text-[11px] text-muted-foreground font-mono">Supabase Dashboard → Project Settings → API → Project URL</p>
                  </div>

                  <div className="grid gap-1.5">
                    <label className="text-sm font-medium" htmlFor="sb-anon-key">Anon / Public Key</label>
                    <MaskedInput
                      id="sb-anon-key"
                      value={supabaseFields.anonKey}
                      onChange={v => setSupabaseFields(p => ({ ...p, anonKey: v }))}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    />
                    <p className="text-[11px] text-muted-foreground font-mono">Safe to use in browser — restricted by Row Level Security</p>
                  </div>

                  <div className="grid gap-1.5">
                    <label className="text-sm font-medium" htmlFor="sb-service-key">Service Role Key <span className="text-destructive text-xs">(secret)</span></label>
                    <MaskedInput
                      id="sb-service-key"
                      value={supabaseFields.serviceRoleKey}
                      onChange={v => setSupabaseFields(p => ({ ...p, serviceRoleKey: v }))}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    />
                    <p className="text-[11px] text-muted-foreground font-mono">Keep secret — bypasses Row Level Security. Server-side use only.</p>
                  </div>

                  <div className="grid gap-1.5">
                    <label className="text-sm font-medium" htmlFor="sb-jwt-secret">JWT Secret <span className="text-destructive text-xs">(secret)</span></label>
                    <MaskedInput
                      id="sb-jwt-secret"
                      value={supabaseFields.jwtSecret}
                      onChange={v => setSupabaseFields(p => ({ ...p, jwtSecret: v }))}
                      placeholder="your-jwt-secret"
                    />
                    <p className="text-[11px] text-muted-foreground font-mono">Supabase Dashboard → Project Settings → API → JWT Settings</p>
                  </div>

                  <Button type="submit" disabled={supabaseMutation.isPending} className="w-full sm:w-auto">
                    {supabaseMutation.isPending ? "Saving..." : <><Save className="h-4 w-4 mr-2" /> Save Supabase Config</>}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          {/* Admin Username */}
          <Card className="border-muted/40 bg-card/50 relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-5 pointer-events-none">
              <User className="h-32 w-32 -mt-8 -mr-8 text-primary" />
            </div>
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wider text-primary flex items-center gap-2">
                <User className="h-4 w-4" /> Admin Username
              </CardTitle>
              <CardDescription>Change your admin login username.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...usernameForm}>
                <form onSubmit={usernameForm.handleSubmit(onUsernameSubmit)} className="space-y-4">
                  <FormField
                    control={usernameForm.control}
                    name="newUsername"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Username</FormLabel>
                        <FormControl>
                          <Input placeholder="new-admin" className="bg-background/80" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={usernameForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" className="bg-background/80" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" variant="outline" className="w-full" disabled={usernameMutation.isPending}>
                    {usernameMutation.isPending ? "Updating..." : "Update Username"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Security */}
          <Card className="border-destructive/20 bg-destructive/5 relative overflow-hidden">
            <div className="absolute right-0 top-0 opacity-10">
              <ShieldAlert className="h-32 w-32 -mt-8 -mr-8 text-destructive" />
            </div>
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wider text-destructive flex items-center gap-2">
                <Lock className="h-4 w-4" /> Security
              </CardTitle>
              <CardDescription>Update your access passphrase.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                  <FormField
                    control={passwordForm.control}
                    name="currentPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Passphrase</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" className="bg-background/80" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={passwordForm.control}
                    name="newPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Passphrase</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" className="bg-background/80" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" variant="destructive" className="w-full" disabled={passwordMutation.isPending}>
                    {passwordMutation.isPending ? "Updating..." : "Update Passphrase"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
