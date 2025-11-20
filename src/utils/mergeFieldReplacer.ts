/**
 * MERGE FIELD REPLACEMENT UTILITY
 * Replaces personalization placeholders with actual contact data
 * Provides fallback text for missing fields
 */

export interface Contact {
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  company?: string | null;
  role?: string | null;
  industry?: string | null;
}

/**
 * Replaces merge fields in HTML/text with contact data
 * 
 * Supported fields:
 * - {{firstname}} → contact.first_name or [First Name]
 * - {{lastname}} → contact.last_name or [Last Name]
 * - {{company}} → contact.company or [Company]
 * - {{role}} → contact.role or [Role]
 * - {{industry}} → contact.industry or [Industry]
 * - {{email}} → contact.email
 * 
 * @param template - HTML/text template with {{field}} placeholders
 * @param contact - Contact data object
 * @returns Personalized content
 */
export function replacePersonalizationFields(
  template: string,
  contact: Contact
): string {
  if (!template) return '';
  
  return template
    // Case-insensitive replacement
    .replace(/\{\{firstname\}\}/gi, contact.first_name || '[First Name]')
    .replace(/\{\{lastname\}\}/gi, contact.last_name || '[Last Name]')
    .replace(/\{\{company\}\}/gi, contact.company || '[Company]')
    .replace(/\{\{role\}\}/gi, contact.role || '[Role]')
    .replace(/\{\{industry\}\}/gi, contact.industry || '[Industry]')
    .replace(/\{\{email\}\}/gi, contact.email);
}

/**
 * Validates if a contact has all required data for merge fields in template
 * 
 * @param template - HTML template to check
 * @param contact - Contact to validate
 * @returns Object with validation results
 */
export function validateContactData(
  template: string,
  contact: Contact
): {
  isValid: boolean;
  missingFields: string[];
} {
  const requiredFields: Array<{field: string; value: any}> = [];
  
  if (template.match(/\{\{firstname\}\}/gi)) {
    requiredFields.push({ field: 'first_name', value: contact.first_name });
  }
  if (template.match(/\{\{lastname\}\}/gi)) {
    requiredFields.push({ field: 'last_name', value: contact.last_name });
  }
  if (template.match(/\{\{company\}\}/gi)) {
    requiredFields.push({ field: 'company', value: contact.company });
  }
  if (template.match(/\{\{role\}\}/gi)) {
    requiredFields.push({ field: 'role', value: contact.role });
  }
  if (template.match(/\{\{industry\}\}/gi)) {
    requiredFields.push({ field: 'industry', value: contact.industry });
  }
  
  const missingFields = requiredFields
    .filter(f => !f.value)
    .map(f => f.field);
  
  return {
    isValid: missingFields.length === 0,
    missingFields
  };
}

/**
 * Processes template for EDITABLE sections (for template editor)
 * Extracts sections marked with {{EDITABLE:section_name}}
 */
export function extractEditableSections(template: string): Array<{
  id: string;
  placeholder: string;
  content: string;
}> {
  const regex = /\{\{EDITABLE:(\w+)\}\}/g;
  const sections: Array<{id: string; placeholder: string; content: string}> = [];
  let match;
  
  while ((match = regex.exec(template)) !== null) {
    sections.push({
      id: match[1],
      placeholder: match[0],
      content: ''
    });
  }
  
  return sections;
}

/**
 * Replaces EDITABLE placeholders with actual content
 */
export function replaceEditableSections(
  template: string,
  content: Record<string, string>
): string {
  let result = template;
  
  Object.entries(content).forEach(([sectionId, value]) => {
    const placeholder = `{{EDITABLE:${sectionId}}}`;
    result = result.replace(new RegExp(placeholder, 'g'), value);
  });
  
  return result;
}