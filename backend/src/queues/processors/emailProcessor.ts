import { Worker, Job } from 'bullmq';
import { EmailJobData } from '../emailQueue';
import { bullmqConnection } from '../../config/bullmq';
import axios from 'axios';
import supabase from '../../config/supabase';

const BATCH_SIZE = 1000;

// Process email sending jobs
async function processEmailJob(job: Job<EmailJobData>) {
  const { campaignId, userId, recipients, emailData } = job.data;

  console.log(`📧 Processing email job ${job.id} for campaign ${campaignId}`);
  console.log(`📊 Recipients: ${recipients.length}`);

  let totalSent = 0;
  let totalFailed = 0;
  const failedEmails: string[] = [];

  // Update campaign status to 'sending'
  await supabase
    .from('campaigns')
    .update({ status: 'sending' })
    .eq('id', campaignId);

  // Process in batches
  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);

    // Update job progress
    await job.updateProgress({
      processed: i,
      total: recipients.length,
      percentage: Math.round((i / recipients.length) * 100),
    });

    try {
      // Send batch via SendGrid
      const sendgridResponse = await sendBatchWithRetry(batch, emailData);

      if (sendgridResponse.success) {
        totalSent += batch.length;
        await logEmailEvents(campaignId, batch, 'sent');
      } else {
        totalFailed += batch.length;
        failedEmails.push(...batch.map(r => r.email));
        console.error(`❌ Batch failed:`, sendgridResponse.error);
      }

    } catch (error: any) {
      totalFailed += batch.length;
      failedEmails.push(...batch.map(r => r.email));
      console.error(`❌ Batch exception:`, error.message);
    }
  }

  // Update campaign with results
  await supabase
    .from('campaigns')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      recipients_count: totalSent,
    })
    .eq('id', campaignId);

  // Update usage metrics
  await supabase.rpc('increment_usage', {
    p_user_id: userId,
    p_month: new Date().getMonth() + 1,
    p_year: new Date().getFullYear(),
    p_emails_sent: totalSent,
  });

  console.log(`✅ Campaign ${campaignId} completed: ${totalSent} sent, ${totalFailed} failed`);

  return {
    success: true,
    sent: totalSent,
    failed: totalFailed,
    failedEmails,
  };
}

// Send batch with retry logic
async function sendBatchWithRetry(
  batch: EmailJobData['recipients'],
  emailData: EmailJobData['emailData'],
  maxRetries = 3
) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await axios.post(
        'https://api.sendgrid.com/v3/mail/send',
        {
          personalizations: batch.map(recipient => ({
            to: [{ email: recipient.email }],
            substitutions: {
              '%first_name%': recipient.firstName || '',
              '%last_name%': recipient.lastName || '',
              '%email%': recipient.email,
            },
          })),
          from: {
            email: emailData.fromEmail,
            name: emailData.fromName,
          },
          reply_to: { email: emailData.replyTo },
          subject: emailData.subject,
          content: [{ type: 'text/html', value: emailData.htmlBody }],
        },
        {
          headers: {
            'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 202) {
        return { success: true };
      }

    } catch (error: any) {
      console.error(`SendGrid attempt ${attempt + 1} failed:`, error.response?.data || error.message);

      if (attempt < maxRetries - 1) {
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  return { success: false, error: 'Max retries exceeded' };
}

// Log email events to database
async function logEmailEvents(
  campaignId: string,
  recipients: EmailJobData['recipients'],
  eventType: string
) {
  const events = recipients.map(recipient => ({
    campaign_id: campaignId,
    contact_id: recipient.contactId,
    event_type: eventType,
    timestamp: new Date().toISOString(),
  }));

  await supabase.from('email_events').insert(events);
}

// Create and start worker
export function startEmailWorker() {
  const worker = new Worker<EmailJobData>(
    'email-sending',
    processEmailJob,
    {
      connection: bullmqConnection,
      concurrency: 5,
      limiter: {
        max: 10,
        duration: 1000,
      },
    }
  );

  worker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('❌ Worker error:', err);
  });

  console.log('🚀 Email worker started with concurrency: 5');

  return worker;
}
