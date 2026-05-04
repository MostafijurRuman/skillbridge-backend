import { GoogleGenAI } from '@google/genai';
import { prisma } from '../../lib/prisma';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_PROMPT = `You are an AI assistant for SkillBridge (a tutor platform).

RULES:
- Only answer questions related to SkillBridge platform, Tutors, Subjects, Bookings, Pricing, and Learning.
- If the user asks an unrelated question, DO NOT answer normally. Respond EXACTLY with: "Sorry, I can only help with questions related to SkillBridge. Please ask about tutors, subjects, or bookings."
- Use the provided tutor data in the context to make recommendations. Provide tutor names, subjects, ratings, and price.
- If no tutors are provided in the context, say "I couldn't find any tutors matching your criteria right now."
- Be concise and helpful. Use formatting (like bullet points or bold text) to make recommendations easy to read.`;

export const processChatMessage = async (message: string, history: any[] = []) => {
    // 1. Intent Detection
    const intentPrompt = `Analyze the user's message and extract any mentioned subject, budget (max price per hour as number), and time preference.
    Message: "${message}"
    Return JSON format exactly like:
    { "subject": "math" | null, "budget": 20 | null, "time": "today" | null }
    Do not return markdown, only the JSON.`;

    let intent: any = { subject: null, budget: null, time: null };
    try {
        const intentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: intentPrompt,
            config: {
                temperature: 0,
            }
        });
        
        let rawText = intentResponse.text || "{}";
        // Clean markdown code blocks if any
        rawText = rawText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
        intent = JSON.parse(rawText);
    } catch (e) {
        console.error("Intent parsing error", e);
    }

    // 2. Database Retrieval based on intent
    const dbQuery: any = {
        where: {}
    };

    if (intent.subject) {
        dbQuery.where.categories = {
            some: {
                name: {
                    contains: intent.subject,
                    mode: 'insensitive'
                }
            }
        };
    }

    if (intent.budget) {
        dbQuery.where.pricePerHr = {
            lte: Number(intent.budget)
        };
    }

    // Fetch top 5 tutors matching criteria
    const tutors = await prisma.tutorProfile.findMany({
        where: dbQuery.where,
        include: {
            user: { select: { name: true, email: true } },
            categories: { select: { name: true } }
        },
        orderBy: {
            rating: 'desc'
        },
        take: 5
    });

    const tutorContext = tutors.length > 0
        ? tutors.map(t => `- **${t.user.name}**: $${t.pricePerHr}/hr, Rating: ${t.rating}, Subjects: ${t.categories.map(c => c.name).join(', ')}, Bio: ${t.bio}`).join('\n')
        : 'No specific tutors found matching the current criteria. You can recommend checking the "Find Tutors" page.';

    // 3. Format history for Gemini
    // We only keep the last 5 messages to save context
    const recentHistory = history.slice(-5).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
    }));

    // 4. Generate Main Response
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
            ...recentHistory,
            { role: 'user', parts: [{ text: message }] }
        ],
        config: {
            systemInstruction: `${SYSTEM_PROMPT}\n\nAvailable Tutors (Use these to answer if relevant):\n${tutorContext}`,
            temperature: 0.3
        }
    });

    return response.text;
};
