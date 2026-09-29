import { GoogleGenAI } from '@google/genai';
import {
  AIProvider,
  QueryPlanPromptInput,
  SQLGenerationPromptInput,
  InsightPromptInput
} from './provider';
import {
  QueryPlanOutput,
  QueryPlanSchema,
  SqlGenerationOutput,
  SqlGenerationSchema,
  InsightGenerationOutput,
  InsightGenerationSchema
} from '../../schemas/ai';

export class GeminiAIProvider implements AIProvider {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async createQueryPlan(input: QueryPlanPromptInput): Promise<QueryPlanOutput> {
    const prompt = `
You are a brilliant Business Intelligence AI Architect.
Your task is to analyze the user's question and map it to the semantic layer (metrics, dimensions).

User Question: "${input.question}"
User Role: ${input.role}
Region Scope Allowed: ${input.regionScope.join(', ')}

Return a strict JSON object matching this schema:
{
  "intent": "string",
  "questionType": "DESCRIPTIVE" | "DIAGNOSTIC" | "PREDICTIVE" | "CAUSAL",
  "metricKey": "string or null",
  "metricDefinitionId": "string or null",
  "dimensions": ["string"],
  "filters": [{ "field": "string", "operator": "string", "value": "any" }],
  "timeRange": { "type": "string", "startDate": "string or null", "endDate": "string or null", "label": "string or null" } or null,
  "comparison": { "type": "string", "baseline": "string or null", "target": "string or null" } or null,
  "requestedVisualization": "LINE" | "BAR" | "TABLE" | "PIE" | "KPI" or null,
  "tables": ["string"],
  "approvedJoinPathIds": ["string"],
  "assumptions": ["string"],
  "clarificationNeeded": boolean,
  "clarificationQuestion": "string or null",
  "clarificationOptions": [{ "id": "string", "label": "string", "description": "string" }]
}
`;

    const response = await this.ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const data = JSON.parse(response.text() || '{}');
    return QueryPlanSchema.parse(data);
  }

  async generateSQL(input: SQLGenerationPromptInput): Promise<SqlGenerationOutput> {
    const prompt = `
You are a PostgreSQL SQL Expert.
Generate a highly optimized PostgreSQL query based on the following plan.

Important Table Schemas in PostgreSQL (Note the camelCase columns MUST be double quoted in SQL, e.g. "orderId", "unitPrice"):
- orders: id, "customerId", "regionId", "orderDate", status
- order_items: id, "orderId", "productId", quantity, "unitPrice", discount
- regions: id, name
- customers: id, name, segment, email
- products: id, name, "categoryId", "unitCost"
- product_categories: id, name

Tables to use: ${input.plan.tables.join(', ')}

Return a strict JSON object matching this schema:
{
  "sql": "string (the raw Postgres query)",
  "parameterValues": [],
  "explanation": "string",
  "tablesUsed": ["string"],
  "columnsUsed": ["string"],
  "joinsUsed": ["string"],
  "assumptions": ["string"]
}
`;

    const response = await this.ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const data = JSON.parse(response.text() || '{}');
    return SqlGenerationSchema.parse(data);
  }

  async generateInsight(input: InsightPromptInput): Promise<InsightGenerationOutput> {
    const prompt = `
You are an elite Business Analyst.
Analyze the following SQL query results and generate insights.

Data Quality Status: ${input.dataQualityStatus}
Real Score (Confidence): ${input.realScore}
Causal Evidence Present: ${input.causalEvidence}

Query Results:
${JSON.stringify(input.queryResults).substring(0, 5000)}

Return a strict JSON object matching this schema:
{
  "headline": "string (short, punchy)",
  "summary": "string (2-3 sentences max)",
  "keyFindings": ["string"],
  "driversOrAssociations": ["string"],
  "recommendedNextQuestions": ["string"],
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "confidenceReason": "string",
  "assumptions": ["string"],
  "limitations": ["string"],
  "causalityNotice": "string"
}
`;

    const response = await this.ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const data = JSON.parse(response.text() || '{}');
    return InsightGenerationSchema.parse(data);
  }
}
