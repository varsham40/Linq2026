import { createGroq } from '@ai-sdk/groq';
import { generateText } from 'ai';
import { adminDb } from '@/lib/firebase-admin';

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { eventId } = await req.json();

    if (!eventId) {
      return new Response(JSON.stringify({ error: "Missing eventId" }), { status: 400 });
    }

    // 1. Fetch Event Data
    const eventSnap = await adminDb.collection('events').doc(eventId).get();
    if (!eventSnap.exists) {
      return new Response(JSON.stringify({ error: "Event not found" }), { status: 404 });
    }
    const event = eventSnap.data()!;

    // 2. Fetch Attendees count
    const regSnap = await adminDb.collection(`events/${eventId}/registrations`).where('attended', '==', true).get();
    const attendeeCount = regSnap.size;

    // 3. Fetch Feedback
    const fbSnap = await adminDb.collection(`events/${eventId}/feedback`).get();
    const feedbacks = fbSnap.docs.map(doc => {
        const d = doc.data();
        return `{user: "${d.userName || 'Anonymous'}", rating: ${d.rating}, comment: "${d.comment || d.feedbackText || ''}"}`;
    });

    const context = `
Event Title: ${event.title}
Event Description: ${event.description || 'N/A'}
Venue: ${event.venue || 'N/A'}
Total Attendees: ${attendeeCount}
Feedback Entries:
${feedbacks.length > 0 ? feedbacks.join('\n') : 'No feedback available yet.'}
    `;

    // 4. Prompt Groq
    const systemPrompt = `You are an expert community manager and social media hypeman. 
You are tasked with generating a magic event wrap-up based on the provided event details and user feedback.

Generate a JSON object with EXACTLY these four keys:
1. "instagramRecap": Write an engaging Instagram post after the successful completion of the event. Highlight the energy, fun, and community spirit. Thank participants, volunteers, and sponsors. Keep the tone celebratory, casual, and emoji-friendly. Add 3–4 relevant hashtags. End with a call-to-action for future events.
2. "linkedinRecap": Write a professional LinkedIn post announcing the successful completion of the event. Emphasize collaboration, learning, and impact. Thank attendees, volunteers, and sponsors. Mention 1–2 key highlights or outcomes. Keep the tone formal yet warm, suitable for networking. Add 3–4 professional hashtags. End with an invitation to connect or join future initiatives.
3. "curatedFeedback": An array of objects, each containing a 'quote' (string) and 'author' (string). Pick the 2 to 3 absolute BEST, most glowing pieces of feedback from the context. If there is no feedback, provide realistic generic hype quotes.
4. "eventSummary": A brief, high-energy paragraph (3-4 sentences) summarizing the success of the event.

CRITICAL: Return ONLY raw JSON. Do not wrap in markdown \`\`\`json blocks.
Schema:
{
  "instagramRecap": "string",
  "linkedinRecap": "string",
  "curatedFeedback": [
    { "quote": "string", "author": "string" }
  ],
  "eventSummary": "string"
}`;

    const result = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      messages: [{ role: 'user', content: context }],
      system: systemPrompt,
    });

    let jsonResult;
    try {
      const cleanText = result.text.replace(/```json/g, '').replace(/```/g, '').trim();
      jsonResult = JSON.parse(cleanText);
    } catch (e) {
      console.error("Failed to parse JSON from LLM:", result.text);
      return new Response(JSON.stringify({ error: "Failed to generate wrap-up format" }), { status: 500 });
    }

    // 5. Save to Firestore
    const recapData = {
        ...jsonResult,
        published: false,
        winnerShoutouts: "",
        images: [],
        generatedAt: Date.now()
    };

    await adminDb.collection('events').doc(eventId).update({
        recapData: recapData
    });

    return new Response(JSON.stringify({ success: true, recapData }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error("Magic Wrap-up Error:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error", details: error?.message }), { status: 500 });
  }
}
