import { AdminModel } from '../models/Admin.js';
import { ActivityModel } from '../models/Activity.js';

export const AdminService = {
  getConfig() {
    return AdminModel.getConfig();
  },

  updateConfig(configObj, currentUser) {
    const updated = AdminModel.updateConfig(configObj);

    if (currentUser) {
      ActivityModel.create({
        userId: currentUser.id,
        action: 'SYSTEM_CONFIG_UPDATED',
        details: `Updated system configuration: ${Object.keys(configObj).join(', ')}`
      });
    }

    return updated;
  },

  getFeatures() {
    return AdminModel.getFeatures();
  },

  isFeatureEnabled(key) {
    return AdminModel.isFeatureEnabled(key);
  },

  updateFeature(key, isEnabled, currentUser) {
    const updated = AdminModel.updateFeature(key, isEnabled);

    if (currentUser) {
      ActivityModel.create({
        userId: currentUser.id,
        action: 'FEATURE_TOGGLE_CHANGED',
        details: `Feature toggle "${key}" set to ${isEnabled ? 'ENABLED' : 'DISABLED'}`
      });
    }

    return updated;
  },

  getUsers(options) {
    return AdminModel.getUsers(options);
  },

  updateUserStatus(userId, { role, is_suspended }, currentUser) {
    const updated = AdminModel.updateUserStatus(userId, { role, is_suspended });

    if (currentUser) {
      const details = [];
      if (role !== undefined) details.push(`role changed to ${role}`);
      if (is_suspended !== undefined) details.push(`status set to ${is_suspended ? 'SUSPENDED' : 'ACTIVE'}`);

      ActivityModel.create({
        userId: currentUser.id,
        action: 'USER_MANAGEMENT_ACTION',
        entityType: 'USER',
        entityId: userId,
        details: `Updated user ${userId}: ${details.join(', ')}`
      });
    }

    return updated;
  },

  getAuditLog(options) {
    return AdminModel.getAuditLog(options);
  }
};
