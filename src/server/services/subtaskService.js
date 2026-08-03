import { SubtaskModel } from '../models/Subtask.js';
import { TaskModel } from '../models/Task.js';
import { ActivityService } from './activity.js';

const VALID_PRIORITIES = ['low', 'medium', 'high', 'critical'];
const VALID_STATUSES = ['todo', 'in_progress', 'done'];

export const SubtaskService = {
  calculateTaskProgress(taskId) {
    const subtasks = SubtaskModel.getByTaskId(taskId);
    const total = subtasks.length;
    if (total === 0) {
      return { total: 0, completed: 0, percentage: 0 };
    }

    const completed = subtasks.filter(s => (s.status || '').toLowerCase() === 'done' || s.is_completed === 1).length;
    const percentage = Math.round((completed / total) * 100);

    return {
      total,
      completed,
      percentage
    };
  },

  validatePriority(priority) {
    if (!priority) return 'medium';
    const p = String(priority).toLowerCase();
    if (!VALID_PRIORITIES.includes(p)) {
      throw {
        status: 400,
        message: `Invalid priority level '${priority}'. Allowed priorities: ${VALID_PRIORITIES.join(', ')}`
      };
    }
    return p;
  },

  validateStatus(status) {
    if (!status) return 'todo';
    const s = String(status).toLowerCase();
    if (!VALID_STATUSES.includes(s)) {
      throw {
        status: 400,
        message: `Invalid status level '${status}'. Allowed statuses: ${VALID_STATUSES.join(', ')}`
      };
    }
    return s;
  },

  getSubtasksForTask(taskId) {
    const parentTask = TaskModel.getById(taskId);
    if (!parentTask) {
      throw { status: 404, message: 'Parent task not found' };
    }

    const subtasks = SubtaskModel.getByTaskId(taskId);
    const progress = this.calculateTaskProgress(taskId);

    return {
      subtasks,
      progress
    };
  },

  getSubtaskDetails(subtaskId) {
    const subtask = SubtaskModel.getById(subtaskId);
    if (!subtask) {
      throw { status: 404, message: 'Subtask not found' };
    }
    return subtask;
  },

  createSubtask(taskId, data, currentUser) {
    const parentTask = TaskModel.getById(taskId);
    if (!parentTask) {
      throw { status: 404, message: 'Parent task not found' };
    }

    if (!data.title || !String(data.title).trim()) {
      throw { status: 400, message: 'Subtask title is required' };
    }

    const priority = this.validatePriority(data.priority);
    const status = this.validateStatus(data.status);

    const subtaskId = `subtask_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const created = SubtaskModel.create({
      id: subtaskId,
      task_id: taskId,
      title: data.title.trim(),
      description: data.description || null,
      assigned_to: data.assigned_to || null,
      priority,
      deadline: data.deadline || null,
      status,
      created_by: currentUser ? currentUser.id : null,
      attachments: data.attachments || null,
      comments: data.comments || null
    });

    const progress = this.calculateTaskProgress(taskId);

    if (currentUser) {
      ActivityService.logTaskCreate(currentUser, {
        id: subtaskId,
        title: `Subtask: ${data.title}`,
        parent_task_id: taskId
      });
    }

    return {
      subtask: created,
      progress
    };
  },

  updateSubtask(subtaskId, data, currentUser) {
    const existing = SubtaskModel.getById(subtaskId);
    if (!existing) {
      throw { status: 404, message: 'Subtask not found' };
    }

    const updatePayload = { ...data };

    if (data.priority !== undefined) {
      updatePayload.priority = this.validatePriority(data.priority);
    }
    if (data.status !== undefined) {
      updatePayload.status = this.validateStatus(data.status);
    }

    const updated = SubtaskModel.update(subtaskId, updatePayload);
    const progress = this.calculateTaskProgress(existing.task_id);

    return {
      subtask: updated,
      progress
    };
  },

  deleteSubtask(subtaskId, currentUser) {
    const existing = SubtaskModel.getById(subtaskId);
    if (!existing) {
      throw { status: 404, message: 'Subtask not found' };
    }

    const taskId = existing.task_id;
    SubtaskModel.delete(subtaskId);
    const progress = this.calculateTaskProgress(taskId);

    return {
      success: true,
      message: 'Subtask deleted successfully',
      taskId,
      progress
    };
  },

  addComment(subtaskId, commentText, currentUser) {
    const existing = SubtaskModel.getById(subtaskId);
    if (!existing) {
      throw { status: 404, message: 'Subtask not found' };
    }

    if (!commentText || !String(commentText).trim()) {
      throw { status: 400, message: 'Comment text is required' };
    }

    const commentObj = {
      id: `comment_${Date.now()}`,
      text: commentText.trim(),
      user_id: currentUser ? currentUser.id : 'u_guest',
      user_name: currentUser ? currentUser.name : 'Guest User',
      created_at: new Date().toISOString()
    };

    const updated = SubtaskModel.addComment(subtaskId, commentObj);
    return updated;
  }
};
