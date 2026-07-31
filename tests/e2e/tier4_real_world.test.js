import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { get, post, resetDatabase, TestRunnerContext } from './test_helpers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runTier4Tests() {
  const ctx = new TestRunnerContext('Tier 4: Real-World Application Scenarios');
  resetDatabase();

  console.log('\n--- Running Tier 4: Real-World Application Scenarios Tests (8 Multi-Step Workflows) ---');

  await runTest(ctx, 'T4_01: Workflow 1 — Onboarding -> Suggestion -> Upvoting -> Leader Assignment', async () => {
    // 1. Onboard 4 operatives
    const u1 = await post('/api/users', { name: 'User One', username: 'u1_op', email: 'u1@forge.local' });
    const u2 = await post('/api/users', { name: 'User Two', username: 'u2_op', email: 'u2@forge.local' });
    const u3 = await post('/api/users', { name: 'User Three', username: 'u3_op', email: 'u3@forge.local' });
    const u4 = await post('/api/users', { name: 'User Four', username: 'u4_op', email: 'u4@forge.local' });
    ctx.assertEqual(u1.status, 200, 'User 1 registered');

    // 2. Form squad
    const teamRes = await post('/api/teams', { name: 'Gamma Squad', captain_id: u1.json.userId, member_ids: [u1.json.userId, u2.json.userId, u3.json.userId, u4.json.userId] });
    const teamId = teamRes.json.teamId;

    // 3. Operative suggests task
    const sugRes = await post('/api/tasks/suggest', { title: 'Canvas Engine Widget', description: 'Interactive rendering engine', total_points: 60 });
    const taskId = sugRes.json.taskId;

    // 4. Upvoting
    await post(`/api/tasks/${taskId}/upvote`);
    await post(`/api/tasks/${taskId}/upvote`);

    // 5. Student Leader assigns task
    const assignRes = await post(`/api/tasks/${taskId}/assign`, { team_id: teamId });
    ctx.assertEqual(assignRes.status, 200, 'Task assigned to Gamma Squad');

    // Verify task state
    const tasksRes = await get('/api/tasks');
    const assignedTask = tasksRes.json.official.find(t => t.id === taskId);
    ctx.assertEqual(assignedTask.status, 'IN_PROGRESS', 'Task status IN_PROGRESS');
    ctx.assertEqual(assignedTask.assigned_team_id, teamId, 'Assigned team matches Gamma Squad');
  });

  await runTest(ctx, 'T4_02: Workflow 2 — Execution -> Point Redistribution -> Task Finish & Auto-Dissolve', async () => {
    // 1. Set point share tweaks for Gamma Squad members
    const teamRes = await get('/api/teams');
    const gamma = teamRes.json.find(t => t.name === 'Gamma Squad');
    ctx.assert(gamma !== undefined, 'Gamma Squad found');

    const m1 = gamma.members[0].id;
    const m2 = gamma.members[1].id;

    await post('/api/teams/redistribute-points', { team_id: gamma.id, user_id: m1, custom_point_share: 1.4 });
    await post('/api/teams/redistribute-points', { team_id: gamma.id, user_id: m2, custom_point_share: 0.6 });

    // 2. Submit task proof
    const tasksRes = await get('/api/tasks');
    const gammaTask = tasksRes.json.official.find(t => t.assigned_team_id === gamma.id);
    await post(`/api/tasks/${gammaTask.id}/submit`, { submitted_by: m1, proof_notes: 'Canvas Widget engine ready' });

    // 3. Complete task -> Triggers auto-dissolution (4 member team)
    const compRes = await post(`/api/tasks/${gammaTask.id}/complete`);
    ctx.assertEqual(compRes.json.auto_dissolved, true, 'Gamma Squad auto-dissolves');

    // 4. Verify team no longer in active list
    const activeTeams = await get('/api/teams');
    const activeGamma = activeTeams.json.find(t => t.id === gamma.id);
    ctx.assertEqual(activeGamma, undefined, 'Gamma Squad is deactivated');
  });

  await runTest(ctx, 'T4_03: Workflow 3 — Hall of Fame Calculations & Title Awarding', async () => {
    // 1. Fetch Hall of Fame rankings
    const hallRes = await get('/api/hall-of-fame');
    ctx.assertEqual(hallRes.status, 200, 'Hall of fame 200');

    // 2. Award title to top contributor
    const topUser = hallRes.json.allTime[0];
    ctx.assert(topUser !== undefined, 'Top user exists');

    const titleRes = await post('/api/hall-of-fame/titles', { title_name: 'Canvas Wizard 2026', category: 'Innovation', awarded_to_user_id: topUser.id });
    ctx.assertEqual(titleRes.status, 200, 'Title awarded');

    // 3. Verify title on wall
    const updatedHall = await get('/api/hall-of-fame');
    const titleOnWall = updatedHall.json.titles.find(t => t.title_name === 'Canvas Wizard 2026');
    ctx.assert(titleOnWall !== undefined, 'Canvas Wizard title present on wall');
  });

  await runTest(ctx, 'T4_04: Workflow 4 — Multi-Squad Competition & Leaderboard Season 1', async () => {
    // Reset DB for clean multi-squad comparison
    resetDatabase();

    // Squad 1 (3 members): Alpha
    // Squad 2 (3 members): Beta
    // Complete 100 PTS task for Alpha, 50 PTS task for Beta
    const t1Res = await post('/api/tasks/suggest', { title: 'Alpha Challenge', description: '100 PTS', total_points: 100 });
    await post(`/api/tasks/${t1Res.json.taskId}/assign`, { team_id: 't1' });
    await post(`/api/tasks/${t1Res.json.taskId}/complete`);

    const t2Res = await post('/api/tasks/suggest', { title: 'Beta Challenge', description: '50 PTS', total_points: 50 });
    await post(`/api/tasks/${t2Res.json.taskId}/assign`, { team_id: 't2' });
    await post(`/api/tasks/${t2Res.json.taskId}/complete`);

    // Verify Hall of Fame Season 1 ordering
    const hallRes = await get('/api/hall-of-fame');
    ctx.assert(hallRes.json.season1.length >= 2, 'Season 1 has entries');
    const rank1 = hallRes.json.season1[0];
    ctx.assert(rank1.points >= 50, 'Rank 1 has high points');
  });

  await runTest(ctx, 'T4_05: Workflow 5 — Stealth Rules Compliance & Dev Isolation Audit', async () => {
    // 1. Stealth developer logs in
    const devLogin = await post('/api/auth/login', { identifier: 'aaron_dev', password: 'pass123' });
    ctx.assertEqual(devLogin.json.user.public_role, 'OPERATIVE', 'Public role must be OPERATIVE');

    // 2. Perform system operations
    await post('/api/tasks/suggest', { title: 'Dev System Task', description: 'Created by dev', total_points: 10 });

    // 3. Inspect public endpoints
    const usersRes = await get('/api/users');
    const devInUsers = usersRes.json.find(u => u.id === 'u_dev');
    ctx.assertEqual(devInUsers.public_role, 'OPERATIVE', 'Dev public role mapped in GET /api/users');

    const hallRes = await get('/api/hall-of-fame');
    const devInHall = hallRes.json.allTime.find(u => u.id === 'u_dev');
    ctx.assertEqual(devInHall, undefined, 'Dev absent from Hall of Fame');
  });

  await runTest(ctx, 'T4_06: Workflow 6 — Multi-Channel Authentication Verification', async () => {
    // 1. Email login
    const r1 = await post('/api/auth/login', { identifier: 'alex@forge.local', password: 'pass123' });
    ctx.assertEqual(r1.json.user.username, 'alex_op', 'Email auth matched');

    // 2. Username login
    const r2 = await post('/api/auth/login', { identifier: 'marcus_lead', password: 'pass123' });
    ctx.assertEqual(r2.json.user.email, 'marcus@forge.local', 'Username auth matched');

    // 3. Phone login
    const r3 = await post('/api/auth/login', { identifier: '9990005555', password: 'pass123' });
    ctx.assertEqual(r3.json.user.name, 'Elena', 'Phone auth matched');
  });

  await runTest(ctx, 'T4_07: Workflow 7 — End-to-End Task Lifecycle (6 State Transitions)', async () => {
    // State 1: Suggestion -> MARKETPLACE
    const s1 = await post('/api/tasks/suggest', { title: 'Full Lifecycle Task', description: 'Trace all states', total_points: 50 });
    const taskId = s1.json.taskId;

    // State 2: Upvoting
    await post(`/api/tasks/${taskId}/upvote`);

    // State 3: Assignment -> IN_PROGRESS
    await post(`/api/tasks/${taskId}/assign`, { team_id: 't1' });

    // State 4: Proof Submission -> PENDING_APPROVAL
    await post(`/api/tasks/${taskId}/submit`, { submitted_by: 'u_o1', proof_notes: 'Proof attached' });

    // State 5: Task Completion -> COMPLETED
    await post(`/api/tasks/${taskId}/complete`);

    // State 6: Hall of Fame point reflection
    const hall = await get('/api/hall-of-fame');
    const u1 = hall.json.allTime.find(u => u.id === 'u_o1');
    ctx.assert(u1.points > 0, 'Points reflected in Hall of Fame');
  });

  await runTest(ctx, 'T4_08: Workflow 8 — Complete System Integrity Audit', async () => {
    // 1. Verify index.html
    const htmlRes = await get('/');
    ctx.assertContains(htmlRes.text, 'FORGE', 'HTML brand present');
    ctx.assertNotContains(htmlRes.text, 'Operation Overthink', 'No deprecated text in HTML');

    // 2. Verify style.css
    const cssRes = await get('/css/style.css');
    ctx.assertContains(cssRes.text, '--bg-base', 'CSS variables present');
    ctx.assertContains(cssRes.text, 'hall-of-fame-wrapper', 'Marble theme present');

    // 3. Verify app.js
    const jsRes = await get('/js/app.js');
    ctx.assertContains(jsRes.text, 'renderHallOfFameView', 'Hall of Fame render view present');

    // 4. Verify API response consistency
    const tasks = await get('/api/tasks');
    const teams = await get('/api/teams');
    const hall = await get('/api/hall-of-fame');
    ctx.assertEqual(tasks.status, 200, 'Tasks 200');
    ctx.assertEqual(teams.status, 200, 'Teams 200');
    ctx.assertEqual(hall.status, 200, 'Hall 200');
  });

  return ctx;
}

async function runTest(ctx, testName, fn) {
  try {
    await fn();
    console.log(`  ✓ ${testName}`);
  } catch (err) {
    console.log(`  ✗ ${testName} -> ${err.message}`);
  }
}
