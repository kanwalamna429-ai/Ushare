import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useLocation } from "wouter";
import { useCreateCampaign } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save } from "lucide-react";
import { Link } from "wouter";
import { CampaignInputScheduleType } from "@workspace/api-client-react";

const PLATFORMS = [
  { id: "bluesky", label: "Bluesky" },
  { id: "mastodon", label: "Mastodon" },
  { id: "misskey", label: "Misskey" },
  { id: "pixelfed", label: "Pixelfed" },
  { id: "dev.to", label: "Dev.to" },
  { id: "hashnode", label: "Hashnode" },
  { id: "tumblr", label: "Tumblr" },
  { id: "reddit", label: "Reddit" },
  { id: "diigo", label: "Diigo" },
  { id: "raindrop", label: "Raindrop.io" },
  { id: "pocket", label: "Pocket" },
  { id: "instapaper", label: "Instapaper" },
];

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  description: z.string().optional(),
  platforms: z.array(z.string()).refine((value) => value.length > 0, {
    message: "You have to select at least one platform.",
  }),
  scheduleType: z.enum(["frequency", "custom"]),
  frequency: z.string().optional(),
  scheduledAt: z.string().optional(),
  timezone: z.string().default("UTC"),
});

export default function CampaignNew() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createMutation = useCreateCampaign();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      platforms: [],
      scheduleType: "frequency",
      frequency: "1h",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    },
  });

  const scheduleType = form.watch("scheduleType");

  function onSubmit(values: z.infer<typeof formSchema>) {
    createMutation.mutate({ 
      data: {
        ...values,
        scheduleType: values.scheduleType as CampaignInputScheduleType,
      } 
    }, {
      onSuccess: (data) => {
        toast({ title: "Campaign created", description: "Your campaign has been successfully created." });
        setLocation(`/campaigns/${data.id}`);
      },
      onError: () => {
        toast({ title: "Error", description: "Failed to create campaign.", variant: "destructive" });
      }
    });
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="shrink-0">
          <Link href="/campaigns"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">New Campaign</h1>
          <p className="text-muted-foreground font-mono mt-1 text-sm uppercase">Configure automated posting workflow</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card className="border-muted bg-card/50">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wider text-primary">General Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campaign Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Weekly Tech Blog Updates" className="bg-background/50" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="What is this campaign for?" className="bg-background/50 resize-none h-24" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className="border-muted bg-card/50">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wider text-primary">Target Platforms</CardTitle>
              <CardDescription>Select the platforms this campaign will post to.</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="platforms"
                render={() => (
                  <FormItem>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {PLATFORMS.map((item) => (
                        <FormField
                          key={item.id}
                          control={form.control}
                          name="platforms"
                          render={({ field }) => {
                            return (
                              <FormItem key={item.id} className="flex flex-row items-start space-x-3 space-y-0 rounded-md border border-muted p-4 hover:bg-muted/50 cursor-pointer transition-colors">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(item.id)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...field.value, item.id])
                                        : field.onChange(
                                            field.value?.filter(
                                              (value) => value !== item.id
                                            )
                                          )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer w-full">{item.label}</FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage className="mt-4" />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className="border-muted bg-card/50">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wider text-primary">Scheduling</CardTitle>
              <CardDescription>Determine when posts should be published.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="scheduleType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Schedule Mode</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex flex-col space-y-1"
                      >
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl><RadioGroupItem value="frequency" /></FormControl>
                          <FormLabel className="font-normal">Drip / Frequency (Post sequentially over time)</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-3 space-y-0">
                          <FormControl><RadioGroupItem value="custom" /></FormControl>
                          <FormLabel className="font-normal">Specific Date & Time</FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {scheduleType === "frequency" && (
                <FormField
                  control={form.control}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Posting Frequency</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background/50"><SelectValue placeholder="Select a frequency" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="15m">Every 15 minutes</SelectItem>
                          <SelectItem value="30m">Every 30 minutes</SelectItem>
                          <SelectItem value="1h">Every hour</SelectItem>
                          <SelectItem value="3h">Every 3 hours</SelectItem>
                          <SelectItem value="6h">Every 6 hours</SelectItem>
                          <SelectItem value="12h">Every 12 hours</SelectItem>
                          <SelectItem value="1d">Once a day</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {scheduleType === "custom" && (
                <FormField
                  control={form.control}
                  name="scheduledAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date & Time</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" className="bg-background/50 w-full sm:w-auto" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button asChild variant="outline"><Link href="/campaigns">Cancel</Link></Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Saving..." : <><Save className="h-4 w-4 mr-2" /> Create Campaign</>}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}