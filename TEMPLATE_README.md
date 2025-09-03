# Professional Cover Letter PDF Template

This cover letter generator now uses a professional PDF template that creates standardized, well-formatted cover letters similar to the example you provided.

## Template Features

### Standard Header
- **Large name** in uppercase (e.g., "TOMAS FERREIRA")
- **Dynamic title** below name (uses job position from form, falls back to config)
- **Contact information** right-aligned:
  - Phone number
  - Email address
  - Website
  - Location (language-dependent: "Lisbon (Open to relocate)" / "Lisboa (Disponível para relocação)")
- **Horizontal separator line**

### Professional Body
- **Date** in formal format (e.g., "15th January 2024")
- **Recipient information** block
- **Job reference** line (e.g., "JOB REFERENCE: SOFTWARE DEVELOPER")
- **Proper greeting** (Dear [Name] or Dear Hiring Manager)
- **Generated content** with clean formatting
- **Standard closing** with "Sincerely," and signature

## Customization

### Personal Information
Edit `src/config/template.ts` to update your personal details:

```typescript
export const PERSONAL_TEMPLATE_CONFIG: Partial<TemplateConfig> = {
  applicantName: 'YOUR FULL NAME',
  applicantTitle: 'Your Fallback Title', // Used when no job position is provided
  contactInfo: {
    phone: '+your-phone-number',
    email: 'your.email@domain.com',
    website: 'yourwebsite.com',
    address: 'Your City (Open to relocate)' // Will be localized automatically
  }
};
```

### Dynamic Features

**Dynamic Title:**
The title below your name automatically changes based on the job position you enter in the form:
- **Job Position provided**: Uses the exact job title (e.g., "Senior Frontend Engineer", "Product Manager")
- **No Job Position**: Falls back to your configured `applicantTitle` from the config file

**Localized Address:**
The address automatically changes based on the selected language:
- **English**: "Lisbon (Open to relocate)"
- **Portuguese**: "Lisboa (Disponível para relocação)"

**Localized Date:**
The date format changes based on the selected language:
- **English**: "15th January 2024"
- **Portuguese**: "15 de Janeiro de 2024"

### Template Variants
The system includes pre-configured variants:

- **Default**: Standard professional format
- **Compact**: Smaller margins and fonts for more content
- **Executive**: Larger fonts and margins for senior positions

### Font and Layout Options
Customize formatting in the config:

```typescript
margins: {
  top: 25,    // Top margin in mm
  bottom: 25, // Bottom margin in mm
  left: 25,   // Left margin in mm
  right: 25   // Right margin in mm
},
font: {
  family: 'helvetica', // 'helvetica', 'times', or 'courier'
  size: 11,            // Font size in points
  lineHeight: 1.4      // Line spacing multiplier
}
```

## Content Processing

### Automatic Cleaning
The template automatically removes:
- AI-generated greetings ("Dear..." at the start)
- AI-generated closings ("Sincerely..." at the end)
- Duplicate salutations and sign-offs

### Paragraph Formatting
- Proper spacing between paragraphs
- Automatic text wrapping
- Page breaks when needed
- Consistent line height

## File Naming
PDFs are automatically named using the format:
`[Name]_[JobPosition]_[Company].pdf`

Example: `TOMAS_FERREIRA_Software_Developer_Tech_Company.pdf`

## Usage

The template is automatically used when generating PDFs. No code changes needed - just update your personal information in the config file.

### Direct Template Access
If you need direct access to the template service:

```typescript
import { getTemplateService } from './services/templateInitializer';

const templateService = getTemplateService();
await templateService.generatePDF(coverLetterData, customConfig);
```

### Legacy Format
If you need the old format for any reason:

```typescript
import { pdfService } from './services/pdfService';

await pdfService.generateLegacyPDF(coverLetterData);
```

## Testing

Run template tests:
```bash
npm test -- pdfTemplate.test.ts
```

## Example Output

The generated PDF will have a professional appearance matching standard business letter formats, with:
- Clean, readable typography
- Proper spacing and alignment
- Consistent formatting throughout
- Professional header and footer sections
- Automatic content optimization

This ensures every cover letter maintains a professional standard while allowing the AI-generated content to be the focus.