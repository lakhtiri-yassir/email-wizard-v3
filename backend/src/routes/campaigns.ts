import { Router } from 'express';
import { queueEmailCampaign, getEmailQueueStats } from '../queues/emailQueue';
import { CacheService } from '../services/cacheService';
import supabase from '../config/supabase';

const router = Router();

// Send campaign (queue it)
router.post('/:campaignId/send', async (req, res) => {
  try {
    const { campaignId } = req.params;
    const userId = req.body.userId;

    // Check rate limit
    const rateLimit = await CacheService.checkRateLimit(
      `campaign:${userId}`,
      10,
      3600
    );

    if (!rateLimit.allowed) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfter: 3600,
      });
    }

    // Get campaign
    let campaign = await CacheService.getCampaign(campaignId);

    if (!campaign) {
      const { data } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();
      campaign = data;

      if (campaign) {
        await CacheService.cacheCampaign(campaignId, campaign);
      }
    }

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Get contacts
    let contacts = await CacheService.getContacts(userId);

    if (!contacts) {
      const { data } = await supabase
        .from('contacts')
        .select('id, email, first_name, last_name')
        .eq('user_id', userId)
        .eq('status', 'active');

      contacts = data || [];
      await CacheService.cacheContacts(userId, contacts);
    }

    if (contacts.length === 0) {
      return res.status(400).json({ error: 'No active contacts found' });
    }

    // Queue the email job
    const job = await queueEmailCampaign({
      campaignId,
      userId,
      recipients: contacts.map((c: any) => ({
        email: c.email,
        contactId: c.id,
        firstName: c.first_name,
        lastName: c.last_name,
      })),
      emailData: {
        subject: campaign.subject,
        fromEmail: campaign.from_email || 'hello@mailwizard.com',
        fromName: campaign.from_name || 'Mail Wizard',
        replyTo: campaign.reply_to || campaign.from_email || 'hello@mailwizard.com',
        htmlBody: campaign.content?.html || '<p>No content</p>',
      },
    });

    res.json({
      success: true,
      jobId: job.id,
      queuedRecipients: contacts.length,
      message: 'Campaign queued for sending',
    });

  } catch (error: any) {
    console.error('Campaign send error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get queue stats
router.get('/queue/stats', async (req, res) => {
  try {
    const stats = await getEmailQueueStats();
    res.json(stats);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
