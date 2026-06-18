import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";

const SYSTEM_PROMPT = `You are WorkMate AI, a professional workplace productivity assistant for office employees, team leaders, project managers, and business professionals.

You help users with:
- Drafting professional emails (formal, informal, persuasive) tailored to clients, managers, or teammates
- Summarizing meeting notes into key points, decisions, action items, owners, and deadlines
- Planning daily/weekly schedules with prioritization (urgency × importance, Eisenhower-style)
- Researching topics, articles, and reports — extracting key insights and recommendations

Guidelines:
- Use the specialized tools below when the user's intent clearly matches one. Otherwise, answer conversationally in clean Markdown.
- Be concise, structured, and business-appropriate. Prefer bullet lists, headings, and tables.
- Always include a brief note when output should be reviewed by a human (e.g. before sending emails or committing to schedules).
- Never fabricate facts in research; clearly flag assumptions and recommend verification.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) {
          return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        }

        let body: { messages: UIMessage[] };
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const gateway = createLovableAiGatewayProvider(apiKey);

        try {
          const result = streamText({
            model: gateway("google/gemini-3-flash-preview"),
            system: SYSTEM_PROMPT,
            messages: await convertToModelMessages(body.messages ?? []),
            stopWhen: stepCountIs(50),
            tools: {
              draftEmail: tool({
                description:
                  "Draft a professional email with a specific tone and audience. Use when the user asks to write, draft, compose, or rewrite an email.",
                inputSchema: z.object({
                  recipient: z.string().describe("Who the email is to (e.g. 'client', 'manager', 'team')"),
                  tone: z.enum(["formal", "informal", "persuasive", "apologetic", "appreciative"]),
                  subject: z.string().describe("A concise email subject line"),
                  purpose: z.string().describe("The goal/context of the email in 1-2 sentences"),
                  keyPoints: z.array(z.string()).describe("Bullet points to include in the body"),
                }),
                execute: async ({ recipient, tone, subject, purpose, keyPoints }) => {
                  return {
                    recipient,
                    tone,
                    subject,
                    purpose,
                    keyPoints,
                    note: "Draft generated. Review and personalize before sending.",
                  };
                },
              }),
              summarizeMeeting: tool({
                description:
                  "Summarize meeting notes or transcripts. Use when the user pastes notes, a transcript, or asks for a summary of a meeting/discussion.",
                inputSchema: z.object({
                  title: z.string().describe("A short title for the meeting"),
                  summary: z.string().describe("2-4 sentence executive summary"),
                  keyDecisions: z.array(z.string()),
                  actionItems: z.array(
                    z.object({
                      task: z.string(),
                      owner: z.string().describe("Person responsible, or 'Unassigned'"),
                      deadline: z.string().describe("Deadline or 'TBD'"),
                    }),
                  ),
                  risks: z.array(z.string()).describe("Risks or open questions"),
                }),
                execute: async (input) => input,
              }),
              planSchedule: tool({
                description:
                  "Build a prioritized daily or weekly task plan. Use when the user asks to plan, schedule, organize tasks, or set priorities.",
                inputSchema: z.object({
                  horizon: z.enum(["day", "week"]),
                  tasks: z.array(
                    z.object({
                      title: z.string(),
                      priority: z.enum(["P1", "P2", "P3"]).describe("P1=urgent+important, P2=important, P3=nice-to-have"),
                      estimateMinutes: z.number().int().positive(),
                      suggestedSlot: z.string().describe("e.g. 'Mon 9:00-10:30' or 'Today AM'"),
                    }),
                  ),
                  productivityTips: z.array(z.string()),
                }),
                execute: async (input) => input,
              }),
              researchTopic: tool({
                description:
                  "Provide structured research on a topic from the model's knowledge. Use when the user asks to research, explain, or summarize a topic/article.",
                inputSchema: z.object({
                  topic: z.string(),
                  overview: z.string().describe("Plain-language overview, 3-5 sentences"),
                  keyInsights: z.array(z.string()),
                  recommendations: z.array(z.string()),
                  caveats: z.array(z.string()).describe("Limitations, biases, or things to verify"),
                }),
                execute: async (input) => input,
              }),
            },
          });

          return result.toUIMessageStreamResponse();
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          console.error("Chat error:", message);
          return new Response(message, { status: 500 });
        }
      },
    },
  },
});
