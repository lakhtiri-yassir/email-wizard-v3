/**
 * ============================================================================
 * Template Migration Utility
 * ============================================================================
 * 
 * Purpose: Convert existing HTML-only templates to section-based format
 * 
 * This migration:
 * - Finds all templates without sections
 * - Creates default section structure
 * - Preserves existing HTML for backward compatibility
 * - Adds default settings
 * 
 * Usage:
 * - Run manually from Templates page (admin only)
 * - Or run automatically on first load
 * 
 * ============================================================================
 */

import { supabase } from '../lib/supabase';
import type { Section } from '../components/templates/SectionEditor';

interface MigrationResult {
  success: boolean;
  migratedCount: number;
  skippedCount: number;
  errors: string[];
}

/**
 * Migrate all templates to section-based format
 */
export async function migrateTemplatesToSections(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    migratedCount: 0,
    skippedCount: 0,
    errors: [],
  };

  try {
    console.log('🔄 Starting template migration...');

    // Get all templates that need migration
    // (templates where content is a string or content.sections is null/missing)
    const { data: templates, error: fetchError } = await supabase
      .from('templates')
      .select('*');

    if (fetchError) {
      throw fetchError;
    }

    if (!templates || templates.length === 0) {
      console.log('✅ No templates found to migrate');
      return result;
    }

    console.log(`📋 Found ${templates.length} templates`);

    // Filter templates that need migration
    const templatesToMigrate = templates.filter((template) => {
      // If content is a string, needs migration
      if (typeof template.content === 'string') {
        return true;
      }

      // If content is an object but has no sections, needs migration
      if (
        typeof template.content === 'object' &&
        (!template.content.sections || !Array.isArray(template.content.sections))
      ) {
        return true;
      }

      return false;
    });

    console.log(`🔧 ${templatesToMigrate.length} templates need migration`);
    result.skippedCount = templates.length - templatesToMigrate.length;

    // Migrate each template
    for (const template of templatesToMigrate) {
      try {
        console.log(`  📝 Migrating: ${template.name} (${template.id})`);

        // Extract existing HTML
        let existingHtml = '';
        if (typeof template.content === 'string') {
          existingHtml = template.content;
        } else if (
          typeof template.content === 'object' &&
          template.content.html
        ) {
          existingHtml = template.content.html;
        }

        // Create default sections based on template analysis
        const defaultSections = analyzeAndCreateSections(
          template.name,
          existingHtml
        );

        // Create default settings
        const defaultSettings = {
          companyName: 'Your Company',
          backgroundColor: '#F5F5F5',
          textColor: '#333333',
          linkColor: '#f3ba42',
          fontFamily: 'DM Sans, sans-serif',
        };

        // Prepare new content structure
        const newContent = {
          sections: defaultSections,
          settings: defaultSettings,
          html: existingHtml, // Preserve original HTML
        };

        // Update template
        const { error: updateError } = await supabase
          .from('templates')
          .update({
            content: newContent,
            updated_at: new Date().toISOString(),
          })
          .eq('id', template.id);

        if (updateError) {
          throw updateError;
        }

        console.log(`  ✅ Migrated: ${template.name}`);
        result.migratedCount++;
      } catch (error: any) {
        console.error(`  ❌ Failed to migrate ${template.name}:`, error);
        result.errors.push(`${template.name}: ${error.message}`);
        result.success = false;
      }
    }

    console.log('🎉 Migration complete!');
    console.log(`  ✅ Migrated: ${result.migratedCount}`);
    console.log(`  ⏭️  Skipped: ${result.skippedCount}`);
    console.log(`  ❌ Errors: ${result.errors.length}`);

    return result;
  } catch (error: any) {
    console.error('💥 Migration failed:', error);
    result.success = false;
    result.errors.push(error.message);
    return result;
  }
}

/**
 * Analyze template and create appropriate sections
 */
function analyzeAndCreateSections(
  templateName: string,
  html: string
): Section[] {
  const sections: Section[] = [];

  // Create a welcome header section
  sections.push({
    id: `header-${Date.now()}-1`,
    type: 'header',
    content: {
      title: templateName,
      subtitle: 'This template was automatically migrated',
    },
  });

  // If HTML exists, try to extract meaningful content
  if (html && html.length > 50) {
    // Try to extract text content from HTML (basic extraction)
    const textContent = extractTextFromHTML(html);

    if (textContent.length > 0) {
      sections.push({
        id: `text-${Date.now()}-2`,
        type: 'text',
        content: {
          text: textContent.substring(0, 500) + (textContent.length > 500 ? '...\n\n[Original content preserved]' : ''),
        },
      });
    }
  } else {
    // No HTML, create a placeholder
    sections.push({
      id: `text-${Date.now()}-2`,
      type: 'text',
      content: {
        text: 'This template was automatically migrated. Please edit to customize your content.\n\nYou can add more sections using the buttons below.',
        },
    });
  }

  // Add a CTA button section
  sections.push({
    id: `button-${Date.now()}-3`,
    type: 'button',
    content: {
      buttonText: 'Take Action',
      buttonUrl: 'https://example.com',
      buttonColor: '#f3ba42',
    },
  });

  return sections;
}

/**
 * Extract plain text from HTML (basic implementation)
 */
function extractTextFromHTML(html: string): string {
  // Remove script and style tags
  let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");

  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

/**
 * Check if a specific template needs migration
 */
export function templateNeedsMigration(template: any): boolean {
  // If content is a string, needs migration
  if (typeof template.content === 'string') {
    return true;
  }

  // If content is an object but has no sections, needs migration
  if (
    typeof template.content === 'object' &&
    (!template.content.sections || !Array.isArray(template.content.sections))
  ) {
    return true;
  }

  return false;
}

/**
 * Migrate a single template
 */
export async function migrateSingleTemplate(
  templateId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`🔄 Migrating single template: ${templateId}`);

    const { data: template, error: fetchError } = await supabase
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (fetchError) throw fetchError;
    if (!template) throw new Error('Template not found');

    // Check if migration needed
    if (!templateNeedsMigration(template)) {
      console.log('⏭️  Template already migrated');
      return { success: true };
    }

    // Extract existing HTML
    let existingHtml = '';
    if (typeof template.content === 'string') {
      existingHtml = template.content;
    } else if (typeof template.content === 'object' && template.content.html) {
      existingHtml = template.content.html;
    }

    // Create sections and settings
    const defaultSections = analyzeAndCreateSections(template.name, existingHtml);
    const defaultSettings = {
      companyName: 'Your Company',
      backgroundColor: '#F5F5F5',
      textColor: '#333333',
      linkColor: '#f3ba42',
      fontFamily: 'DM Sans, sans-serif',
    };

    // Update template
    const { error: updateError } = await supabase
      .from('templates')
      .update({
        content: {
          sections: defaultSections,
          settings: defaultSettings,
          html: existingHtml,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', templateId);

    if (updateError) throw updateError;

    console.log('✅ Template migrated successfully');
    return { success: true };
  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    return { success: false, error: error.message };
  }
}