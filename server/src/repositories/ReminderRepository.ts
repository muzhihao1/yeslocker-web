/**
 * Reminder Repository - 提醒事项数据访问层
 * Handles all reminder-related database operations
 */

import { BaseRepository, SearchResult, PaginationOptions } from './BaseRepository';
import { Reminder } from '../models/Reminder';

export interface CreateReminderData {
  title: string;
  content?: string;
  type?: 'general' | 'maintenance' | 'urgent';
  isActive?: boolean;
}

export interface UpdateReminderData {
  title?: string;
  content?: string;
  type?: 'general' | 'maintenance' | 'urgent';
  isActive?: boolean;
}

export interface ReminderSearchFilters {
  title?: string;
  content?: string;
  type?: 'general' | 'maintenance' | 'urgent';
  isActive?: boolean;
  dateFrom?: string;
  dateTo?: string;
}

export class ReminderRepository extends BaseRepository<Reminder> {
  constructor() {
    super(Reminder);
  }

  /**
   * Create new reminder
   */
  async createReminder(reminderData: CreateReminderData): Promise<Reminder | null> {
    try {
      return await this.create({
        ...reminderData,
        isActive: reminderData.isActive !== false // Default to true
      });
    } catch (error) {
      this.handleError('createReminder', error, reminderData);
      return null;
    }
  }

  /**
   * Create urgent reminder (shortcut method)
   */
  async createUrgentReminder(title: string, content?: string): Promise<Reminder | null> {
    try {
      return await this.createReminder({
        title,
        content,
        type: 'urgent',
        isActive: true
      });
    } catch (error) {
      this.handleError('createUrgentReminder', error, { title, content });
      return null;
    }
  }

  /**
   * Create maintenance reminder (shortcut method)
   */
  async createMaintenanceReminder(title: string, content?: string): Promise<Reminder | null> {
    try {
      return await this.createReminder({
        title,
        content,
        type: 'maintenance',
        isActive: true
      });
    } catch (error) {
      this.handleError('createMaintenanceReminder', error, { title, content });
      return null;
    }
  }

  /**
   * Get all active reminders
   */
  async getActiveReminders(): Promise<Reminder[]> {
    try {
      return await this.findWhere({ isActive: true }, {
        sort: { field: 'created_at', direction: 'desc' }
      });
    } catch (error) {
      this.handleError('getActiveReminders', error);
      return [];
    }
  }

  /**
   * Get reminders by type
   */
  async getRemindersByType(type: 'general' | 'maintenance' | 'urgent', activeOnly = true): Promise<Reminder[]> {
    try {
      const conditions: any = { type };
      
      if (activeOnly) {
        conditions.isActive = true;
      }

      return await this.findWhere(conditions, {
        sort: { field: 'created_at', direction: 'desc' }
      });
    } catch (error) {
      this.handleError('getRemindersByType', error, { type, activeOnly });
      return [];
    }
  }

  /**
   * Get urgent reminders
   */
  async getUrgentReminders(): Promise<Reminder[]> {
    try {
      return await this.getRemindersByType('urgent', true);
    } catch (error) {
      this.handleError('getUrgentReminders', error);
      return [];
    }
  }

  /**
   * Get maintenance reminders
   */
  async getMaintenanceReminders(): Promise<Reminder[]> {
    try {
      return await this.getRemindersByType('maintenance', true);
    } catch (error) {
      this.handleError('getMaintenanceReminders', error);
      return [];
    }
  }

  /**
   * Search reminders with filters and pagination
   */
  async searchReminders(
    filters: ReminderSearchFilters,
    pagination: PaginationOptions
  ): Promise<SearchResult<Reminder>> {
    try {
      let query = this.createQuery();

      // Apply filters
      if (filters.title) {
        query = query.whereILike('title', `%${filters.title}%`);
      }

      if (filters.content) {
        query = query.whereILike('content', `%${filters.content}%`);
      }

      if (filters.type) {
        query = query.where('type', filters.type);
      }

      if (filters.isActive !== undefined) {
        query = query.where('is_active', filters.isActive);
      }

      if (filters.dateFrom) {
        query = query.where('created_at', '>=', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.where('created_at', '<=', filters.dateTo);
      }

      // Apply pagination
      const page = pagination.page || 1;
      const pageSize = Math.min(pagination.pageSize || 20, 100);

      // Priority order: urgent -> maintenance -> general, then by date
      const result = await query
        .orderByRaw(`
          CASE type 
            WHEN 'urgent' THEN 1 
            WHEN 'maintenance' THEN 2 
            WHEN 'general' THEN 3 
          END
        `)
        .orderBy('created_at', 'desc')
        .page(page - 1, pageSize);

      return {
        data: result.results as Reminder[],
        total: result.total,
        page,
        pageSize,
        totalPages: Math.ceil(result.total / pageSize)
      };
    } catch (error) {
      this.handleError('searchReminders', error, { filters, pagination });
      return {
        data: [],
        total: 0,
        page: pagination.page || 1,
        pageSize: pagination.pageSize || 20,
        totalPages: 0
      };
    }
  }

  /**
   * Update reminder
   */
  async updateReminder(reminderId: string, updateData: UpdateReminderData): Promise<Reminder | null> {
    try {
      return await this.update(reminderId, updateData);
    } catch (error) {
      this.handleError('updateReminder', error, { reminderId, updateData });
      return null;
    }
  }

  /**
   * Activate reminder
   */
  async activateReminder(reminderId: string): Promise<Reminder | null> {
    try {
      return await this.update(reminderId, { isActive: true });
    } catch (error) {
      this.handleError('activateReminder', error, { reminderId });
      return null;
    }
  }

  /**
   * Deactivate reminder
   */
  async deactivateReminder(reminderId: string): Promise<Reminder | null> {
    try {
      return await this.update(reminderId, { isActive: false });
    } catch (error) {
      this.handleError('deactivateReminder', error, { reminderId });
      return null;
    }
  }

  /**
   * Change reminder type
   */
  async changeReminderType(reminderId: string, type: 'general' | 'maintenance' | 'urgent'): Promise<Reminder | null> {
    try {
      return await this.update(reminderId, { type });
    } catch (error) {
      this.handleError('changeReminderType', error, { reminderId, type });
      return null;
    }
  }

  /**
   * Get reminder statistics
   */
  async getReminderStats() {
    try {
      const [
        total,
        active,
        general,
        maintenance,
        urgent
      ] = await Promise.all([
        this.count(),
        this.count({ isActive: true }),
        this.count({ type: 'general', isActive: true }),
        this.count({ type: 'maintenance', isActive: true }),
        this.count({ type: 'urgent', isActive: true })
      ]);

      // Count new reminders (created in last 24 hours)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const newReminders = await this.createQuery()
        .where('created_at', '>=', yesterday.toISOString())
        .where('is_active', true)
        .resultSize();

      return {
        total,
        active,
        inactive: total - active,
        byType: {
          general,
          maintenance,
          urgent
        },
        new: newReminders
      };
    } catch (error) {
      this.handleError('getReminderStats', error);
      return {
        total: 0,
        active: 0,
        inactive: 0,
        byType: {
          general: 0,
          maintenance: 0,
          urgent: 0
        },
        new: 0
      };
    }
  }

  /**
   * Get recent reminders
   */
  async getRecentReminders(days = 7, limit = 20): Promise<Reminder[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      return await this.createQuery()
        .where('created_at', '>=', startDate.toISOString())
        .where('is_active', true)
        .orderByRaw(`
          CASE type 
            WHEN 'urgent' THEN 1 
            WHEN 'maintenance' THEN 2 
            WHEN 'general' THEN 3 
          END
        `)
        .orderBy('created_at', 'desc')
        .limit(limit) as Reminder[];
    } catch (error) {
      this.handleError('getRecentReminders', error, { days, limit });
      return [];
    }
  }

  /**
   * Search reminders by text (title and content)
   */
  async searchRemindersByText(searchTerm: string, activeOnly = true): Promise<Reminder[]> {
    try {
      let query = this.createQuery()
        .where(builder => {
          builder
            .whereILike('title', `%${searchTerm}%`)
            .orWhereILike('content', `%${searchTerm}%`);
        });

      if (activeOnly) {
        query = query.where('is_active', true);
      }

      return await query
        .orderByRaw(`
          CASE type 
            WHEN 'urgent' THEN 1 
            WHEN 'maintenance' THEN 2 
            WHEN 'general' THEN 3 
          END
        `)
        .orderBy('created_at', 'desc') as Reminder[];
    } catch (error) {
      this.handleError('searchRemindersByText', error, { searchTerm, activeOnly });
      return [];
    }
  }

  /**
   * Bulk activate reminders
   */
  async bulkActivateReminders(reminderIds: string[]): Promise<number> {
    try {
      return await this.bulkUpdate(reminderIds, { isActive: true });
    } catch (error) {
      this.handleError('bulkActivateReminders', error, { reminderIds });
      return 0;
    }
  }

  /**
   * Bulk deactivate reminders
   */
  async bulkDeactivateReminders(reminderIds: string[]): Promise<number> {
    try {
      return await this.bulkUpdate(reminderIds, { isActive: false });
    } catch (error) {
      this.handleError('bulkDeactivateReminders', error, { reminderIds });
      return 0;
    }
  }

  /**
   * Bulk delete reminders
   */
  async bulkDeleteReminders(reminderIds: string[]): Promise<number> {
    try {
      const deletedCount = await this.createQuery()
        .whereIn('id', reminderIds)
        .del();

      return deletedCount;
    } catch (error) {
      this.handleError('bulkDeleteReminders', error, { reminderIds });
      return 0;
    }
  }

  /**
   * Clean up old inactive reminders
   */
  async cleanupOldReminders(olderThanDays = 90): Promise<{ deactivated: number; deleted: number }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      // Deactivate old general reminders
      const deactivatedCount = await this.createQuery()
        .where('type', 'general')
        .where('created_at', '<', cutoffDate.toISOString())
        .where('is_active', true)
        .patch({ is_active: false });

      // Delete very old inactive reminders (older than 180 days)
      const deleteCutoffDate = new Date();
      deleteCutoffDate.setDate(deleteCutoffDate.getDate() - (olderThanDays * 2));

      const deletedCount = await this.createQuery()
        .where('type', 'general')
        .where('created_at', '<', deleteCutoffDate.toISOString())
        .where('is_active', false)
        .del();

      return {
        deactivated: deactivatedCount,
        deleted: deletedCount
      };
    } catch (error) {
      this.handleError('cleanupOldReminders', error, { olderThanDays });
      return {
        deactivated: 0,
        deleted: 0
      };
    }
  }

  /**
   * Get dashboard reminders (for admin dashboard)
   */
  async getDashboardReminders() {
    try {
      const [urgent, maintenance, recent] = await Promise.all([
        this.getUrgentReminders(),
        this.getMaintenanceReminders(),
        this.getRecentReminders(3, 5)
      ]);

      const stats = await this.getReminderStats();

      return {
        urgent,
        maintenance,
        recent,
        stats
      };
    } catch (error) {
      this.handleError('getDashboardReminders', error);
      return {
        urgent: [],
        maintenance: [],
        recent: [],
        stats: {
          total: 0,
          active: 0,
          inactive: 0,
          byType: { general: 0, maintenance: 0, urgent: 0 },
          new: 0
        }
      };
    }
  }

  /**
   * Create system notification reminder
   */
  async createSystemNotification(title: string, content: string, type: 'maintenance' | 'urgent' = 'maintenance'): Promise<Reminder | null> {
    try {
      return await this.createReminder({
        title: `[System] ${title}`,
        content,
        type,
        isActive: true
      });
    } catch (error) {
      this.handleError('createSystemNotification', error, { title, content, type });
      return null;
    }
  }

  /**
   * Get reminders requiring attention (old urgent/maintenance reminders)
   */
  async getRemindersRequiringAttention(urgentDays = 7, maintenanceDays = 30) {
    try {
      const urgentCutoff = new Date();
      urgentCutoff.setDate(urgentCutoff.getDate() - urgentDays);

      const maintenanceCutoff = new Date();
      maintenanceCutoff.setDate(maintenanceCutoff.getDate() - maintenanceDays);

      const [oldUrgent, oldMaintenance] = await Promise.all([
        this.createQuery()
          .where('type', 'urgent')
          .where('is_active', true)
          .where('created_at', '<', urgentCutoff.toISOString())
          .orderBy('created_at', 'asc'),
        
        this.createQuery()
          .where('type', 'maintenance')
          .where('is_active', true)
          .where('created_at', '<', maintenanceCutoff.toISOString())
          .orderBy('created_at', 'asc')
      ]);

      return {
        oldUrgent: oldUrgent as Reminder[],
        oldMaintenance: oldMaintenance as Reminder[],
        total: (oldUrgent.length + oldMaintenance.length)
      };
    } catch (error) {
      this.handleError('getRemindersRequiringAttention', error, { urgentDays, maintenanceDays });
      return {
        oldUrgent: [],
        oldMaintenance: [],
        total: 0
      };
    }
  }

  /**
   * Export reminders for backup or reporting
   */
  async exportReminders(includeInactive = false) {
    try {
      let query = this.createQuery();

      if (!includeInactive) {
        query = query.where('is_active', true);
      }

      const reminders = await query.orderBy('created_at', 'desc') as Reminder[];

      return {
        exportDate: new Date().toISOString(),
        totalCount: reminders.length,
        reminders: reminders.map(reminder => ({
          id: reminder.id,
          title: reminder.title,
          content: reminder.content,
          type: reminder.type,
          isActive: reminder.isActive,
          createdAt: reminder.created_at,
          updatedAt: reminder.updated_at
        }))
      };
    } catch (error) {
      this.handleError('exportReminders', error, { includeInactive });
      return {
        exportDate: new Date().toISOString(),
        totalCount: 0,
        reminders: []
      };
    }
  }
}