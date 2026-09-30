import Groq from "groq-sdk";
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

export class GroqAIProvider implements AIProvider {
  private groq: Groq;
  private modelName = 'openai/gpt-oss-120b';

  constructor(apiKey: string) {
    this.groq = new Groq({ apiKey });
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

    const response = await this.groq.chat.completions.create({
      messages: [{ role: "system", content: prompt }],
      model: this.modelName,
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const responseText = response.choices[0]?.message?.content || "{}";
    const data = JSON.parse(responseText);
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

IMPORTANT:
Use ::FLOAT and ::INT to cast numerical SUMs or COUNTs to prevent NodeJS BigInt serialization crashes.
Enum values are UPPERCASE (e.g. status = 'COMPLETED', 'PENDING', 'CANCELLED').

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

    const response = await this.groq.chat.completions.create({
      messages: [{ role: "system", content: prompt }],
      model: this.modelName,
      temperature: 0.1,
      response_format: { type: "json_object" },
    });

    const responseText = response.choices[0]?.message?.content || "{}";
    const data = JSON.parse(responseText);
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

    const response = await this.groq.chat.completions.create({
      messages: [{ role: "system", content: prompt }],
      model: this.modelName,
      temperature: 0.5,
      response_format: { type: "json_object" },
    });

    const responseText = response.choices[0]?.message?.content || "{}";
    const data = JSON.parse(responseText);
    return InsightGenerationSchema.parse(data);
  }
}
