// Subscription service for handling newsletter subscriptions
import { connectToMongoDB } from './db/connection';
import Subscription from './db/subscriptionSchema';

/**
 * Subscribe an email to the newsletter
 * @param {string} email - The email to subscribe
 * @returns {Promise<Object>} The subscription object or error
 */
export const subscribeEmail = async (email) => {
  try {
    await connectToMongoDB();
    
    // Check if email already exists
    const existingSubscription = await Subscription.findOne({ email });
    
    if (existingSubscription) {
      // If subscription exists but is inactive, reactivate it
      if (!existingSubscription.active) {
        existingSubscription.active = true;
        existingSubscription.subscriptionDate = new Date();
        await existingSubscription.save();
        return { 
          success: true, 
          message: 'Your subscription has been reactivated', 
          subscription: existingSubscription 
        };
      }
      // If already active, return already subscribed message
      return { 
        success: false, 
        message: 'This email is already subscribed' 
      };
    }
    
    // Create new subscription
    const newSubscription = new Subscription({ email });
    await newSubscription.save();
    
    return { 
      success: true, 
      message: 'Successfully subscribed to the newsletter',
      subscription: newSubscription 
    };
  } catch (error) {
    console.error('Error subscribing email:', error);
    return { 
      success: false, 
      message: error.message || 'An error occurred while subscribing',
      error 
    };
  }
};

/**
 * Unsubscribe an email from the newsletter
 * @param {string} email - The email to unsubscribe
 * @returns {Promise<Object>} The result of the operation
 */
export const unsubscribeEmail = async (email) => {
  try {
    await connectToMongoDB();
    
    const subscription = await Subscription.findOne({ email });
    
    if (!subscription) {
      return { 
        success: false, 
        message: 'Email not found in our subscription list' 
      };
    }
    
    // Set subscription to inactive instead of deleting
    subscription.active = false;
    await subscription.save();
    
    return { 
      success: true, 
      message: 'Successfully unsubscribed from the newsletter' 
    };
  } catch (error) {
    console.error('Error unsubscribing email:', error);
    return { 
      success: false, 
      message: error.message || 'An error occurred while unsubscribing',
      error 
    };
  }
};

/**
 * Get all active subscriptions
 * @returns {Promise<Array>} List of active subscriptions
 */
export const getAllSubscriptions = async () => {
  try {
    await connectToMongoDB();
    return await Subscription.find({ active: true });
  } catch (error) {
    console.error('Error getting subscriptions:', error);
    throw error;
  }
};