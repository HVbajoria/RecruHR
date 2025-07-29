
'use server';

/**
 * @fileOverview An interview kit generation AI agent.
 *
 * - generateInterviewKit - A function that handles the interview kit generation process.
 * - GenerateInterviewKitInput - The input type for the generateInterviewKit function.
 * - GenerateInterviewKitOutput - The return type for the generateInterviewKit function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { randomUUID } from 'crypto';


const GenerateInterviewKitInputSchema = z.object({
  jobDescription: z.string().describe('The job description to generate an interview kit for.'),
  unstopProfileLink: z.string().describe("Primary Source - COMPULSORY, conceptually treat this as if you are accessing and deeply analyzing the candidate's entire live profile for skills, projects, experience, education, academic achievements."),
  candidateResumeDataUri: z.string().optional().describe("Primary Source - OPTIONAL, but CRUCIAL if provided. This is the full data URI (which includes Base64 encoded content of the PDF/DOCX file) of the candidate's resume. You MUST analyze it with extreme depth as if you are reading the original document, extracting all relevant skills, experiences, specific projects (including their tech stack, goals, accomplishments, challenges), educational background, academic achievements, and past work experiences. The quality of your questions depends on this deep analysis."),
  candidateResumeFileName: z.string().optional().describe("The filename of the resume, for context."),
  candidateExperienceContext: z.string().optional().describe('Optional brief context about the target candidate’s experience level, current role, or past tech stack. E.g., "Junior developer, 1-2 years exp, proficient in React" or "Senior architect, 10+ years, extensive AWS and microservices experience." This supplements the resume if provided.'),
});

export type GenerateInterviewKitInput = z.infer<typeof GenerateInterviewKitInputSchema>;

const QuestionAnswerPairSchema = z.object({
  id: z.string().optional().describe("A unique identifier. Do not generate this field; it will be added later."),
  question: z.string().describe("A crisp, direct, and deeply technical interview question."),
  modelAnswer: z.string().describe("A comprehensive, multi-point answer formatted as a single string with multiple bullet points (e.g. '- Point one.\\n- Point two.\\n- Point three.'). For code/queries, the code block MUST come first, wrapped in triple backticks, followed by the explanatory points."),
});

const GenerateInterviewKitOutputSchema = z.object({
  questions: z.array(QuestionAnswerPairSchema)
    .describe('A list of exactly 30 technical interview questions with concise, multi-point answers.'),
});
export type GenerateInterviewKitOutput = z.infer<typeof GenerateInterviewKitOutputSchema>;

export async function generateInterviewKit(input: GenerateInterviewKitInput): Promise<GenerateInterviewKitOutput> {
  return generateInterviewKitFlow(input);
}

const generateInterviewKitPrompt = ai.definePrompt({
  name: 'generateInterviewKitPrompt',
  input: {schema: GenerateInterviewKitInputSchema},
  output: {schema: GenerateInterviewKitOutputSchema},
  config: {
    temperature: 0.61,
    topP: 0.96,
  },
  prompt: `### ROLE AND GOAL

You are a Principal Technical Interviewer at a top-tier technology company. Your goal is to generate a comprehensive and highly targeted set of technical interview questions. This assessment must accurately measure a candidate's depth of knowledge and practical skills against a specific Job Description (JD), while personalizing the questions based on the candidate's resume.

-----

### CORE PRINCIPLES

1.  JD is the Authority: Every question must be directly derived from a skill, technology, or responsibility mentioned in the \`{{{jobDescription}}}\`. Do not invent requirements.
2.  Resume is for Personalization: Cross-reference the JD requirements with the candidate's \`{{{candidateResumeDataUri}}}\`. When a skill appears in both, frame the question around the candidate's listed experience (e.g., a specific project or role). This makes the interview more relevant and insightful.
3.  Focus on "How" and "Why": Prioritize questions that test problem-solving, system design, and analytical skills. Go beyond definitions.
      * Good: "How would you optimize the performance of..."
      * Good: "What are the trade-offs between Technology X and Y for this use case?"
      * Avoid: "What is Technology X?"
4.  Strictly Technical: The scope is exclusively technical. Do not generate any behavioral or "soft skill" questions.
      * Constraint: Omit questions like "Tell me about a time...", "Describe a conflict...", or "What are your weaknesses?".

-----

### STEP-BY-STEP PROCESS TO FOLLOW

To ensure the highest quality output, follow these internal steps before generating the final JSON:

1.  Deconstruct the JD: Identify and list the top 10-15 core technical skills, tools, and responsibilities from the \`{{{jobDescription}}}\`.
2.  Analyze the Resume: Scan the \`{{{candidateResumeDataUri}}}\` for projects and technical skills.
3.  Synthesize and Find Overlaps: Create a mapping between the JD's core requirements and the candidate's demonstrated experience. Pinpoint the strongest areas of overlap.
4.  Design Question Strategy: Based on the overlaps and the nature of the role, decide on a mix of question types: practical coding, system design, optimization scenarios, and technology comparison questions.
5.  Generate Questions & Answers: Create exactly 30 question-answer pairs that cover the most critical areas identified in your synthesis. Also make sure that the the model answer has atleast 3-4 bullet points, with code/SQL queries always coming first in a code block. Donot generate open-ended questions.
6.  Final Review: Verify your generated list against the \`FINAL CHECKLIST\` below before producing the output.

-----

### INPUT CONTEXT

  * Job Description: \`{{{jobDescription}}}\`
  * Candidate Resume: \`{{{candidateResumeDataUri}}}\` (media)
  * Unstop Profile Link (Optional): \`{{{unstopProfileLink}}}\`
  * Additional Candidate Context (Optional): \`{{{candidateExperienceContext}}}\`

-----

### OUTPUT REQUIREMENTS

  * The entire output must be a single, valid JSON object.
  * The root object must have a single key: \`"questions"\`.
  * The value of "questions" must be an array of exactly 30 JSON objects.
  * The modelAnswer should have at least 3-4 bullet points, with code/SQL queries always coming first in a code block.
  * Each object in the array must contain two keys: "question" and "modelAnswer".
      * \`question\`: A string, concise and direct (ideally 10-25 words).
      * \`modelAnswer\`: A single string. Use \` \n-  \` for bullet points to ensure clarity. If the answer includes a code block or query, it must come first, enclosed in triple backticks (\`\`\`).

#### Example Output Structure:
{
  "questions": [
    {
      "question": "The JD emphasizes data pipeline reliability. On your resume's 'Project Sentinel', how did you ensure data integrity?",
      "modelAnswer": "- Checksums & Hashes: We generated checksums for data batches at the source and validated them after ingestion to detect corruption.\n- Reconciliation: Implemented jobs to compare row counts and key aggregates between the source and target systems daily.\n- Dead-Letter Queues: Malformed or unprocessable records were routed to a dead-letter queue for manual inspection, preventing pipeline failure."
    },
    {
      "question": "How would you write a SQL query to find all users who have logged in for 5 consecutive days?",
      "modelAnswer": "\`\`\`sql\nWITH NumberedLogins AS (\n    SELECT \n        user_id, \n        login_date, \n        DENSE_RANK() OVER(PARTITION BY user_id ORDER BY login_date) as login_rank\n    FROM user_logins\n    GROUP BY user_id, login_date\n)\nSELECT user_id\nFROM NumberedLogins\nGROUP BY user_id, DATE(login_date, '-' || login_rank || ' days')\nHAVING COUNT(*) >= 5;\n\`\`\`\n- This query solves the 'gaps and islands' problem.\n- It first assigns a dense rank to each user's unique login dates.\n- By subtracting the rank (as days) from the login date, we create a constant 'grouping_date' for any consecutive sequence. Grouping by this identifier and the user allows us to count the number of consecutive days."
    }
  ]
}

-----

### NOTES
- Make sure that there are exactly 30 questions in the output.
- Ensure that the questions are purely technical and derived from the JD.
- Ensure that there are no behavioral questions.

### FINAL CHECKLIST

Before generating the output, confirm the following:

  - [ ] Is the output a single JSON object?
  - [ ] Does the "questions" array contain exactly 30 items?
  - [ ] Is every question purely technical and derived from the JD?
  - [ ] Are there zero behavioral questions?
  - [ ] Is all code/SQL enclosed in triple backticks and placed at the start of the \`modelAnswer\`?`,
});

const generateInterviewKitFlow = ai.defineFlow(
  {
    name: 'generateInterviewKitFlow',
    inputSchema: GenerateInterviewKitInputSchema,
    outputSchema: GenerateInterviewKitOutputSchema,
  },
  async input => {
    const {output} = await generateInterviewKitPrompt(input);
    if (!output || !output.questions) {
      throw new Error("AI failed to generate interview kit content.");
    }

    const validatedOutput: GenerateInterviewKitOutput = {
      questions: (output.questions || []).map(q => ({
        id: randomUUID(),
        question: q.question || "Missing question text",
        modelAnswer: q.modelAnswer || "Missing model answer.",
      })),
    };
    
    return validatedOutput;
  }
);

    