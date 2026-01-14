// src/hooks/useTour.ts
// UPDATED FOR YOUR DATABASE: Uses 'user_profiles' table

import { useEffect, useState } from 'react';
import { driver, Driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { tourSteps, tourConfig } from '../lib/tourConfig';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function useTour() {
  const { user } = useAuth();
  const [driverInstance, setDriverInstance] = useState<Driver | null>(null);
  const [hasCompletedTour, setHasCompletedTour] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize driver instance
  useEffect(() => {
    const driverObj = driver({
      ...tourConfig,
      onDestroyed: async () => {
        // Mark tour as completed when user finishes or closes
        if (user) {
          await markTourCompleted();
        }
      }
    });

    setDriverInstance(driverObj);

    return () => {
      driverObj.destroy();
    };
  }, []);

  // Check if user has completed tour
  useEffect(() => {
    async function checkTourStatus() {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_profiles')  // Your actual table name
          .select('has_completed_tour')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        setHasCompletedTour(data?.has_completed_tour ?? false);
      } catch (error) {
        console.error('Error checking tour status:', error);
        setHasCompletedTour(true); // Default to true on error
      } finally {
        setIsLoading(false);
      }
    }

    checkTourStatus();
  }, [user]);

  // Mark tour as completed in database
  const markTourCompleted = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_profiles')  // Your actual table name
        .update({ has_completed_tour: true })
        .eq('id', user.id);

      if (error) throw error;

      setHasCompletedTour(true);
      console.log('✓ Tour marked as completed');
    } catch (error) {
      console.error('Error marking tour as completed:', error);
    }
  };

  // Start the tour
  const startTour = () => {
    if (driverInstance) {
      driverInstance.setSteps(tourSteps);
      driverInstance.drive();
    }
  };

  return {
    startTour,
    hasCompletedTour,
    isLoading
  };
}