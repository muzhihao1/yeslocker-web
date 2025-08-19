/**
 * Reminder Model - 提醒事项实体
 * Manages administrative reminders and notices
 */

import { Model } from 'objection';
import { BaseModel } from './BaseModel';

export class Reminder extends BaseModel {
  static tableName = 'reminders';

  // Reminder properties
  title!: string;
  content?: string;
  type!: 'general' | 'maintenance' | 'urgent';
  isActive!: boolean;

  /**
   * JSON Schema for validation
   */
  static get jsonSchema() {
    return {
      type: 'object',
      required: ['title'],
      properties: {
        ...this.commonJsonSchema.properties,
        title: { type: 'string', minLength: 1, maxLength: 200 },
        content: { type: ['string', 'null'], maxLength: 2000 },
        type: { 
          type: 'string', 
          enum: ['general', 'maintenance', 'urgent'], 
          default: 'general' 
        },
        isActive: { type: 'boolean', default: true }
      }
    };
  }

  /**
   * Reminder-specific query modifiers
   */
  static get modifiers() {
    return {
      ...super.modifiers,
      
      active(builder: any) {
        builder.where('is_active', true);
      },

      inactive(builder: any) {
        builder.where('is_active', false);
      },

      byType(builder: any, type: 'general' | 'maintenance' | 'urgent') {
        builder.where('type', type);
      },

      general(builder: any) {
        builder.where('type', 'general');
      },

      maintenance(builder: any) {
        builder.where('type', 'maintenance');
      },

      urgent(builder: any) {
        builder.where('type', 'urgent');
      },

      priorityOrder(builder: any) {
        // Order by urgency: urgent -> maintenance -> general
        builder.orderByRaw(`
          CASE type 
            WHEN 'urgent' THEN 1 
            WHEN 'maintenance' THEN 2 
            WHEN 'general' THEN 3 
          END
        `).orderBy('created_at', 'desc');
      }
    };
  }

  /**
   * Override toJSON to include computed properties
   */
  toJSON() {
    const json = super.toJSON();
    
    // Add type indicators
    json.isGeneral = this.type === 'general';
    json.isMaintenance = this.type === 'maintenance';
    json.isUrgent = this.type === 'urgent';
    
    // Add priority level (for sorting/display)
    const priorityLevels = {
      urgent: 1,
      maintenance: 2,
      general: 3
    };
    json.priority = priorityLevels[this.type];
    
    // Add display properties
    const typeLabels = {
      general: '通用提醒',
      maintenance: '维护提醒',
      urgent: '紧急提醒'
    };
    json.typeLabel = typeLabels[this.type];
    
    const typeColors = {
      general: 'blue',
      maintenance: 'orange',
      urgent: 'red'
    };
    json.typeColor = typeColors[this.type];

    // Add time-based properties
    const createdDate = new Date(this.created_at);
    const now = new Date();
    const timeDiff = now.getTime() - createdDate.getTime();
    const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
    
    json.daysOld = daysDiff;
    json.isNew = daysDiff <= 1;
    json.isOld = daysDiff > 30;

    // Truncated content for previews
    if (this.content) {
      json.contentPreview = this.content.length > 100 
        ? this.content.substring(0, 97) + '...'
        : this.content;
    }

    return json;
  }

  /**
   * Instance methods
   */
  async activate(): Promise<Reminder> {
    return this.$query().patchAndFetch({
      isActive: true
    });
  }

  async deactivate(): Promise<Reminder> {
    return this.$query().patchAndFetch({
      isActive: false
    });
  }

  async updateContent(title: string, content?: string): Promise<Reminder> {
    return this.$query().patchAndFetch({
      title,
      content
    });
  }

  async changeType(type: 'general' | 'maintenance' | 'urgent'): Promise<Reminder> {
    return this.$query().patchAndFetch({
      type
    });
  }

  /**
   * Static methods for reminder management
   */
  static async getActiveReminders() {
    return this.query()
      .modify('active')
      .modify('priorityOrder');
  }

  static async getUrgentReminders() {
    return this.query()
      .modify('active')
      .modify('urgent')
      .modify('orderByNewest');
  }

  static async getMaintenanceReminders() {
    return this.query()
      .modify('active')
      .modify('maintenance')
      .modify('orderByNewest');
  }

  static async createReminder(
    title: string, 
    content?: string, 
    type: 'general' | 'maintenance' | 'urgent' = 'general'
  ): Promise<Reminder> {
    return this.query().insert({
      title,
      content,
      type,
      isActive: true
    });
  }

  static async createUrgentReminder(title: string, content?: string): Promise<Reminder> {
    return this.createReminder(title, content, 'urgent');
  }

  static async createMaintenanceReminder(title: string, content?: string): Promise<Reminder> {
    return this.createReminder(title, content, 'maintenance');
  }

  static async getReminderStats() {
    const reminders = await this.query().modify('active');
    
    const stats = {
      total: reminders.length,
      general: reminders.filter(r => r.type === 'general').length,
      maintenance: reminders.filter(r => r.type === 'maintenance').length,
      urgent: reminders.filter(r => r.type === 'urgent').length,
      new: reminders.filter(r => {
        const daysDiff = (new Date().getTime() - new Date(r.created_at).getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff <= 1;
      }).length
    };

    return stats;
  }

  static async getRecentReminders(days = 7, limit = 20) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.query()
      .modify('active')
      .where('created_at', '>=', startDate.toISOString())
      .modify('priorityOrder')
      .limit(limit);
  }

  static async cleanupOldReminders(olderThanDays = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    // Deactivate old general reminders (don't delete, just deactivate)
    const deactivatedCount = await this.query()
      .where('type', 'general')
      .where('created_at', '<', cutoffDate.toISOString())
      .patch({
        isActive: false
      });

    return {
      deactivatedCount,
      cutoffDate: cutoffDate.toISOString()
    };
  }

  static async bulkDeactivate(reminderIds: string[]) {
    return this.query()
      .whereIn('id', reminderIds)
      .patch({
        isActive: false
      });
  }

  static async bulkActivate(reminderIds: string[]) {
    return this.query()
      .whereIn('id', reminderIds)
      .patch({
        isActive: true
      });
  }

  static async searchReminders(searchTerm: string) {
    return this.query()
      .modify('active')
      .where(builder => {
        builder
          .whereILike('title', `%${searchTerm}%`)
          .orWhereILike('content', `%${searchTerm}%`);
      })
      .modify('priorityOrder');
  }

  /**
   * Admin dashboard methods
   */
  static async getAdminDashboardReminders() {
    const [urgent, maintenance, recent] = await Promise.all([
      this.getUrgentReminders(),
      this.getMaintenanceReminders(),
      this.getRecentReminders(3, 5)
    ]);

    return {
      urgent,
      maintenance,
      recent,
      stats: await this.getReminderStats()
    };
  }
}