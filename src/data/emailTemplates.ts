export interface EmailTemplate {
  id: string;
  name: string;
  category: 'marketing' | 'sales' | 'newsletter' | 'announcement';
  thumbnail: string;
  description: string;
  supportsPersonalization: boolean;
  htmlContent: string;
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  // ADD THESE TO THE EXISTING EMAIL_TEMPLATES ARRAY:

{
  id: 'newsletter-modern',
  name: 'Modern Newsletter',
  category: 'newsletter',
  description: 'Clean newsletter layout with article sections',
  supportsPersonalization: true,
  htmlContent: `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background-color: #57377d; color: #ffffff; padding: 40px 30px; text-align: center; }
        .content { padding: 30px; }
        .article { margin-bottom: 30px; padding-bottom: 30px; border-bottom: 1px solid #e0e0e0; }
        .article h2 { color: #333333; margin-top: 0; }
        .article p { color: #666666; line-height: 1.6; }
        .footer { background-color: #f8f8f8; padding: 20px; text-align: center; font-size: 12px; color: #999999; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>{{EDITABLE:newsletter_title}}</h1>
          <p>{{EDITABLE:newsletter_subtitle}}</p>
        </div>
        <div class="content">
          <p>Hi {{firstname}},</p>
          <p>{{EDITABLE:intro_text}}</p>
          
          <div class="article">
            <h2>{{EDITABLE:article1_title}}</h2>
            <p>{{EDITABLE:article1_content}}</p>
            <a href="#" style="color: #f3ba42;">Read more →</a>
          </div>
          
          <div class="article">
            <h2>{{EDITABLE:article2_title}}</h2>
            <p>{{EDITABLE:article2_content}}</p>
            <a href="#" style="color: #f3ba42;">Read more →</a>
          </div>
          
          <div class="article" style="border-bottom: none;">
            <h2>{{EDITABLE:article3_title}}</h2>
            <p>{{EDITABLE:article3_content}}</p>
            <a href="#" style="color: #f3ba42;">Read more →</a>
          </div>
        </div>
        <div class="footer">
          <p>You're receiving this because you subscribed to our newsletter.</p>
          <p><a href="#">Unsubscribe</a></p>
        </div>
      </div>
    </body>
    </html>
  `
},

{
  id: 'product-launch',
  name: 'Product Launch',
  category: 'announcement',
  description: 'Exciting product announcement with strong CTA',
  supportsPersonalization: false,
  htmlContent: `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .hero { background: linear-gradient(135deg, #57377d 0%, #f3ba42 100%); color: #ffffff; padding: 60px 30px; text-align: center; }
        .hero h1 { font-size: 36px; margin: 0 0 15px 0; }
        .content { padding: 40px 30px; text-align: center; }
        .cta-button { display: inline-block; background-color: #f3ba42; color: #000000; padding: 15px 40px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; }
        .features { padding: 0 30px 40px 30px; }
        .feature { margin-bottom: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="hero">
          <h1>{{EDITABLE:product_name}}</h1>
          <p style="font-size: 18px;">{{EDITABLE:tagline}}</p>
        </div>
        <div class="content">
          <h2>{{EDITABLE:announcement_heading}}</h2>
          <p>{{EDITABLE:announcement_text}}</p>
          <a href="#" class="cta-button">{{EDITABLE:cta_text}}</a>
        </div>
        <div class="features">
          <div class="feature">
            <h3>✨ {{EDITABLE:feature1_title}}</h3>
            <p>{{EDITABLE:feature1_description}}</p>
          </div>
          <div class="feature">
            <h3>🚀 {{EDITABLE:feature2_title}}</h3>
            <p>{{EDITABLE:feature2_description}}</p>
          </div>
          <div class="feature">
            <h3>💡 {{EDITABLE:feature3_title}}</h3>
            <p>{{EDITABLE:feature3_description}}</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `
},

{
  id: 'event-invitation',
  name: 'Event Invitation',
  category: 'marketing',
  description: 'Professional event invitation with RSVP',
  supportsPersonalization: true,
  htmlContent: `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 3px solid #f3ba42; }
        .header { background-color: #57377d; color: #ffffff; padding: 40px 30px; text-align: center; }
        .content { padding: 40px 30px; }
        .event-details { background-color: #f8f8f8; padding: 20px; margin: 20px 0; border-left: 4px solid #f3ba42; }
        .cta-button { display: inline-block; background-color: #f3ba42; color: #000000; padding: 15px 40px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>You're Invited!</h1>
        </div>
        <div class="content">
          <p>Hi {{firstname}},</p>
          <p>{{EDITABLE:invitation_message}}</p>
          
          <div class="event-details">
            <h2>{{EDITABLE:event_name}}</h2>
            <p><strong>📅 Date:</strong> {{EDITABLE:event_date}}</p>
            <p><strong>🕐 Time:</strong> {{EDITABLE:event_time}}</p>
            <p><strong>📍 Location:</strong> {{EDITABLE:event_location}}</p>
          </div>
          
          <p>{{EDITABLE:event_description}}</p>
          
          <div style="text-align: center;">
            <a href="#" class="cta-button">{{EDITABLE:rsvp_button_text}}</a>
          </div>
          
          <p style="font-size: 14px; color: #666666;">{{EDITABLE:additional_info}}</p>
        </div>
      </div>
    </body>
    </html>
  `
},

{
  id: 'welcome-series',
  name: 'Welcome Email',
  category: 'marketing',
  description: 'Warm welcome for new subscribers',
  supportsPersonalization: true,
  htmlContent: `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #f3ba42 0%, #57377d 100%); color: #ffffff; padding: 50px 30px; text-align: center; }
        .content { padding: 40px 30px; }
        .welcome-box { background-color: #f8f8f8; padding: 30px; text-align: center; margin: 20px 0; border-radius: 10px; }
        .cta-button { display: inline-block; background-color: #57377d; color: #ffffff; padding: 15px 40px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome, {{firstname}}! 🎉</h1>
        </div>
        <div class="content">
          <div class="welcome-box">
            <h2>{{EDITABLE:welcome_heading}}</h2>
            <p>{{EDITABLE:welcome_message}}</p>
          </div>
          
          <h3>{{EDITABLE:next_steps_heading}}</h3>
          <p>{{EDITABLE:next_steps_intro}}</p>
          
          <ul style="line-height: 2;">
            <li>{{EDITABLE:step1}}</li>
            <li>{{EDITABLE:step2}}</li>
            <li>{{EDITABLE:step3}}</li>
          </ul>
          
          <div style="text-align: center;">
            <a href="#" class="cta-button">{{EDITABLE:cta_text}}</a>
          </div>
          
          <p style="margin-top: 30px;">{{EDITABLE:closing_message}}</p>
          <p><strong>{{EDITABLE:signature}}</strong></p>
        </div>
      </div>
    </body>
    </html>
  `
},

{
  id: 'sales-follow-up',
  name: 'Sales Follow-Up',
  category: 'sales',
  description: 'Professional follow-up for sales prospects',
  supportsPersonalization: true,
  htmlContent: `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #ffffff; }
        .container { max-width: 600px; margin: 0 auto; padding: 40px 30px; }
        .highlight { background-color: #fffbea; border-left: 4px solid #f3ba42; padding: 15px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <p>Hi {{firstname}},</p>
        
        <p>{{EDITABLE:opening_line}}</p>
        
        <p>I wanted to follow up on {{EDITABLE:context}} and see if you had any questions about {{EDITABLE:topic}}.</p>
        
        <div class="highlight">
          <strong>{{EDITABLE:value_prop_heading}}</strong>
          <p>{{EDITABLE:value_prop_text}}</p>
        </div>
        
        <p>Based on your role as {{role}} at {{company}}, I think you'd especially benefit from:</p>
        
        <ul>
          <li>{{EDITABLE:benefit1}}</li>
          <li>{{EDITABLE:benefit2}}</li>
          <li>{{EDITABLE:benefit3}}</li>
        </ul>
        
        <p>{{EDITABLE:call_to_action}}</p>
        
        <p>{{EDITABLE:closing}}</p>
        
        <p>Best regards,<br>
        <strong>{{EDITABLE:sender_name}}</strong><br>
        {{EDITABLE:sender_title}}</p>
      </div>
    </body>
    </html>
  `
},
  {
    id: 'professional-announcement',
    name: 'Professional Announcement',
    category: 'announcement',
    thumbnail: 'https://images.pexels.com/photos/6954174/pexels-photo-6954174.jpeg?auto=compress&cs=tinysrgb&w=400',
    description: 'Clean, professional template for company announcements and updates',
    supportsPersonalization: false,
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: #000000; padding: 40px 30px; text-align: center; }
    .logo { color: #f3ba42; font-size: 28px; font-weight: bold; }
    .content { padding: 40px 30px; }
    .heading { font-size: 32px; font-weight: bold; color: #000000; margin: 0 0 20px 0; }
    .body-text { font-size: 16px; line-height: 1.6; color: #333333; margin: 0 0 20px 0; }
    .button { display: inline-block; background: #f3ba42; color: #000000; text-decoration: none; padding: 14px 32px; border-radius: 50px; font-weight: 600; margin: 20px 0; }
    .footer { background: #f5f5f5; padding: 30px; text-align: center; font-size: 14px; color: #666666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">{{COMPANY_NAME}}</div>
    </div>
    <div class="content">
      <h1 class="heading">{{EDITABLE:heading}}</h1>
      <p class="body-text">{{EDITABLE:body}}</p>
      <a href="{{EDITABLE:cta_url}}" class="button">{{EDITABLE:cta_text}}</a>
    </div>
    <div class="footer">
      <p>© 2024 {{COMPANY_NAME}}. All rights reserved.</p>
      <p><a href="{{UNSUBSCRIBE_URL}}" style="color: #666666;">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`
  },
  {
    id: 'personal-outreach',
    name: 'Personal Outreach',
    category: 'sales',
    thumbnail: 'https://images.pexels.com/photos/6954174/pexels-photo-6954174.jpeg?auto=compress&cs=tinysrgb&w=400',
    description: 'Personalized template for one-on-one sales outreach',
    supportsPersonalization: true,
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px 30px; }
    .greeting { font-size: 18px; color: #000000; margin: 0 0 20px 0; }
    .body-text { font-size: 16px; line-height: 1.8; color: #333333; margin: 0 0 16px 0; }
    .signature { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e5e5; }
    .name { font-weight: 600; color: #000000; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #999999; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <p class="greeting">Hi {{MERGE:first_name}},</p>
    <p class="body-text">{{EDITABLE:opening}}</p>
    <p class="body-text">I noticed you're a {{MERGE:role}} at {{MERGE:company}}. {{EDITABLE:personalized_pitch}}</p>
    <p class="body-text">{{EDITABLE:call_to_action}}</p>
    <div class="signature">
      <p class="body-text">Best regards,</p>
      <p class="name">{{EDITABLE:sender_name}}</p>
      <p class="body-text" style="color: #666666;">{{EDITABLE:sender_title}}</p>
    </div>
    <div class="footer">
      <p><a href="{{UNSUBSCRIBE_URL}}" style="color: #999999;">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`
  },
  {
    id: 'newsletter-modern',
    name: 'Modern Newsletter',
    category: 'newsletter',
    thumbnail: 'https://images.pexels.com/photos/6954174/pexels-photo-6954174.jpeg?auto=compress&cs=tinysrgb&w=400',
    description: 'Contemporary newsletter design with sections for multiple articles',
    supportsPersonalization: false,
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #f3ba42 0%, #57377d 100%); padding: 40px 30px; text-align: center; }
    .logo { color: #ffffff; font-size: 28px; font-weight: bold; margin-bottom: 10px; }
    .tagline { color: #ffffff; font-size: 14px; opacity: 0.9; }
    .content { padding: 40px 30px; }
    .article { margin-bottom: 40px; padding-bottom: 40px; border-bottom: 1px solid #e5e5e5; }
    .article:last-child { border-bottom: none; }
    .article-title { font-size: 24px; font-weight: bold; color: #000000; margin: 0 0 15px 0; }
    .article-text { font-size: 16px; line-height: 1.6; color: #333333; margin: 0 0 15px 0; }
    .read-more { color: #f3ba42; font-weight: 600; text-decoration: none; }
    .footer { background: #000000; padding: 30px; text-align: center; color: #ffffff; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">{{EDITABLE:newsletter_name}}</div>
      <div class="tagline">{{EDITABLE:tagline}}</div>
    </div>
    <div class="content">
      <div class="article">
        <h2 class="article-title">{{EDITABLE:article1_title}}</h2>
        <p class="article-text">{{EDITABLE:article1_text}}</p>
        <a href="{{EDITABLE:article1_url}}" class="read-more">Read more →</a>
      </div>
      <div class="article">
        <h2 class="article-title">{{EDITABLE:article2_title}}</h2>
        <p class="article-text">{{EDITABLE:article2_text}}</p>
        <a href="{{EDITABLE:article2_url}}" class="read-more">Read more →</a>
      </div>
      <div class="article">
        <h2 class="article-title">{{EDITABLE:article3_title}}</h2>
        <p class="article-text">{{EDITABLE:article3_text}}</p>
        <a href="{{EDITABLE:article3_url}}" class="read-more">Read more →</a>
      </div>
    </div>
    <div class="footer">
      <p>You're receiving this because you subscribed to our newsletter.</p>
      <p><a href="{{UNSUBSCRIBE_URL}}" style="color: #f3ba42;">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`
  },
  {
    id: 'product-launch',
    name: 'Product Launch',
    category: 'marketing',
    thumbnail: 'https://images.pexels.com/photos/6954174/pexels-photo-6954174.jpeg?auto=compress&cs=tinysrgb&w=400',
    description: 'Eye-catching template for product launches and feature announcements',
    supportsPersonalization: false,
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; background: #000000; }
    .hero { padding: 60px 30px; text-align: center; background: linear-gradient(180deg, #57377d 0%, #000000 100%); }
    .badge { display: inline-block; background: #f3ba42; color: #000000; padding: 8px 16px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-bottom: 20px; }
    .hero-title { font-size: 42px; font-weight: bold; color: #ffffff; margin: 0 0 20px 0; line-height: 1.2; }
    .hero-text { font-size: 18px; color: #ffffff; opacity: 0.9; margin: 0 0 30px 0; }
    .button { display: inline-block; background: #f3ba42; color: #000000; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-weight: bold; font-size: 16px; }
    .features { background: #ffffff; padding: 50px 30px; }
    .feature { margin-bottom: 30px; }
    .feature-title { font-size: 20px; font-weight: bold; color: #000000; margin: 0 0 10px 0; }
    .feature-text { font-size: 16px; line-height: 1.6; color: #666666; margin: 0; }
    .footer { padding: 30px; text-align: center; color: #999999; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="hero">
      <div class="badge">{{EDITABLE:badge_text}}</div>
      <h1 class="hero-title">{{EDITABLE:product_name}}</h1>
      <p class="hero-text">{{EDITABLE:tagline}}</p>
      <a href="{{EDITABLE:cta_url}}" class="button">{{EDITABLE:cta_text}}</a>
    </div>
    <div class="features">
      <div class="feature">
        <h3 class="feature-title">{{EDITABLE:feature1_title}}</h3>
        <p class="feature-text">{{EDITABLE:feature1_description}}</p>
      </div>
      <div class="feature">
        <h3 class="feature-title">{{EDITABLE:feature2_title}}</h3>
        <p class="feature-text">{{EDITABLE:feature2_description}}</p>
      </div>
      <div class="feature">
        <h3 class="feature-title">{{EDITABLE:feature3_title}}</h3>
        <p class="feature-text">{{EDITABLE:feature3_description}}</p>
      </div>
    </div>
    <div class="footer">
      <p><a href="{{UNSUBSCRIBE_URL}}" style="color: #999999;">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`
  },
  {
    id: 'event-invitation',
    name: 'Event Invitation',
    category: 'marketing',
    thumbnail: 'https://images.pexels.com/photos/6954174/pexels-photo-6954174.jpeg?auto=compress&cs=tinysrgb&w=400',
    description: 'Elegant invitation template for events, webinars, and gatherings',
    supportsPersonalization: true,
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: #f3ba42; padding: 50px 30px; text-align: center; }
    .event-type { font-size: 14px; font-weight: bold; color: #000000; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 15px; }
    .event-title { font-size: 36px; font-weight: bold; color: #000000; margin: 0; }
    .content { padding: 40px 30px; }
    .greeting { font-size: 18px; color: #000000; margin: 0 0 20px 0; }
    .body-text { font-size: 16px; line-height: 1.6; color: #333333; margin: 0 0 20px 0; }
    .details-box { background: #f9f9f9; border: 2px solid #000000; border-radius: 10px; padding: 30px; margin: 30px 0; }
    .detail-row { display: flex; margin-bottom: 15px; }
    .detail-label { font-weight: bold; min-width: 80px; }
    .button { display: inline-block; background: #57377d; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-weight: bold; margin: 20px 0; }
    .footer { background: #f5f5f5; padding: 30px; text-align: center; font-size: 14px; color: #666666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="event-type">{{EDITABLE:event_type}}</div>
      <h1 class="event-title">{{EDITABLE:event_title}}</h1>
    </div>
    <div class="content">
      <p class="greeting">Hi {{MERGE:first_name}},</p>
      <p class="body-text">{{EDITABLE:invitation_message}}</p>
      <div class="details-box">
        <div class="detail-row">
          <span class="detail-label">Date:</span>
          <span>{{EDITABLE:event_date}}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Time:</span>
          <span>{{EDITABLE:event_time}}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Location:</span>
          <span>{{EDITABLE:event_location}}</span>
        </div>
      </div>
      <center>
        <a href="{{EDITABLE:rsvp_url}}" class="button">{{EDITABLE:rsvp_text}}</a>
      </center>
      <p class="body-text">{{EDITABLE:closing_message}}</p>
    </div>
    <div class="footer">
      <p><a href="{{UNSUBSCRIBE_URL}}" style="color: #666666;">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`
  },
  {
    id: 'simple-text',
    name: 'Simple Text Email',
    category: 'sales',
    thumbnail: 'https://images.pexels.com/photos/6954174/pexels-photo-6954174.jpeg?auto=compress&cs=tinysrgb&w=400',
    description: 'Plain text style for personal, authentic communication',
    supportsPersonalization: true,
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: 'Courier New', monospace; background: #ffffff; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 30px; }
    .text { font-size: 16px; line-height: 1.8; color: #000000; white-space: pre-wrap; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #999999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="text">Hi {{MERGE:first_name}},

{{EDITABLE:paragraph1}}

{{EDITABLE:paragraph2}}

{{EDITABLE:paragraph3}}

Best,
{{EDITABLE:sender_name}}</div>
    <div class="footer">
      <p><a href="{{UNSUBSCRIBE_URL}}" style="color: #999999;">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`
  },
  {
    id: 'welcome-series',
    name: 'Welcome Email',
    category: 'marketing',
    thumbnail: 'https://images.pexels.com/photos/6954174/pexels-photo-6954174.jpeg?auto=compress&cs=tinysrgb&w=400',
    description: 'Warm welcome template for new subscribers or customers',
    supportsPersonalization: true,
    htmlContent: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #57377d 0%, #f3ba42 100%); padding: 60px 30px; text-align: center; }
    .welcome { font-size: 48px; font-weight: bold; color: #ffffff; margin: 0 0 10px 0; }
    .subtitle { font-size: 20px; color: #ffffff; opacity: 0.95; margin: 0; }
    .content { padding: 50px 30px; }
    .greeting { font-size: 20px; color: #000000; margin: 0 0 25px 0; }
    .body-text { font-size: 16px; line-height: 1.8; color: #333333; margin: 0 0 20px 0; }
    .steps { margin: 30px 0; }
    .step { display: flex; align-items: start; margin-bottom: 25px; }
    .step-number { background: #f3ba42; color: #000000; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; flex-shrink: 0; margin-right: 20px; }
    .step-content h3 { margin: 0 0 8px 0; font-size: 18px; }
    .step-content p { margin: 0; color: #666666; }
    .button { display: inline-block; background: #57377d; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 50px; font-weight: bold; margin: 20px 0; }
    .footer { background: #f5f5f5; padding: 30px; text-align: center; font-size: 14px; color: #666666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="welcome">Welcome!</h1>
      <p class="subtitle">We're excited to have you here</p>
    </div>
    <div class="content">
      <p class="greeting">Hi {{MERGE:first_name}},</p>
      <p class="body-text">{{EDITABLE:welcome_message}}</p>
      <div class="steps">
        <div class="step">
          <div class="step-number">1</div>
          <div class="step-content">
            <h3>{{EDITABLE:step1_title}}</h3>
            <p>{{EDITABLE:step1_description}}</p>
          </div>
        </div>
        <div class="step">
          <div class="step-number">2</div>
          <div class="step-content">
            <h3>{{EDITABLE:step2_title}}</h3>
            <p>{{EDITABLE:step2_description}}</p>
          </div>
        </div>
        <div class="step">
          <div class="step-number">3</div>
          <div class="step-content">
            <h3>{{EDITABLE:step3_title}}</h3>
            <p>{{EDITABLE:step3_description}}</p>
          </div>
        </div>
      </div>
      <center>
        <a href="{{EDITABLE:cta_url}}" class="button">{{EDITABLE:cta_text}}</a>
      </center>
      <p class="body-text">{{EDITABLE:closing_message}}</p>
    </div>
    <div class="footer">
      <p>Questions? Just reply to this email.</p>
      <p><a href="{{UNSUBSCRIBE_URL}}" style="color: #666666;">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`

  }
];

export function getTemplateById(id: string): EmailTemplate | undefined {
  return EMAIL_TEMPLATES.find(t => t.id === id);
}

export function getTemplatesByCategory(category: string): EmailTemplate[] {
  return EMAIL_TEMPLATES.filter(t => t.category === category);
}

export function extractEditableFields(htmlContent: string): string[] {
  const matches = htmlContent.matchAll(/\{\{EDITABLE:([^}]+)\}\}/g);
  return Array.from(matches).map(match => match[1]);
}

export function extractMergeFields(htmlContent: string): string[] {
  const matches = htmlContent.matchAll(/\{\{MERGE:([^}]+)\}\}/g);
  return Array.from(matches).map(match => match[1]);
}
