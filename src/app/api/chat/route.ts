import { createGroq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { z } from 'zod';
import { adminDb } from '@/lib/firebase-admin';

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

export const maxDuration = 30;

// --- Memory Cache to save Firestore Free Tier Reads ---
// Global cache for public events (Shared among all students)
let globalEventCache = { text: "No events found.", timestamp: 0 };
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Admin cache for private feedback (Keyed by user ID to prevent leaks)
let adminContextCache: Record<string, { text: string, timestamp: number }> = {};

// --- Zod Schema for Fixed JSON Output ---
const chatResponseSchema = z.object({
  summary: z.string().describe("Conversational markdown response addressing the user's query."),
  results: z.object({
    type: z.enum(["EVENTS", "CLUBS", "USERS", "FEEDBACK", "ANALYTICS", "NONE"]),
    events: z.array(z.object({
      id: z.string(),
      title: z.string(),
      date: z.number().describe("Timestamp in milliseconds"),
      venue: z.string(),
      attendeeCount: z.number().optional()
    })).optional(),
    clubs: z.array(z.object({
      id: z.string(),
      name: z.string(),
      description: z.string()
    })).optional(),
    users: z.array(z.object({
      uid: z.string(),
      displayName: z.string(),
      role: z.string()
    })).optional(),
    feedback: z.array(z.object({
      userName: z.string(),
      rating: z.number(),
      comment: z.string()
    })).optional(),
    analytics: z.object({
      totalAttendees: z.number(),
      averageRating: z.number(),
      registrationCount: z.number()
    }).nullable().optional()
  })
});

export async function POST(req: Request) {
  try {
    const { messages, userRole = 'student', uid = 'anonymous' } = await req.json();
    const isAdmin = ['club_admin', 'club_member', 'college_admin'].includes(userRole);
    const now = Date.now();

    // 1. Efficient Firestore Fetching (Memory Cached)
    let eventsContext = "No events found.";
    let adminContext = "";

    // Fetch Public Events (Cached Globally)
    if (now - globalEventCache.timestamp > CACHE_TTL) {
      console.log("[AI API] Cache Miss: Fetching public events from Firestore");
      try {
        const clubsSnap = await adminDb.collection('clubs').get();
        const clubMap: Record<string, string> = {};
        clubsSnap.docs.forEach(doc => { clubMap[doc.id] = doc.data().name || 'Unknown Club'; });

        const snap = await adminDb.collection('events').orderBy('createdAt', 'desc').limit(20).get();
        const eventDocs = snap.docs.map((docSnap) => {
          const data = docSnap.data();
          const hostingClub = data.clubId ? (clubMap[data.clubId] || 'Unknown Club') : 'Unknown Club';
          return JSON.stringify({
            id: docSnap.id,
            title: data.title,
            club: hostingClub,
            scope: data.scope,
            venue: data.venue,
            startTime: data.startTime,
            endTime: data.endTime,
            attendees: data.attendeeCount || 0,
            description: data.description || 'N/A'
          });
        });

        if (eventDocs.length > 0) {
          globalEventCache = { text: eventDocs.join("\n"), timestamp: now };
        }
      } catch (e) {
        console.error("Failed to fetch public events", e);
      }
    }
    eventsContext = globalEventCache.text;

    // Fetch Admin Data (Cached per admin user)
    if (isAdmin) {
      if (!adminContextCache[uid] || (now - adminContextCache[uid].timestamp > CACHE_TTL)) {
        console.log(`[AI API] Cache Miss: Fetching admin feedback and registrations for UID ${uid}`);
        try {
          const snap = await adminDb.collection('events').orderBy('createdAt', 'desc').limit(10).get(); 
          let adminData: string[] = [];
          
          for (const docSnap of snap.docs) {
            // Fetch Feedback
            const fbSnap = await adminDb.collection(`events/${docSnap.id}/feedback`).get();
            const feedbacks = fbSnap.docs.map(f => {
               const d = f.data();
               return `{user: "${d.userName || 'Anonymous'}", rating: ${d.rating}, comment: "${d.comment || d.feedbackText || ''}"}`;
            });
            if (feedbacks.length > 0) adminData.push(`Feedback for Event ID ${docSnap.id}: [${feedbacks.join(", ")}]`);

            // Fetch Attendees (Registrations)
            const regSnap = await adminDb.collection(`events/${docSnap.id}/registrations`).where('attended', '==', true).get();
            const attendees = regSnap.docs.map(r => {
               const d = r.data();
               return `{userName: "${d.userName}", college: "${d.userCollegeId}"}`;
            });
            if (attendees.length > 0) adminData.push(`Attendees for Event ID ${docSnap.id}: [${attendees.join(", ")}]`);
          }
          
          adminContextCache[uid] = { text: adminData.join("\n"), timestamp: now };
        } catch (e) {
          console.error("Failed to fetch admin context", e);
        }
      }
      adminContext = adminContextCache[uid]?.text || "No private data available.";
    }

    // 2. Define System Prompt
    const currentDate = new Date().toLocaleString();
    const roleInstructions = isAdmin 
      ? `You are a Productivity Assistant for a Club Admin. You have access to private feedback and attendee lists: \n${adminContext}\nIf asked for analytics, feedback, or attendees, use this data to populate the JSON fields accordingly.` 
      : `You are a Student Campus Guide. You ONLY help students find events. If asked for private analytics/feedback/attendees, firmly state you cannot access this data.`;

    const systemPrompt = `You are the LINQ AI Copilot.
CURRENT SYSTEM DATE AND TIME: ${currentDate}

ROLE & CAPABILITIES:
${roleInstructions}

REAL-TIME DATABASE EVENTS:
${eventsContext}

INSTRUCTIONS:
- You must output exactly the JSON structure requested.
- If the user asks for events, extract the relevant events from the context, populate the 'events' array, and set results.type to 'EVENTS'.
- If the user asks for analytics/feedback (and you are an admin), analyze the context, populate the 'feedback' array or 'analytics' object, and set results.type to 'FEEDBACK' or 'ANALYTICS'.
- If the user asks for attendees, list them in the summary text and optionally populate the 'users' array with results.type set to 'USERS'.
- CREATIVITY ALLOWED: If the user explicitly asks you to brainstorm, draft descriptions, or create new content (e.g. for a new Hackathon), you MUST act as a highly creative assistant and generate that content in the summary field! Output type 'NONE' for the results since there's no data to display.
- ANTI-HALLUCINATION: For factual questions about EXISTING events on the platform, NEVER invent events or data. If you don't know, output type 'NONE' and explain in the summary.
- NO RAW IDs: NEVER output raw database Event IDs (like "hQVy6ma5oSDeD1WIlYTe") in your conversational summary text. Use the event titles instead.
- VERY IMPORTANT: Return ONLY raw JSON. Do not wrap the JSON in markdown blocks (e.g. \`\`\`json). Just return the raw JSON object.
- The JSON must match this EXACT schema:
{
  "summary": "conversational text",
  "results": {
    "type": "EVENTS" | "CLUBS" | "USERS" | "FEEDBACK" | "ANALYTICS" | "NONE",
    "events": [{"id": "str", "title": "str", "date": 12345, "venue": "str", "attendeeCount": 0}],
    "clubs": [],
    "users": [{"displayName": "str", "college": "str", "role": "str"}],
    "feedback": [{"userName": "str", "rating": 5, "comment": "str"}],
    "analytics": {"totalAttendees": 0, "averageRating": 0, "registrationCount": 0}
  }
}`;

    // Clean messages for strict parser
    const sanitizedMessages = messages.map((m: any) => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
    }));

    // 3. Generate Object via AI
    const result = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      messages: sanitizedMessages,
      system: systemPrompt,
    });

    let jsonResult;
    try {
      // Strip out markdown code blocks if the LLM hallucinated them
      const cleanText = result.text.replace(/```json/g, '').replace(/```/g, '').trim();
      jsonResult = JSON.parse(cleanText);
    } catch (e) {
      console.error("Failed to parse JSON from LLM:", result.text);
      jsonResult = { summary: "I'm sorry, I failed to generate the correct format. Please try again.", results: { type: "NONE" } };
    }

    // 4. Return Structured JSON
    return new Response(JSON.stringify(jsonResult), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error("Chat API Error:", error);
    return new Response(JSON.stringify({ 
      error: "Failed to process chat request.",
      details: error?.message || error?.toString() 
    }), { status: 500 });
  }
}
