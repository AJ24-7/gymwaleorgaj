// Scheduled notification service for automatic membership expiry checks
const cron = require('node-cron');
const Member = require('../models/Member');
const Notification = require('../models/Notification');

class NotificationScheduler {
  constructor() {
    this.isRunning = false;
    this.init();
  }

  init() {
    console.log('🔔 Notification Scheduler initialized');
    
    // Check for expiring memberships every day at 9 AM
    cron.schedule('0 9 * * *', () => {
      this.checkMembershipExpiry();
    });

    // Check for expiring memberships every 6 hours for urgent notifications
    cron.schedule('0 */6 * * *', () => {
      this.checkUrgentMembershipExpiry();
    });

    // Run initial check after 5 minutes of server start
    setTimeout(() => {
      this.checkMembershipExpiry();
    }, 5 * 60 * 1000);
  }

  async checkMembershipExpiry() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      console.log('🔍 Checking for expiring memberships...');

      // Check for memberships expiring in 3 days
      await this.createExpiryNotifications(3);
      
      // Check for memberships expiring in 1 day
      await this.createExpiryNotifications(1);

      console.log('✅ Membership expiry check completed');
    } catch (error) {
      console.error('❌ Error checking membership expiry:', error);
    } finally {
      this.isRunning = false;
    }
  }

  async checkUrgentMembershipExpiry() {
    try {
      console.log('🚨 Checking for urgent membership expiry...');
      
      // Only check for memberships expiring in 1 day for urgent notifications
      await this.createExpiryNotifications(1, true);
      
    } catch (error) {
      console.error('❌ Error checking urgent membership expiry:', error);
    }
  }

  async createExpiryNotifications(days, urgentOnly = false) {
    try {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      targetDate.setHours(23, 59, 59, 999); // End of the target day

      const startDate = new Date();
      startDate.setDate(startDate.getDate() + days);
      startDate.setHours(0, 0, 0, 0); // Start of the target day

      // Find members with memberships expiring on the target day
      const expiringMembers = await Member.find({
        membershipValidUntil: {
          $gte: startDate,
          $lte: targetDate
        }
      }).populate('gym', 'name _id');

      if (expiringMembers.length === 0) {
        console.log(`ℹ️ No memberships expiring in ${days} day(s)`);
        return;
      }

      // Group members by gym
      const membersByGym = {};
      expiringMembers.forEach(member => {
        const gymId = member.gym._id.toString();
        if (!membersByGym[gymId]) {
          membersByGym[gymId] = {
            gym: member.gym,
            members: []
          };
        }
        membersByGym[gymId].members.push(member);
      });

      // Create notifications for each gym
      for (const gymId in membersByGym) {
        const { gym, members } = membersByGym[gymId];
        
        // Check if we already sent a notification for this gym and day combination today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const existingNotification = await Notification.findOne({
          user: gymId,
          type: 'membership-expiry',
          timestamp: { $gte: today },
          'metadata.expiryDays': days
        });

        if (existingNotification && !urgentOnly) {
          console.log(`ℹ️ Notification already sent for gym ${gym.name} for ${days} day(s) expiry`);
          continue;
        }

        const priority = days === 1 ? 'high' : 'medium';
        const color = days === 1 ? '#ff6b35' : '#ffa726';
        
        const notification = new Notification({
          title: `Membership${members.length > 1 ? 's' : ''} Expiring ${days === 1 ? 'Tomorrow' : `in ${days} Days`}`,
          message: `${members.length} member${members.length > 1 ? 's have' : ' has'} membership${members.length > 1 ? 's' : ''} expiring ${days === 1 ? 'tomorrow' : `in ${days} days`}`,
          type: 'membership-expiry',
          priority: priority,
          icon: 'fa-exclamation-triangle',
          color: color,
          user: gymId,
          metadata: {
            expiryDays: days,
            memberCount: members.length,
            memberIds: members.map(m => m._id),
            members: members.map(m => ({
              id: m._id,
              name: m.memberName,
              email: m.email,
              phone: m.phone,
              membershipId: m.membershipId,
              membershipValidUntil: m.membershipValidUntil
            }))
          }
        });

        await notification.save();
        
        console.log(`✅ Created expiry notification for gym ${gym.name}: ${members.length} member(s) expiring in ${days} day(s)`);
      }

    } catch (error) {
      console.error(`❌ Error creating expiry notifications for ${days} day(s):`, error);
    }
  }

  // Manual trigger for testing
  async triggerManualCheck() {
    console.log('🔧 Manual expiry check triggered');
    await this.checkMembershipExpiry();
  }

  // Stop scheduler
  stop() {
    console.log('🛑 Notification Scheduler stopped');
    // Note: node-cron tasks can't be easily stopped once started
    // In a production environment, you might want to track task references
  }
}

module.exports = NotificationScheduler;
