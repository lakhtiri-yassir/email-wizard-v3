/**
 * ============================================================================
 * DNS Provider Setup Guides
 * ============================================================================
 * 
 * Platform-specific instructions for major DNS providers
 * Includes: Screenshots, troubleshooting, coexistence with email providers
 */

export interface DNSGuideStep {
  title: string;
  description: string;
  screenshot?: string;
  notes?: string;
  warning?: string;
}

export interface DNSProviderGuide {
  name: string;
  logo: string;
  difficulty: 'Easy' | 'Medium' | 'Advanced';
  estimatedTime: string;
  specialNote?: {
    type: 'info' | 'warning' | 'success';
    title: string;
    message: string;
  };
  steps: DNSGuideStep[];
  troubleshooting: string[];
  videoUrl?: string;
}

export const DNS_PROVIDER_GUIDES: Record<string, DNSProviderGuide> = {
  siteground: {
    name: 'Siteground',
    logo: '/providers/siteground.svg',
    difficulty: 'Easy',
    estimatedTime: '5-10 minutes',
    steps: [
      {
        title: 'Step 1: Access DNS Zone Editor',
        description: 'Log into your Siteground account and navigate to the DNS management area.',
        notes: '1. Go to Site Tools from your dashboard\n2. Click "Domain" in the left sidebar\n3. Select "DNS Zone Editor"'
      },
      {
        title: 'Step 2: Add TXT Record (SPF)',
        description: 'Add the SPF record to authorize Email Wizard to send on your behalf.',
        notes: '• Click "Add New Record"\n• Select record type: TXT\n• Enter the Host and Value exactly as shown below\n• TTL: 300 (or leave default)\n\n⚠️ Siteground may automatically append your domain name. If your domain is example.com and the host shows "mail.example.com", enter only "mail"'
      },
      {
        title: 'Step 3: Add CNAME Records (DKIM)',
        description: 'Add two CNAME records for email authentication.',
        notes: '• Click "Add New Record" again\n• Select record type: CNAME\n• Add first DKIM record\n• Repeat for second DKIM record\n\n⚠️ For CNAME records, enter ONLY the subdomain part in the Host field (e.g., "s1._domainkey" NOT "s1._domainkey.example.com")'
      },
      {
        title: 'Step 4: Verify Records',
        description: 'Wait 1-24 hours for DNS propagation, then verify in Email Wizard.',
        notes: '• DNS changes can take anywhere from 1 hour to 24 hours to propagate\n• You can check propagation status at: whatsmydns.net\n• Once propagated, click "Verify Domain" in Email Wizard'
      }
    ],
    troubleshooting: [
      'If verification fails after 24 hours, double-check for typos in the records',
      'Ensure you entered only the subdomain part (without your full domain) in the Host field',
      'Clear your Siteground cache: Site Tools → Speed → Caching → Purge Cache',
      'Some Siteground plans require enabling "Advanced DNS" - contact Siteground support if you don\'t see DNS options'
    ]
  },

  cloudflare: {
    name: 'Cloudflare',
    logo: '/providers/cloudflare.svg',
    difficulty: 'Easy',
    estimatedTime: '5 minutes',
    specialNote: {
      type: 'warning',
      title: 'Critical: Disable Cloudflare Proxy',
      message: 'You MUST disable the Cloudflare proxy (orange cloud) for all email DNS records. If the cloud is orange, email authentication will fail.'
    },
    steps: [
      {
        title: 'Step 1: Access DNS Management',
        description: 'Navigate to DNS settings in your Cloudflare dashboard.',
        notes: '1. Log into Cloudflare\n2. Select your domain\n3. Click "DNS" in the left sidebar'
      },
      {
        title: 'Step 2: Add DNS Records',
        description: 'Click "Add Record" and enter each record exactly as shown below.',
        notes: 'For each record:\n• Click "+ Add Record"\n• Select the Type (TXT or CNAME)\n• Enter Name and Content/Target\n• TTL: Auto (or 300)\n• Proxy status: DNS only (gray cloud) ⬅️ CRITICAL'
      },
      {
        title: 'Step 3: Disable Cloudflare Proxy',
        description: 'CRITICAL: Ensure all email records show a GRAY cloud (DNS only).',
        warning: '🚨 This is the #1 reason Cloudflare users fail verification. Click the orange cloud next to each email record until it turns gray. Orange cloud = proxied through Cloudflare = broken email authentication.',
        notes: '• SPF record: Gray cloud\n• DKIM1 record: Gray cloud\n• DKIM2 record: Gray cloud\n• MX record (if present): Gray cloud\n\nIf you see an orange cloud, CLICK IT to turn it gray.'
      },
      {
        title: 'Step 4: Instant Verification',
        description: 'Cloudflare propagates DNS changes instantly. Verify immediately.',
        notes: 'Cloudflare updates DNS records in real-time. You can verify your domain in Email Wizard right away!'
      }
    ],
    troubleshooting: [
      '❌ Verification failing? → Check that ALL email records have GRAY cloud (not orange)',
      '❌ Still failing? → Temporarily pause Cloudflare: Overview → Pause Cloudflare, then verify',
      '✅ After verification succeeds, you can re-enable Cloudflare (keep email records on gray cloud)',
      'If DKIM records keep showing orange cloud, manually type "DNS only" in the proxy dropdown'
    ],
    videoUrl: 'https://www.youtube.com/watch?v=cloudflare-dns-guide'
  },

  microsoft365: {
    name: 'Microsoft 365 / Office 365',
    logo: '/providers/microsoft365.svg',
    difficulty: 'Medium',
    estimatedTime: '10-15 minutes',
    specialNote: {
      type: 'info',
      title: 'Coexistence with Microsoft 365',
      message: 'You are adding Email Wizard to work ALONGSIDE Microsoft 365. Your existing email (Outlook) will continue working normally. Email Wizard will handle marketing email sending only.'
    },
    steps: [
      {
        title: 'Understanding MX Priority (Important)',
        description: 'Microsoft 365 uses MX priority 0 (highest priority). Email Wizard uses priority 10.',
        notes: '📬 How email routing works:\n• Priority 0 (Microsoft): Receives ALL your regular emails\n• Priority 10 (Email Wizard): Backup only, used for sending\n\n✅ Your Outlook email will NOT be affected\n❌ Email Wizard will NOT receive your incoming emails\n✅ Email Wizard will ONLY send marketing campaigns',
        warning: 'DO NOT modify or delete your existing Microsoft 365 MX records. We will only ADD new records, not change existing ones.'
      },
      {
        title: 'Step 1: Access Microsoft 365 Admin Center',
        description: 'Log into your Microsoft 365 admin portal.',
        notes: '1. Go to admin.microsoft.com\n2. Sign in with your admin account\n3. Navigate to: Settings → Domains\n4. Click on your domain name\n5. Click "DNS Records" tab'
      },
      {
        title: 'Step 2: Add TXT Record (SPF)',
        description: 'Add the SPF record to authorize Email Wizard.',
        notes: '• Click "Add Record"\n• Type: TXT\n• Enter the TXT name and value from Email Wizard\n• Click "Save"\n\n⚠️ Leave your existing Microsoft SPF record unchanged'
      },
      {
        title: 'Step 3: Add CNAME Records (DKIM)',
        description: 'Add DKIM authentication records.',
        notes: '• Click "Add Record" again\n• Type: CNAME\n• Add both DKIM records shown below\n• Click "Save" for each'
      },
      {
        title: 'Step 4: Verify (Do NOT Add MX)',
        description: 'Email Wizard will verify your setup. Do not add MX records.',
        warning: '⚠️ IMPORTANT: Skip any MX record instructions. Only add SPF and DKIM records. Your Microsoft 365 MX records (priority 0) should remain unchanged.',
        notes: 'After adding SPF and DKIM records:\n• Wait 1-2 hours for propagation\n• Click "Verify Domain" in Email Wizard\n• Your Outlook email will continue working normally'
      }
    ],
    troubleshooting: [
      'If your existing email stops working, you accidentally modified Microsoft MX records - restore them immediately',
      'Email Wizard verification may fail on MX records - this is OK, only SPF and DKIM are required for coexistence',
      'If you see "conflicting SPF records" error, contact Email Wizard support - you may need to merge SPF records',
      'Microsoft 365 DNS changes can take up to 4 hours to propagate'
    ]
  },

  godaddy: {
    name: 'GoDaddy',
    logo: '/providers/godaddy.svg',
    difficulty: 'Easy',
    estimatedTime: '5-10 minutes',
    steps: [
      {
        title: 'Step 1: Access DNS Management',
        description: 'Navigate to your domain\'s DNS settings.',
        notes: '1. Log into GoDaddy\n2. Go to "My Products"\n3. Find your domain\n4. Click "DNS" or "Manage DNS"'
      },
      {
        title: 'Step 2: Add Records',
        description: 'Click "Add" and enter each DNS record.',
        notes: '• Click "Add" button at bottom of DNS records table\n• Select record Type\n• Enter Host (Name) and Value\n• TTL: 600 (default) or Custom: 300\n• Click "Save"'
      },
      {
        title: 'Step 3: Verify',
        description: 'Wait for propagation and verify in Email Wizard.',
        notes: 'GoDaddy DNS typically propagates within 1-2 hours. Some users report up to 24 hours. You can check status at whatsmydns.net'
      }
    ],
    troubleshooting: [
      'GoDaddy sometimes requires "@" for root domain in Host field - try both with and without @',
      'If you have GoDaddy email forwarding enabled, it may conflict with SPF - disable forwarding first',
      'Clear GoDaddy\'s DNS cache: DNS Settings → More → Flush DNS'
    ]
  },

  namecheap: {
    name: 'Namecheap',
    logo: '/providers/namecheap.svg',
    difficulty: 'Easy',
    estimatedTime: '5 minutes',
    steps: [
      {
        title: 'Step 1: Access Advanced DNS',
        description: 'Go to your domain\'s DNS settings.',
        notes: '1. Log into Namecheap\n2. Go to Domain List\n3. Click "Manage" next to your domain\n4. Click "Advanced DNS" tab'
      },
      {
        title: 'Step 2: Add Records',
        description: 'Click "Add New Record" and enter details.',
        notes: '• Click "+ Add New Record"\n• Select Type (TXT or CNAME)\n• Enter Host and Value\n• TTL: Automatic\n• Click green checkmark to save'
      },
      {
        title: 'Step 3: Verify',
        description: 'Namecheap DNS updates within 30 minutes.',
        notes: 'Namecheap is usually very fast (30 minutes to 2 hours). Verify in Email Wizard after 1 hour.'
      }
    ],
    troubleshooting: [
      'Namecheap uses "@" for root domain and "*" for wildcard - check their documentation',
      'If using Namecheap email, add Email Wizard records without removing existing email records',
      'Verification failing? Check for trailing dots in record values (remove them)'
    ]
  }
};