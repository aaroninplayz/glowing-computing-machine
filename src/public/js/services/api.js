// Centralized API Service

const BASE_URL = '/api';

function getHeaders(customHeaders = {}) {
  const headers = { ...customHeaders };
  const token = localStorage.getItem('forge_jwt_token');
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function requestApi(endpoint, options = {}) {
  const url = endpoint.startsWith('/') ? endpoint : `${BASE_URL}/${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: getHeaders(options.headers || {})
  });

  let data;
  try {
    data = await response.json();
  } catch (_) {
    data = { success: false, error: 'Server returned an invalid or empty response' };
  }

  if (!response.ok) {
    let errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
    if (Array.isArray(data.details)) {
      const detailStr = data.details.map(d => `${d.path ? d.path.join('.') + ': ' : ''}${d.message}`).join(', ');
      if (detailStr) errorMsg += ` (${detailStr})`;
    }

    try {
      const { showToast } = await import('../components/toast.js');
      showToast({ title: 'API Error', message: errorMsg, type: 'error' });
    } catch (_) {}

    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export async function fetchCurrentUser() {
  return requestApi('/auth/me');
}

export async function loginUser(identifier, password) {
  return requestApi('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password })
  });
}

export async function registerUser(userData) {
  return requestApi('/auth/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
}

export async function changePassword(currentPassword, newPassword) {
  return requestApi('/auth/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword })
  });
}

export async function fetchDevSettings() {
  return requestApi('/dev/settings');
}

export async function updateDevSettings(settings) {
  return requestApi('/dev/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });
}

export async function fetchAllUsers() {
  return requestApi('/users');
}

export async function fetchUserXpHistory(userId, page = 1, limit = 20) {
  return requestApi(`/users/${userId}/xp-history?page=${page}&limit=${limit}`);
}

export async function fetchDashboardData() {
  return requestApi('/dashboard');
}

export async function fetchUserProfile(userId) {
  return requestApi(`/users/${userId}/profile`);
}

export async function fetchLeaderboard(category = 'xp', period = 'all_time', limit = 50, page = 1) {
  return requestApi(`/leaderboard?category=${category}&period=${period}&limit=${limit}&page=${page}`);
}

export async function updateUserProfile(targetUserId, profileData) {
  return requestApi(`/users/${targetUserId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profileData)
  });
}

export async function deleteUser(targetUserId) {
  return requestApi(`/users/${targetUserId}`, {
    method: 'DELETE'
  });
}

export async function fetchTasks() {
  return requestApi('/tasks');
}

export async function filterTasks(params = {}) {
  const query = new URLSearchParams();
  if (params.status) query.append('status', params.status);
  if (params.difficulty) query.append('difficulty', params.difficulty);
  if (params.task_type) query.append('task_type', params.task_type);
  if (params.assigned_to) query.append('assigned_to', params.assigned_to);
  if (params.search) query.append('search', params.search);

  const queryString = query.toString();
  return requestApi(`/tasks${queryString ? '?' + queryString : ''}`);
}

export async function fetchTaskDetails(taskId) {
  return requestApi(`/tasks/${taskId}`);
}

export async function createTask(taskData) {
  return requestApi('/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(taskData)
  });
}

export async function updateTask(taskId, taskData) {
  return requestApi(`/tasks/${taskId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(taskData)
  });
}

export async function updateTaskStatus(taskId, status) {
  return requestApi(`/tasks/${taskId}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
}

export async function deleteTask(taskId) {
  return requestApi(`/tasks/${taskId}`, {
    method: 'DELETE'
  });
}

// Subtasks API Services
export async function fetchSubtasks(taskId) {
  return requestApi(`/tasks/${taskId}/subtasks`);
}

export async function createSubtask(taskId, subtaskData) {
  return requestApi(`/tasks/${taskId}/subtasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subtaskData)
  });
}

export async function updateSubtask(taskId, subtaskId, subtaskData) {
  return requestApi(`/tasks/${taskId}/subtasks/${subtaskId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(subtaskData)
  });
}

export async function deleteSubtask(taskId, subtaskId) {
  return requestApi(`/tasks/${taskId}/subtasks/${subtaskId}`, {
    method: 'DELETE'
  });
}

export async function addSubtaskComment(taskId, subtaskId, text) {
  return requestApi(`/tasks/${taskId}/subtasks/${subtaskId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
}

export async function suggestTask({ title, description, total_points, task_type, mode, user_id }) {
  return requestApi('/tasks/suggest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description, total_points, task_type, mode, user_id })
  });
}

export async function upvoteTask(taskId) {
  return requestApi(`/tasks/${taskId}/upvote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function assignTask(taskId, { team_id, user_id, task_type, assigned_by }) {
  return requestApi(`/tasks/${taskId}/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ team_id, user_id, task_type, assigned_by })
  });
}

export async function submitTaskProof(taskId, formData) {
  return requestApi(`/tasks/${taskId}/submit`, {
    method: 'POST',
    body: formData
  });
}

export async function fetchTaskSubmissions(taskId) {
  return requestApi(`/tasks/${taskId}/submissions`);
}

export async function createTaskSubmission(taskId, payload) {
  return requestApi(`/tasks/${taskId}/submissions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function resubmitTaskSubmission(taskId, payload) {
  return requestApi(`/tasks/${taskId}/submissions/resubmit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function reviewTaskSubmission(submissionId, payload) {
  return requestApi(`/submissions/${submissionId}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function createSubmissionReview(submissionId, payload) {
  return requestApi(`/submissions/${submissionId}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function fetchSubmissionReviews(submissionId) {
  return requestApi(`/submissions/${submissionId}/reviews`);
}

export async function fetchReviewDetails(reviewId) {
  return requestApi(`/reviews/${reviewId}`);
}

export async function updateSubmissionReview(reviewId, payload) {
  return requestApi(`/reviews/${reviewId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function deleteSubmissionReview(reviewId) {
  return requestApi(`/reviews/${reviewId}`, {
    method: 'DELETE'
  });
}

export async function fetchAnnouncements(params = {}) {
  const query = new URLSearchParams();
  if (params.category) query.append('category', params.category);
  if (params.priority) query.append('priority', params.priority);
  if (params.pinnedOnly) query.append('pinnedOnly', 'true');
  const qs = query.toString() ? `?${query.toString()}` : '';
  return requestApi(`/announcements${qs}`);
}

export async function createAnnouncement(payload) {
  return requestApi('/announcements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function fetchAnnouncementDetails(id) {
  return requestApi(`/announcements/${id}`);
}

export async function markAnnouncementAsRead(id) {
  return requestApi(`/announcements/${id}/read`, {
    method: 'POST'
  });
}

export async function markAllAnnouncementsAsRead() {
  return requestApi('/announcements/read-all', {
    method: 'POST'
  });
}

export async function fetchUnreadAnnouncementsCount() {
  return requestApi('/announcements/unread-count');
}

export async function updateAnnouncement(id, payload) {
  return requestApi(`/announcements/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function deleteAnnouncement(id) {
  return requestApi(`/announcements/${id}`, {
    method: 'DELETE'
  });
}

export async function approveTask(taskId, { submission_id, reviewed_by } = {}) {
  return requestApi(`/tasks/${taskId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ submission_id, reviewed_by })
  });
}

export async function fetchTeams() {
  return requestApi('/teams');
}

export async function createTeam({ name, captain_id, member_ids, task_id, created_by }) {
  return requestApi('/teams', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, captain_id, member_ids, task_id, created_by })
  });
}

export async function overridePoints(teamId, userId, customPointShare) {
  return requestApi(`/teams/${teamId}/points/override`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, custom_point_share: customPointShare })
  });
}

export async function dissolveTeam(teamId, reason = 'MANUAL') {
  return requestApi(`/teams/${teamId}/dissolve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason })
  });
}

export async function generateRandomTeams(payload) {
  return requestApi('/teams/generate-random', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function swapTeamMembers(payload) {
  return requestApi('/teams/swap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function toggleMemberLock(payload) {
  return requestApi('/teams/members/lock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export async function renameTeam(teamId, name) {
  return requestApi(`/teams/${teamId}/rename`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
}

export async function reassignTeamTask(teamId, taskId) {
  return requestApi(`/teams/${teamId}/reassign-task`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task_id: taskId })
  });
}

export async function fetchTeamHistory(teamId = null) {
  return requestApi(teamId ? `/teams/${teamId}/history` : '/teams/history');
}

export async function fetchHallOfFame(seasonId) {
  return requestApi(seasonId ? `/hall-of-fame?seasonId=${seasonId}` : '/hall-of-fame');
}

export async function fetchSeasons() {
  return requestApi('/hall-of-fame/seasons');
}

export async function createSeason(seasonData) {
  return requestApi('/hall-of-fame/seasons', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(seasonData)
  });
}

export async function updateSeason(seasonId, fields) {
  return requestApi(`/hall-of-fame/seasons/${seasonId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields)
  });
}

export async function awardTitle(data) {
  return requestApi('/hall-of-fame/award', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

// Notification Engine API Service
export async function fetchNotifications(unreadOnly = false, category = null) {
  let url = `/notifications?unreadOnly=${unreadOnly}`;
  if (category) url += `&category=${encodeURIComponent(category)}`;
  return requestApi(url);
}

export async function fetchUnreadNotificationCount() {
  return requestApi('/notifications/count');
}

export async function fetchNotificationPreferences() {
  return requestApi('/notifications/preferences');
}

export async function updateNotificationPreferences(preferences) {
  return requestApi('/notifications/preferences', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(preferences)
  });
}

export async function markNotificationAsRead(id) {
  return requestApi(`/notifications/${id}/read`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function markAllNotificationsAsRead() {
  return requestApi('/notifications/read-all', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function triggerTestNotification(title, message, type = 'INFO') {
  return requestApi('/notifications/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, message, type })
  });
}

// Admin Panel API Services
export async function fetchAdminConfig() {
  return requestApi('/admin/config');
}

export async function updateAdminConfig(config) {
  return requestApi('/admin/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
}

export async function fetchAdminFeatures() {
  return requestApi('/admin/features');
}

export async function updateAdminFeature(key, isEnabled) {
  return requestApi(`/admin/features/${key}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ is_enabled: isEnabled })
  });
}

export async function fetchAdminUsers(role = null, limit = 50, offset = 0) {
  let url = `/admin/users?limit=${limit}&offset=${offset}`;
  if (role) url += `&role=${encodeURIComponent(role)}`;
  return requestApi(url);
}

export async function updateAdminUserStatus(userId, fields) {
  return requestApi(`/admin/users/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields)
  });
}

export async function fetchAdminAuditLog(limit = 50, offset = 0, actionType = null) {
  let url = `/admin/audit-log?limit=${limit}&offset=${offset}`;
  if (actionType) url += `&actionType=${encodeURIComponent(actionType)}`;
  return requestApi(url);
}

// Activity Logging API Service
export async function fetchGlobalActivity(params = {}) {
  const query = new URLSearchParams();
  if (params.type) query.append('type', params.type);
  if (params.user || params.userId) query.append('user', params.user || params.userId);
  if (params.startDate) query.append('startDate', params.startDate);
  if (params.endDate) query.append('endDate', params.endDate);
  if (params.limit) query.append('limit', params.limit);
  if (params.offset) query.append('offset', params.offset);

  return requestApi(`/activity?${query.toString()}`);
}

export async function fetchUserActivity(userId, params = {}) {
  const query = new URLSearchParams();
  if (params.type) query.append('type', params.type);
  if (params.startDate) query.append('startDate', params.startDate);
  if (params.endDate) query.append('endDate', params.endDate);
  if (params.limit) query.append('limit', params.limit);
  if (params.offset) query.append('offset', params.offset);

  return requestApi(`/activity/user/${userId}?${query.toString()}`);
}
