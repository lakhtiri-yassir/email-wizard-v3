import { Queue } from 'bullmq';
import { defaultQueueOptions } from '../config/bullmq';

// Email job data interface
export interface EmailJobData {
  campaignId: string;
  userId: string;
  recipients: Array<{
    email: string;
    contactId: string;
    firstName?: string;
    lastName?: string;
  }>;
  emailData: {
    subject: string;
    fromEmail: string;
    fromName: string;
    replyTo: string;
    htmlBody: string;
  };
}

// Create email queue
export const emailQueue = new Queue<EmailJobData>('email-sending', {
  ...defaultQueueOptions,
  defaultJobOptions: {
    ...defaultQueueOptions.defaultJobOptions,
    priority: 1,
    limiter: {
      max: 10,
      duration: 1000,
    },
  },
});

// Add job to queue
export async function queueEmailCampaign(data: EmailJobData) {
  const job = await emailQueue.add(
    'send-campaign',
    data,
    {
      jobId: `campaign-${data.campaignId}-${Date.now()}`,
      priority: data.recipients.length > 1000 ? 2 : 1,
    }
  );

  console.log(`📬 Queued email job: ${job.id} for campaign ${data.campaignId}`);
  return job;
}

// Get queue statistics
export async function getEmailQueueStats() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    emailQueue.getWaitingCount(),
    emailQueue.getActiveCount(),
    emailQueue.getCompletedCount(),
    emailQueue.getFailedCount(),
    emailQueue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}

// Clean up old jobs
export async function cleanEmailQueue() {
  await emailQueue.clean(3600000, 100, 'completed');
  await emailQueue.clean(86400000, 500, 'failed');
  console.log('🧹 Email queue cleaned');
}

export default emailQueue;
