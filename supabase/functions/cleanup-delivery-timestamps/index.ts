/**
 * ============================================================================
 * CLEANUP EDGE FUNCTION: Remove Old Delivery Timestamps
 * ============================================================================
 * 
 * Purpose: Delete delivery_timestamps records older than 24 hours
 * Schedule: Run daily at 2 AM via Supabase cron job
 * 
 * Why needed:
 * - Delivery timestamps are only needed for ~24 hours max
 * - Opens after 24 hours are extremely rare
 * - Prevents table from growing indefinitely
 * - Improves query performance
 * 
 * ============================================================================
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

serve(async (req) => {
  console.log('\n' + '='.repeat(80));
  console.log('🧹 DELIVERY TIMESTAMP CLEANUP JOB');
  console.log('='.repeat(80));

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Calculate cutoff time (24 hours ago)
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const cutoffISO = cutoffTime.toISOString();
    
    console.log(`⏰ Current time: ${new Date().toISOString()}`);
    console.log(`🗑️  Deleting records older than: ${cutoffISO}`);
    
    // Count records before deletion
    const { count: beforeCount, error: countError } = await supabase
      .from('delivery_timestamps')
      .select('*', { count: 'exact', head: true })
      .lt('created_at', cutoffISO);
    
    if (countError) {
      console.error('❌ Count error:', countError.message);
    } else {
      console.log(`📊 Found ${beforeCount || 0} records to delete`);
    }
    
    // Delete old records
    const { error: deleteError, count: deletedCount } = await supabase
      .from('delivery_timestamps')
      .delete({ count: 'exact' })
      .lt('created_at', cutoffISO);
    
    if (deleteError) {
      console.error('❌ Cleanup error:', deleteError.message);
      console.error('   Error code:', deleteError.code);
      console.error('   Error details:', deleteError.details);
      
      return new Response(JSON.stringify({ 
        success: false,
        error: deleteError.message,
        timestamp: new Date().toISOString()
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Get remaining record count
    const { count: remainingCount } = await supabase
      .from('delivery_timestamps')
      .select('*', { count: 'exact', head: true });
    
    console.log(`✅ Successfully deleted ${deletedCount || 0} old records`);
    console.log(`📊 Remaining records: ${remainingCount || 0}`);
    console.log('='.repeat(80) + '\n');
    
    return new Response(JSON.stringify({ 
      success: true,
      deletedCount: deletedCount || 0,
      remainingCount: remainingCount || 0,
      cutoffTime: cutoffISO,
      timestamp: new Date().toISOString()
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error: any) {
    console.error('❌ Cleanup job failed:', error.message);
    console.error('   Stack trace:', error.stack);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});