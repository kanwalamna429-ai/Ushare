import { useState } from "react";
import { useListLogs } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Info, AlertTriangle, Terminal as TermIcon } from "lucide-react";

export default function Logs() {
  const [page, setPage] = useState(1);
  const [level, setLevel] = useState<string>("");
  const limit = 50;

  const { data: logsList, isLoading } = useListLogs({ level: level || undefined, page, limit });

  return (
    <div className="space-y-6 h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-tight">System Logs</h1>
          <p className="text-muted-foreground font-mono mt-1 text-sm uppercase">Diagnostics & execution trace</p>
        </div>
        <Select value={level} onValueChange={(val) => { setLevel(val === 'all' ? '' : val); setPage(1); }}>
          <SelectTrigger className="w-[180px] bg-card/50">
            <SelectValue placeholder="All Levels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warn">Warning</SelectItem>
            <SelectItem value="error">Error</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-muted bg-[#0D1117] flex-1 flex flex-col min-h-0 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-chart-4 to-primary opacity-50" />
        <CardHeader className="py-3 px-4 border-b border-white/10 bg-black/40 shrink-0 flex flex-row items-center gap-2">
          <TermIcon className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-xs font-mono font-normal text-muted-foreground">terminal_stdout_tty1</CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-auto bg-transparent">
          <div className="font-mono text-xs sm:text-sm p-4 w-full text-zinc-300">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/2 bg-zinc-800" />
                <Skeleton className="h-4 w-3/4 bg-zinc-800" />
                <Skeleton className="h-4 w-1/3 bg-zinc-800" />
              </div>
            ) : logsList?.items.length === 0 ? (
              <div className="text-zinc-600 italic">No log entries found.</div>
            ) : (
              logsList?.items.map((log) => (
                <div key={log.id} className="mb-1 flex hover:bg-white/5 py-1 px-2 rounded -mx-2">
                  <span className="text-zinc-500 w-44 shrink-0 hidden sm:inline-block">
                    [{new Date(log.createdAt).toISOString()}]
                  </span>
                  <span className={`w-16 shrink-0 font-bold uppercase
                    ${log.level === 'error' ? 'text-red-400' : log.level === 'warn' ? 'text-yellow-400' : 'text-blue-400'}`}>
                    {log.level}
                  </span>
                  <span className="flex-1 whitespace-pre-wrap break-all">
                    {log.message}
                    {log.platform && <span className="text-zinc-500 ml-2">({log.platform})</span>}
                    {log.campaignId && <span className="text-zinc-500 ml-2">[C:{log.campaignId}]</span>}
                    {log.details && (
                      <span className="block text-zinc-500 text-[10px] mt-0.5 ml-2 border-l border-zinc-700 pl-2">
                        {log.details}
                      </span>
                    )}
                  </span>
                </div>
              ))
            )}
          </div>
        </CardContent>
        {logsList && logsList.total > limit && (
          <div className="border-t border-white/10 bg-black/40 p-2 flex justify-between items-center text-xs font-mono text-zinc-500 shrink-0">
            <span>Viewing {Math.min(limit, logsList.items.length)} of {logsList.total} entries</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="h-6 px-2 hover:bg-white/10 hover:text-white" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Prev</Button>
              <Button variant="ghost" size="sm" className="h-6 px-2 hover:bg-white/10 hover:text-white" disabled={page * limit >= logsList.total} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}