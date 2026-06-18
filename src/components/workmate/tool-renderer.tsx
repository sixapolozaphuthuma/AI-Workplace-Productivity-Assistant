import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput } from "@/components/ai-elements/tool";
import type { ToolUIPart } from "ai";

function EmailOutput({ data }: { data: any }) {
  return (
    <div className="space-y-2 text-sm">
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="rounded bg-secondary px-2 py-0.5">To: {data.recipient}</span>
        <span className="rounded bg-secondary px-2 py-0.5 capitalize">Tone: {data.tone}</span>
      </div>
      <div className="font-semibold">Subject: {data.subject}</div>
      <p className="text-muted-foreground italic">{data.purpose}</p>
      <ul className="list-disc pl-5 space-y-1">
        {data.keyPoints?.map((p: string, i: number) => <li key={i}>{p}</li>)}
      </ul>
      <p className="text-xs text-muted-foreground border-t pt-2">{data.note}</p>
    </div>
  );
}

function MeetingOutput({ data }: { data: any }) {
  return (
    <div className="space-y-3 text-sm">
      <div>
        <div className="font-semibold">{data.title}</div>
        <p className="text-muted-foreground">{data.summary}</p>
      </div>
      {data.keyDecisions?.length > 0 && (
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Decisions</div>
          <ul className="list-disc pl-5 space-y-1">
            {data.keyDecisions.map((d: string, i: number) => <li key={i}>{d}</li>)}
          </ul>
        </div>
      )}
      {data.actionItems?.length > 0 && (
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Action items</div>
          <div className="rounded border divide-y">
            {data.actionItems.map((a: any, i: number) => (
              <div key={i} className="p-2 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <div className="flex-1">{a.task}</div>
                <div className="text-xs text-muted-foreground">{a.owner} · {a.deadline}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {data.risks?.length > 0 && (
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Risks / open</div>
          <ul className="list-disc pl-5 space-y-1">
            {data.risks.map((r: string, i: number) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function ScheduleOutput({ data }: { data: any }) {
  const pColor: Record<string, string> = {
    P1: "bg-destructive/15 text-destructive",
    P2: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
    P3: "bg-secondary text-secondary-foreground",
  };
  return (
    <div className="space-y-3 text-sm">
      <div className="text-xs uppercase text-muted-foreground">{data.horizon} plan</div>
      <div className="rounded border divide-y">
        {data.tasks?.map((t: any, i: number) => (
          <div key={i} className="p-2 flex items-center gap-3">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded ${pColor[t.priority] ?? ""}`}>{t.priority}</span>
            <div className="flex-1">
              <div>{t.title}</div>
              <div className="text-xs text-muted-foreground">{t.suggestedSlot} · {t.estimateMinutes} min</div>
            </div>
          </div>
        ))}
      </div>
      {data.productivityTips?.length > 0 && (
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Tips</div>
          <ul className="list-disc pl-5 space-y-1">
            {data.productivityTips.map((t: string, i: number) => <li key={i}>{t}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function ResearchOutput({ data }: { data: any }) {
  return (
    <div className="space-y-3 text-sm">
      <div>
        <div className="font-semibold">{data.topic}</div>
        <p className="text-muted-foreground">{data.overview}</p>
      </div>
      {data.keyInsights?.length > 0 && (
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Key insights</div>
          <ul className="list-disc pl-5 space-y-1">
            {data.keyInsights.map((k: string, i: number) => <li key={i}>{k}</li>)}
          </ul>
        </div>
      )}
      {data.recommendations?.length > 0 && (
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Recommendations</div>
          <ul className="list-disc pl-5 space-y-1">
            {data.recommendations.map((r: string, i: number) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      )}
      {data.caveats?.length > 0 && (
        <div>
          <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Verify</div>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            {data.caveats.map((c: string, i: number) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

export function ToolRenderer({ part }: { part: ToolUIPart }) {
  const renderOutput = () => {
    if (part.state !== "output-available") return null;
    const data = part.output as any;
    switch (part.type) {
      case "tool-draftEmail":
        return <EmailOutput data={data} />;
      case "tool-summarizeMeeting":
        return <MeetingOutput data={data} />;
      case "tool-planSchedule":
        return <ScheduleOutput data={data} />;
      case "tool-researchTopic":
        return <ResearchOutput data={data} />;
      default:
        return <pre className="text-xs overflow-auto">{JSON.stringify(data, null, 2)}</pre>;
    }
  };

  return (
    <Tool defaultOpen={false}>
      <ToolHeader type={part.type as any} state={part.state} />
      <ToolContent>
        {part.input ? <ToolInput input={part.input} /> : null}
        <ToolOutput
          output={part.state === "output-available" ? renderOutput() : null}
          errorText={part.state === "output-error" ? part.errorText : undefined}
        />
      </ToolContent>
    </Tool>
  );
}
