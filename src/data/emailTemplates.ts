/**
 * Email Templates Data
 * 
 * Central repository of email templates with section-based structure.
 * Each template includes:
 * - Sections array for drag-and-drop editing
 * - Settings for styling customization
 * - Generated HTML for backward compatibility
 */

import type { Section } from '../components/templates/SectionEditor';

export interface EmailTemplate {
  id: string;
  name: string;
  category: string;
  description?: string;
  thumbnail?: string;
  is_locked: boolean;
  content: {
    sections: Section[];
    settings: {
      companyName: string;
      backgroundColor: string;
      textColor: string;
      linkColor: string;
      fontFamily: string;
    };
    html?: string;  // Generated HTML for backward compatibility
  };
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'welcome',
    name: 'Welcome Email',
    category: 'onboarding',
    description: 'Welcome new subscribers with a warm greeting',
    is_locked: true,
    content: {
      sections: [
        {
          id: 'header-1',
          type: 'header',
          content: {
            title: 'Welcome to Our Community!',
            subtitle: 'Thanks for joining us'
          }
        },
        {
          id: 'text-1',
          type: 'text',
          content: {
            text: 'Hi {{MERGE:first_name}},\n\nWe\'re thrilled to have you on board! Welcome to our community of innovators and creators.'
          }
        },
        {
          id: 'text-2',
          type: 'text',
          content: {
            text: 'Here\'s what you can expect from us:\n\n• Weekly tips and insights\n• Exclusive member benefits\n• Early access to new features\n• A supportive community'
          }
        },
        {
          id: 'button-1',
          type: 'button',
          content: {
            buttonText: 'Get Started',
            buttonUrl: 'https://example.com/getting-started',
            buttonColor: '#f3ba42'
          }
        },
        {
          id: 'divider-1',
          type: 'divider',
          content: {
            dividerColor: '#E5E7EB'
          }
        },
        {
          id: 'text-3',
          type: 'text',
          content: {
            text: 'Questions? Just reply to this email - we\'re here to help!'
          }
        }
      ],
      settings: {
        companyName: 'Your Company',
        backgroundColor: '#F5F5F5',
        textColor: '#333333',
        linkColor: '#f3ba42',
        fontFamily: 'DM Sans, sans-serif'
      }
    }
  },
  {
    id: 'newsletter',
    name: 'Newsletter',
    category: 'newsletter',
    description: 'Monthly or weekly newsletter template',
    is_locked: true,
    content: {
      sections: [
        {
          id: 'header-1',
          type: 'header',
          content: {
            title: 'Monthly Newsletter',
            subtitle: 'Your dose of updates and insights'
          }
        },
        {
          id: 'text-1',
          type: 'text',
          content: {
            text: 'Hello {{MERGE:first_name}},\n\nWelcome to this month\'s newsletter! Here\'s what\'s new and exciting.'
          }
        },
        {
          id: 'text-2',
          type: 'text',
          content: {
            text: '📰 Top Stories This Month\n\nDiscover the latest trends, updates, and insights from our team.'
          }
        },
        {
          id: 'divider-1',
          type: 'divider',
          content: {
            dividerColor: '#E5E7EB'
          }
        },
        {
          id: 'text-3',
          type: 'text',
          content: {
            text: '🎯 Featured Content\n\nCheck out our most popular articles and resources from this month.'
          }
        },
        {
          id: 'button-1',
          type: 'button',
          content: {
            buttonText: 'Read More',
            buttonUrl: 'https://example.com/blog',
            buttonColor: '#57377d'
          }
        }
      ],
      settings: {
        companyName: 'Your Company',
        backgroundColor: '#FFFFFF',
        textColor: '#333333',
        linkColor: '#57377d',
        fontFamily: 'DM Sans, sans-serif'
      }
    }
  },
  {
    id: 'product-announcement',
    name: 'Product Announcement',
    category: 'marketing',
    description: 'Announce new products or features',
    is_locked: true,
    content: {
      sections: [
        {
          id: 'header-1',
          type: 'header',
          content: {
            title: 'Introducing Something New',
            subtitle: 'You\'re going to love this'
          }
        },
        {
          id: 'text-1',
          type: 'text',
          content: {
            text: 'Hey {{MERGE:first_name}},\n\nWe\'ve been working on something special, and today we\'re excited to share it with you!'
          }
        },
        {
          id: 'text-2',
          type: 'text',
          content: {
            text: '✨ Key Features:\n\n• Lightning-fast performance\n• Intuitive user interface\n• Advanced customization options\n• Seamless integrations'
          }
        },
        {
          id: 'button-1',
          type: 'button',
          content: {
            buttonText: 'Learn More',
            buttonUrl: 'https://example.com/new-product',
            buttonColor: '#f3ba42'
          }
        },
        {
          id: 'divider-1',
          type: 'divider',
          content: {
            dividerColor: '#E5E7EB'
          }
        },
        {
          id: 'text-3',
          type: 'text',
          content: {
            text: 'Have questions? Our support team is standing by to help you get started.'
          }
        }
      ],
      settings: {
        companyName: 'Your Company',
        backgroundColor: '#F5F5F5',
        textColor: '#333333',
        linkColor: '#f3ba42',
        fontFamily: 'DM Sans, sans-serif'
      }
    }
  },
  {
    id: 'promotional',
    name: 'Promotional Email',
    category: 'marketing',
    description: 'Special offers and promotions',
    is_locked: true,
    content: {
      sections: [
        {
          id: 'header-1',
          type: 'header',
          content: {
            title: '🎉 Special Offer Inside',
            subtitle: 'Limited time only'
          }
        },
        {
          id: 'text-1',
          type: 'text',
          content: {
            text: 'Hi {{MERGE:first_name}},\n\nDon\'t miss out on this exclusive offer - just for you!'
          }
        },
        {
          id: 'text-2',
          type: 'text',
          content: {
            text: '💰 Get 25% Off\n\nUse code SPECIAL25 at checkout\n\nValid until end of month'
          }
        },
        {
          id: 'button-1',
          type: 'button',
          content: {
            buttonText: 'Shop Now',
            buttonUrl: 'https://example.com/shop',
            buttonColor: '#ef4444'
          }
        },
        {
          id: 'divider-1',
          type: 'divider',
          content: {
            dividerColor: '#E5E7EB'
          }
        },
        {
          id: 'text-3',
          type: 'text',
          content: {
            text: 'Terms and conditions apply. Offer expires soon!'
          }
        }
      ],
      settings: {
        companyName: 'Your Company',
        backgroundColor: '#FEF3C7',
        textColor: '#333333',
        linkColor: '#ef4444',
        fontFamily: 'DM Sans, sans-serif'
      }
    }
  },
  {
    id: 'event-invitation',
    name: 'Event Invitation',
    category: 'events',
    description: 'Invite subscribers to events',
    is_locked: true,
    content: {
      sections: [
        {
          id: 'header-1',
          type: 'header',
          content: {
            title: 'You\'re Invited!',
            subtitle: 'Join us for an exclusive event'
          }
        },
        {
          id: 'text-1',
          type: 'text',
          content: {
            text: 'Dear {{MERGE:first_name}},\n\nWe\'re hosting a special event and would love for you to join us.'
          }
        },
        {
          id: 'text-2',
          type: 'text',
          content: {
            text: '📅 Event Details:\n\nDate: [Event Date]\nTime: [Event Time]\nLocation: [Venue or Virtual]\n\nDon\'t miss this opportunity to connect, learn, and grow with us!'
          }
        },
        {
          id: 'button-1',
          type: 'button',
          content: {
            buttonText: 'RSVP Now',
            buttonUrl: 'https://example.com/rsvp',
            buttonColor: '#8b5cf6'
          }
        },
        {
          id: 'divider-1',
          type: 'divider',
          content: {
            dividerColor: '#E5E7EB'
          }
        },
        {
          id: 'text-3',
          type: 'text',
          content: {
            text: 'Space is limited. Reserve your spot today!'
          }
        }
      ],
      settings: {
        companyName: 'Your Company',
        backgroundColor: '#F3E8FF',
        textColor: '#333333',
        linkColor: '#8b5cf6',
        fontFamily: 'DM Sans, sans-serif'
      }
    }
  },
  {
    id: 'blank',
    name: 'Blank Template',
    category: 'basic',
    description: 'Start from scratch',
    is_locked: true,
    content: {
      sections: [
        {
          id: 'text-1',
          type: 'text',
          content: {
            text: 'Start writing your email here...'
          }
        }
      ],
      settings: {
        companyName: 'Your Company',
        backgroundColor: '#FFFFFF',
        textColor: '#333333',
        linkColor: '#f3ba42',
        fontFamily: 'DM Sans, sans-serif'
      }
    }
  }
];

/**
 * Helper function to get template by ID
 */
export function getTemplateById(id: string): EmailTemplate | undefined {
  return EMAIL_TEMPLATES.find(t => t.id === id);
}

/**
 * Helper function to get templates by category
 */
export function getTemplatesByCategory(category: string): EmailTemplate[] {
  return EMAIL_TEMPLATES.filter(t => t.category === category);
}

/**
 * Helper function to extract editable fields from template
 */
export function extractEditableFields(html: string): string[] {
  const regex = /\{\{EDITABLE:(\w+)\}\}/g;
  const fields: string[] = [];
  let match;
  
  while ((match = regex.exec(html)) !== null) {
    fields.push(match[1]);
  }
  
  return fields;
}

/**
 * Helper function to extract merge fields from template
 */
export function extractMergeFields(html: string): string[] {
  const regex = /\{\{MERGE:(\w+)\}\}/g;
  const fields: string[] = [];
  let match;
  
  while ((match = regex.exec(html)) !== null) {
    if (!fields.includes(match[1])) {
      fields.push(match[1]);
    }
  }
  
  return fields;
}