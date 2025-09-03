import OpenAI from 'openai';
import type {
  CoverLetterRequest,
  ApiResponse,
  AppError,
  ApiError
} from '../types';
import { ErrorType } from '../types';

/**
 * OpenAI API Service for generating cover letters
 * Handles API communication, request formatting, and error handling
 */
export class OpenAIService {
  private client: OpenAI | null = null;
  private apiKey: string = '';

  /**
   * Initialize the service with an API key
   * @param apiKey - OpenAI API key
   */
  constructor(apiKey?: string) {
    if (apiKey) {
      this.setApiKey(apiKey);
    }
  }

  /**
   * Set or update the API key
   * @param apiKey - OpenAI API key
   */
  setApiKey(apiKey: string): void {
    this.apiKey = apiKey;
    this.client = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true // Required for client-side usage
    });
  }

  /**
   * Check if the service is properly configured
   * @returns boolean indicating if API key is set
   */
  isConfigured(): boolean {
    return !!this.apiKey && !!this.client;
  }

  /**
   * Format the prompt for cover letter generation using CopyThat methodology
   * @param request - Cover letter request data
   * @returns formatted prompt string
   */
  private formatPrompt(request: CoverLetterRequest): string {
    const { jobDescription, hiringManager, location, jobPosition, company, additionalContext, language, currentLetterContent, useCurrentLetter } = request;

    // Determine language for the prompt
    const isPortuguese = language === 'portuguese';
    const languageInstruction = isPortuguese
      ? 'Write the cover letter in European Portuguese (Portugal Portuguese).'
      : 'Write the cover letter in English.';

    let prompt: string;

    // Check if we should use the current letter as base for modifications
    if (useCurrentLetter && currentLetterContent) {
      prompt = `You are CopyThat — a sharp, direct career-copywriting GPT. Please modify the following cover letter based on the specific feedback provided:

CURRENT COVER LETTER:
${currentLetterContent}

JOB CONTEXT (for reference):`;
      if (jobPosition) prompt += `\nPosition: ${jobPosition}`;
      if (company) prompt += `\nCompany: ${company}`;
      if (hiringManager) prompt += `\nHiring Manager: ${hiringManager}`;
      if (location) prompt += `\nLocation: ${location}`;

      prompt += `\n\nPlease modify the cover letter above according to the feedback below while:
- Maintaining the professional tone and structure
- Keeping the applicant name "Tomás"
- Ensuring it remains 200-300 words
- ${languageInstruction}
- Following the CopyThat methodology for sharp, direct writing`;

    } else {
      // Use the CopyThat base prompt
      prompt = `You are CopyThat, a sharp, direct career-copywriting GPT. Your job: write a single, laser-focused cover letter that sounds human, sells hard, and respects ATS parsing.

==============================
CANDIDATE SNAPSHOT (experience bank to draw from; do not mention all)
Tomás Gomes Ferreira, Lisbon-born CS and Biz Mgmt Bachelor (ISCTE 2025), fresh graduate and immediately available to relocate to ${location || 'job location in Europe'}. Led a 6-person team to a 90 percent accurate wildfire-risk model -> 1st place, Alumni Clube ISCTE / Millennium bcp. Completed AI for Task Automation and Fast Prototyping bootcamp. Future Innovators Program, Unicorn Factory Lisboa (24h MVP development). Grew CC Board Center Google Ads CTR from 7.5 to 17.7 percent and earned page-one SERP. Ex Mercedes-Benz.io campus rep; Philip Morris sales (~46 touches per shift); 90 plus brand activations (Uber, Sporting CP). Stack: Java, Python, SQL, AI, GTM, Software Engineering, Agile or PMBOK, Finance and BI, Google Ads. Languages: PT, EN (fluent); DE and NL (learning). Traits to signal: coachable, eager, hard working, ambitious.

==============================
WRITING PLAYBOOK
• Tone slider -> neutral: formal, neutral, friendly, cheeky.
• Use AIDA for flow and STAR or CAR for proof. Write slippery slide sentences.
• Bias for verbs, numbers, and reader benefit. No buzzword soup.
• Pull at least one ATS keyword from jobDescription and use it naturally.
• No double dashes or em dashes. Use simple ASCII punctuation.
• No commas before the word and like this ,and
• You first writing: aim for a 2 to 1 ratio of you or your or ${company || 'company'} or team to I or me.
• Include one We sentence to frame collaboration.
• Vary rhythm: mix short punchy lines with longer sentences. One optional rhetorical question.
• ${languageInstruction}

==============================
COMPANY AND TEAM FOCUS
• Open about ${company || 'company'} or team, not the candidate.
• Mirror the top three priorities from jobDescription. Name the team if available.
• Add one concrete nod to a real initiative, product, value, or metric from the posting or customInput.
• If relocation matters, state willingness briefly and tie it to being present for the team.

==============================
NEW GRAD EDGE
• State recent graduation early only if it helps the team.
• Link it to value: up to date tools and methods, fast ramp, flexible schedule, immediate start, high coachability.
• Example clause to adapt: I recently completed my bachelor at ISCTE, which keeps my stack current and lets me ramp fast on your roadmap.

==============================
CARNEGIE PRINCIPLES TO WEAVE IN
• Use names early: ${hiringManager || 'Hiring Team'}, ${company || 'company'}, team.
• Talk in terms of the reader's interests before proposing your value.
• Give honest, specific appreciation for one real project or result.
• Show empathy for a pressure the team faces and offer a practical way you help.
• Arouse an eager want: tie actions to their roadmap, metrics, or deadlines.
• Let the idea feel like theirs: Building on your approach to X, I will Y.
• Stay positive and cooperative. Avoid criticism.

==============================
EXPERIENCE SELECTION RULES
• Do not list every experience. Choose only the 2 most relevant wins for role based on jobDescription.
• Map each chosen win to a top duty or KPI in jobDescription.
• Rubric:
* Data or ML or Eng -> wildfire model; Java or Python or SQL; AI bootcamp.
* Growth or Marketing -> CTR lift; page-one SERP; GTM.
* Sales or Field or Brand -> 3000 plus client contacts; 90 plus activations; Mercedes-Benz.io rep.
* Product or Startup or Ops -> 24h MVP; Agile or PMBOK; cross functional delivery.
* Analytics or BI or Finance -> Finance and BI work; quantified outcomes.
• If two wins do not fit tightly, pick one win plus one transferable skill.
• Omit anything that does not advance the employer's goals.

==============================
JOB SPEC
${jobDescription}

==============================
INPUTS
company: ${company || 'required'}
role: ${jobPosition || 'required'}
jobDescription: provided above
hiringManager: ${hiringManager || 'Hiring Team'}
tone: neutral
customInput: ${additionalContext || 'none'}

==============================
OUTPUT RULES
• Return only the final cover letter text. No JSON, no brackets, no extra commentary.
• 250 to 300 words. ATS clean. Personalized with ${company || 'company'} and role.
• End with Best regards, and the typed name Tomás.
• Do not include contact information or addresses (these will be added separately)
• Do not include "JOB REFERENCE:" lines (handled by template)
• Do not include "Assunto:" or "Subject:" lines (handled by template)
• Do not include company location lines (handled by template)

==============================
STRUCTURE OPTIONS (choose the single strongest option for jobDescription; do not label sections in the final letter)
Option A: Problem -> Proof -> Fit -> Ask
1. Greeting: Hi ${hiringManager || 'Hiring Team'}, or Dear Hiring Team,
2. Problem: start with a line about ${company || 'company'} or team goals or constraints.
3. Proof: one selected win matched to a stated duty or KPI. Quantify.
4. Fit: one more relevant win plus one ATS keyword. Use one We sentence. Add one short line about the new grad edge if it helps.
5. Ask: propose a next step and a friendly question. Warm sign off.

Option B: Praise -> Bridge -> Two Hits -> Close
1. Praise something specific about ${company || 'company'} or team.
2. Bridge with empathy for a pressure they face.
3. Hit 1 and Hit 2: two tight achievements that move their metrics.
4. Close with value in the first 90 days, one line on fresh graduation if useful, and the ask.

Option C: Mini Case Story
1. Open with a company focused line, then a one sentence case setup.
2. Action and result with numbers.
3. Translate the lesson to role using one ATS keyword. Add a brief graduation benefit if relevant.
4. Close with the ask.

==============================
QUALITY CHECK BEFORE SENDING
• Company first opening.
• Two wins only, both mapped to duties.
• One ATS keyword used naturally.
• Varied sentence lengths and no ,and errors.
• Fresh graduate benefit used only if it helps the reader.
• No em dashes or double dashes.
• End with Best regards, and Tomás.`;
    }

    // Add additional context for regeneration
    if (additionalContext) {
      if (useCurrentLetter && currentLetterContent) {
        prompt += `\n\nSPECIFIC MODIFICATIONS REQUESTED: ${additionalContext}
Please apply these changes to the cover letter above while maintaining its overall quality and professionalism.`;
      } else {
        prompt += `\n\nAdditional customInput to incorporate: ${additionalContext}
Please integrate these specific requirements into the cover letter while following the CopyThat methodology.`;
      }
    }

    return prompt;
  }

  /**
   * Generate a cover letter using OpenAI API
   * @param request - Cover letter request data
   * @returns Promise with API response containing generated cover letter
   */
  async generateCoverLetter(request: CoverLetterRequest): Promise<ApiResponse<string>> {
    try {
      // Validate API key
      if (!this.isConfigured()) {
        return {
          success: false,
          error: 'API key not configured',
          statusCode: 401
        };
      }

      // Validate required fields
      if (!request.jobDescription?.trim()) {
        return {
          success: false,
          error: 'Job description is required',
          statusCode: 400
        };
      }

      const prompt = this.formatPrompt(request);

      const response = await this.client!.chat.completions.create({
        model: 'gpt-3.5-turbo', // Using gpt-3.5-turbo as it's more widely available than gpt-5
        messages: [
          {
            role: 'system',
            content: 'You are CopyThat — a sharp, direct career-copywriting GPT specialized in writing laser-focused cover letters that sound human, sell hard, and respect ATS parsing. You follow the CopyThat methodology for maximum impact.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      });

      const generatedText = response.choices[0]?.message?.content;

      if (!generatedText) {
        return {
          success: false,
          error: 'No content generated from API',
          statusCode: 500
        };
      }

      return {
        success: true,
        data: generatedText.trim()
      };

    } catch (error) {
      return this.handleApiError(error);
    }
  }

  /**
   * Handle API errors and convert them to standardized error responses
   * @param error - Error from API call
   * @returns Standardized error response
   */
  private handleApiError(error: any): ApiResponse<string> {
    // Handle OpenAI specific errors
    if (error?.error) {
      const apiError = error as ApiError;
      const errorMessage = apiError.error.message || 'Unknown API error';
      const errorType = apiError.error.type || '';
      const statusCode = apiError.statusCode || error.status || 500;

      // Handle specific OpenAI error types
      if (statusCode === 401 || errorType === 'invalid_api_key') {
        return {
          success: false,
          error: 'Invalid API key. Please check your OpenAI API key configuration.',
          statusCode: 401
        };
      }

      if (statusCode === 429 || errorType === 'rate_limit_exceeded') {
        return {
          success: false,
          error: 'Rate limit exceeded. Please wait a moment before trying again.',
          statusCode: 429
        };
      }

      if (statusCode === 400 && errorType === 'content_policy_violation') {
        return {
          success: false,
          error: 'Content policy violation. Please modify your job description and try again.',
          statusCode: 400
        };
      }

      return {
        success: false,
        error: `API Error: ${errorMessage}`,
        statusCode
      };
    }

    // Handle network errors
    if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('network')) {
      return {
        success: false,
        error: 'Network error. Please check your internet connection and try again.',
        statusCode: 0
      };
    }

    // Handle timeout errors
    if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
      return {
        success: false,
        error: 'Request timeout. Please try again.',
        statusCode: 408
      };
    }

    // Generic error handling
    const errorMessage = error?.message || 'An unexpected error occurred';
    return {
      success: false,
      error: `Unexpected error: ${errorMessage}`,
      statusCode: 500
    };
  }

  /**
   * Convert API response to AppError for consistent error handling
   * @param response - Failed API response
   * @returns AppError object
   */
  static responseToAppError(response: ApiResponse<string>): AppError {
    const statusCode = response.statusCode || 500;
    const message = response.error || 'Unknown error';

    let errorType: ErrorType;
    let retryable = false;

    switch (statusCode) {
      case 401:
        errorType = message.includes('API key') ? ErrorType.API_KEY_INVALID : ErrorType.API_KEY_MISSING;
        retryable = false;
        break;
      case 429:
        errorType = ErrorType.API_RATE_LIMIT;
        retryable = true;
        break;
      case 400:
        errorType = message.includes('Content policy violation') ? ErrorType.API_CONTENT_POLICY : ErrorType.VALIDATION_ERROR;
        retryable = false;
        break;
      case 0:
        errorType = ErrorType.NETWORK_ERROR;
        retryable = true;
        break;
      case 408:
        errorType = ErrorType.NETWORK_ERROR;
        retryable = true;
        break;
      default:
        if (message.includes('Network error')) {
          errorType = ErrorType.NETWORK_ERROR;
        } else {
          errorType = ErrorType.API_GENERAL_ERROR;
        }
        retryable = true;
        break;
    }

    return {
      type: errorType,
      message,
      code: statusCode,
      retryable
    };
  }

  /**
   * Test the API connection with a simple request
   * @returns Promise with test result
   */
  async testConnection(): Promise<ApiResponse<boolean>> {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: 'API key not configured',
          statusCode: 401
        };
      }

      const testRequest: CoverLetterRequest = {
        jobDescription: 'Software Developer position at a tech company'
      };

      const result = await this.generateCoverLetter(testRequest);

      if (result.success) {
        return {
          success: true,
          data: true
        };
      } else {
        return {
          success: false,
          error: result.error,
          statusCode: result.statusCode
        };
      }
    } catch (error) {
      const errorResponse = this.handleApiError(error);
      return {
        success: false,
        error: errorResponse.error,
        statusCode: errorResponse.statusCode
      };
    }
  }
}

// Export a default instance
export const openaiService = new OpenAIService();