// src/lib/tourConfig.ts
// Tour step definitions for Driver.js

import { DriveStep } from 'driver.js';

export const tourSteps: DriveStep[] = [
  {
    element: '#root',
    popover: {
      title: '👋 Welcome to Email Wizard!',
      description: 'Let\'s take a quick tour to show you how to create your first email campaign. You can skip any step!',
      side: 'bottom',
      align: 'center'
    }
  },
  {
    element: 'a[href="/app/contacts"]',
    popover: {
      title: '📇 Step 1: Manage Contacts',
      description: 'Start here to add the people you want to email. You can import a CSV file or add contacts manually.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: 'a[href="/app/templates"]',
    popover: {
      title: '📧 Step 2: Choose Templates',
      description: 'Browse professional email templates or create your own custom designs.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: 'a[href="/app/campaigns"]',
    popover: {
      title: '🚀 Step 3: Create Campaigns',
      description: 'This is where you create and send your email campaigns. Let\'s check it out!',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: 'a[href="/app/analytics"]',
    popover: {
      title: '📊 Step 4: Track Performance',
      description: 'Monitor opens, clicks, and engagement metrics for your campaigns.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: 'a[href="/app/settings"]',
    popover: {
      title: '⚙️ Step 5: Configure Settings',
      description: 'Customize your account, manage billing, and set up custom domains here.',
      side: 'right',
      align: 'start'
    }
  },
  {
    element: '#root',
    popover: {
      title: '🎉 You\'re All Set!',
      description: 'You can replay this tour anytime by clicking the "?" button in the top right corner.',
      side: 'bottom',
      align: 'center'
    }
  }
];

// Custom styling to match Email Wizard theme
export const tourConfig = {
  showProgress: true,
  showButtons: ['next', 'previous', 'close'],
  progressText: 'Step {{current}} of {{total}}',
  nextBtnText: 'Next →',
  prevBtnText: '← Back',
  doneBtnText: 'Finish ✓',
  closeBtnText: 'Skip',
  overlayColor: 'rgba(0, 0, 0, 0.5)',
  popoverClass: 'email-wizard-tour-popover',
  animate: true,
  smoothScroll: true
};