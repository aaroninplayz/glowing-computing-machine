import { get, post, resetDatabase, TestRunnerContext } from './test_helpers.js';

export async function runTier3Tests() {
  const ctx = new TestRunnerContext('Tier 3: Cross-Feature Combinations');
  resetDatabase();

  console.log('\n--- Running Tier 3: Cross-Feature Combinations Tests (15 Cases) ---');

  await runTest(ctx, 'T3_01: Auth + Task Suggestion — Operative logs in and suggests marketplace task', async () => {
    const authRes = await post('/api/auth/login', { identifier: 'alex@forge.local', password: 'pass123' });
    ctx.assertEqual(authRes.status, 200, 'Login status 200');

    const sugRes = await post('/api/tasks/suggest', { title: 'Auth-Linked Task', description: 'Suggested by logged in operative', total_points: 35 });
    ctx.assertEqual(sugRes.status, 200, 'Suggest status 200');

    const tasksRes = await get('/api/tasks');
    const created = tasksRes.json.marketplace.find(m => m.id === sugRes.json.taskId);
    ctx.assert(created !== undefined, 'Suggested task must appear in marketplace array');
  });

  await runTest(ctx, 'T3_02: Upvoting + Leader Assignment — Upvote task and assign to squad', async () => {
    const sugRes = await post('/api/tasks/suggest', { title: 'Popular Marketplace Idea', description: 'Needs high upvotes', total_points: 45 });
    const taskId = sugRes.json.taskId;

    await post(`/api/tasks/${taskId}/upvote`);
    await post(`/api/tasks/${taskId}/upvote`);
    await post(`/api/tasks/${taskId}/upvote`);

    const assignRes = await post(`/api/tasks/${taskId}/assign`, { team_id: 't1' });
    ctx.assertEqual(assignRes.status, 200, 'Assign status 200');

    const tasksRes = await get('/api/tasks');
    const assigned = tasksRes.json.official.find(t => t.id === taskId);
    ctx.assert(assigned !== undefined, 'Assigned task moves from marketplace to official tasks list');
    ctx.assertEqual(assigned.assigned_team_id, 't1', 'Assigned team ID matches');
    ctx.assertEqual(assigned.status, 'IN_PROGRESS', 'Status updated to IN_PROGRESS');
  });

  await runTest(ctx, 'T3_03: Captain Point Tweak + Task Completion — Adjusted point share impacts Hall of Fame', async () => {
    // Set custom_point_share for u_o1 to 1.5 in t1
    await post('/api/teams/redistribute-points', { team_id: 't1', user_id: 'u_o1', custom_point_share: 1.5 });

    // Complete task1 assigned to t1 (50 PTS)
    await post('/api/tasks/task1/complete');

    // Check Hall of Fame points for u_o1: 50 * 1.5 = 75 PTS
    const hallRes = await get('/api/hall-of-fame');
    const u1 = hallRes.json.allTime.find(u => u.id === 'u_o1');
    ctx.assert(u1 !== undefined, 'u_o1 found in allTime');
    ctx.assertEqual(u1.points, 75, 'u_o1 earned 75 weighted points (50 * 1.5)');
  });

  await runTest(ctx, 'T3_04: Task Completion + Auto-Dissolution — 4-member squad completes task and auto-dissolves', async () => {
    const teamRes = await post('/api/teams', { name: 'Vanguard 4', captain_id: 'u_o1', member_ids: ['u_o1', 'u_o2', 'u_o3', 'u_o4'] });
    const teamId = teamRes.json.teamId;

    const taskRes = await post('/api/tasks/suggest', { title: 'Vanguard Sprint', description: '4 member sprint', total_points: 100 });
    const taskId = taskRes.json.taskId;

    await post(`/api/tasks/${taskId}/assign`, { team_id: teamId });
    const compRes = await post(`/api/tasks/${taskId}/complete`);
    ctx.assertEqual(compRes.json.auto_dissolved, true, '4-member squad auto-dissolves');

    const teamsRes = await get('/api/teams');
    const activeVanguard = teamsRes.json.find(t => t.id === teamId);
    ctx.assertEqual(activeVanguard, undefined, 'Vanguard 4 no longer in active teams list');
  });

  await runTest(ctx, 'T3_05: Team Dissolution + Cohort Pool Reassignment — Dissolved team members form new team', async () => {
    // Form new team with dissolved members
    const newTeamRes = await post('/api/teams', { name: 'Reformed Phoenix', captain_id: 'u_o2', member_ids: ['u_o2', 'u_o4'] });
    ctx.assertEqual(newTeamRes.status, 200, 'Create new team status 200');

    const teamsRes = await get('/api/teams');
    const phoenix = teamsRes.json.find(t => t.id === newTeamRes.json.teamId);
    ctx.assert(phoenix !== undefined, 'Reformed Phoenix team is active');
    ctx.assertEqual(phoenix.members.length, 2, 'New team has 2 members');
  });

  await runTest(ctx, 'T3_06: Stealth Dev Action + Hall Exclusion — Dev upvotes & completes task but remains invisible in rankings', async () => {
    // Dev login
    await post('/api/auth/login', { identifier: 'aaron_dev', password: 'pass123' });

    // Dev upvotes task
    await post('/api/tasks/market2/upvote');

    // Verify Hall of Fame rankings exclude u_dev
    const hallRes = await get('/api/hall-of-fame');
    const devInAllTime = hallRes.json.allTime.find(u => u.id === 'u_dev');
    ctx.assertEqual(devInAllTime, undefined, 'u_dev must not appear in Hall of Fame rankings');
  });

  await runTest(ctx, 'T3_07: Task Proof Submission + Status Transition — Submit proof and transition task to COMPLETED', async () => {
    const subRes = await post('/api/tasks/task2/submit', { submitted_by: 'u_o2', proof_notes: 'UI styles attached.' });
    ctx.assertEqual(subRes.status, 200, 'Submit proof status 200');

    const compRes = await post('/api/tasks/task2/complete');
    ctx.assertEqual(compRes.status, 200, 'Complete status 200');

    const tasksRes = await get('/api/tasks');
    const t2 = tasksRes.json.official.find(t => t.id === 'task2');
    ctx.assertEqual(t2.status, 'COMPLETED', 'Task status is COMPLETED');
  });

  await runTest(ctx, 'T3_08: Hall of Fame Title Grant + Monument Wall — Award title upon task completion and verify wall', async () => {
    await post('/api/tasks/task1/complete');
    const titleRes = await post('/api/hall-of-fame/titles', { title_name: 'Sprint Champion', category: 'Academics', awarded_to_user_id: 'u_o1' });
    ctx.assertEqual(titleRes.status, 200, 'Award title status 200');

    const hallRes = await get('/api/hall-of-fame');
    const champion = hallRes.json.titles.find(t => t.title_name === 'Sprint Champion');
    ctx.assert(champion !== undefined, 'Sprint Champion title present on wall');
    ctx.assertEqual(champion.user_name, 'Alex', 'Awarded to user name Alex');
  });

  await runTest(ctx, 'T3_09: Dynamic Point Override + Zero Point Share — 0.0 share results in 0 earned points', async () => {
    const userRes = await post('/api/users', { name: 'Zero Share User', username: 'u_zero_op', email: 'u_zero@forge.local' });
    const teamRes = await post('/api/teams', { name: 'Zero Team', captain_id: userRes.json.userId, member_ids: [userRes.json.userId] });
    const teamId = teamRes.json.teamId;

    await post('/api/teams/redistribute-points', { team_id: teamId, user_id: userRes.json.userId, custom_point_share: 0.0 });

    const taskRes = await post('/api/tasks/suggest', { title: 'Zero Share Task', description: '50 PTS Task', total_points: 50 });
    const taskId = taskRes.json.taskId;
    await post(`/api/tasks/${taskId}/assign`, { team_id: teamId });
    await post(`/api/tasks/${taskId}/complete`);

    const hallRes = await get('/api/hall-of-fame');
    const uZero = hallRes.json.allTime.find(u => u.id === userRes.json.userId);
    ctx.assertEqual(uZero ? uZero.points : 0, 0, 'Member with 0.0 custom_point_share receives 0 points');
  });

  await runTest(ctx, 'T3_10: Multiple Team Task Completions + Ranking Shifts — Dynamic point updates re-rank operatives', async () => {
    // Complete task1 for t1 (u_o1 has 1.2 share -> 60 PTS)
    await post('/api/tasks/task1/complete');

    // Create team t2 task (100 PTS) and assign to t2 (u_o2 has 1.0 share -> 100 PTS)
    const taskRes = await post('/api/tasks/suggest', { title: 'Big Task', description: '100 PTS', total_points: 100 });
    const taskId = taskRes.json.taskId;
    await post(`/api/tasks/${taskId}/assign`, { team_id: 't2' });
    await post(`/api/tasks/${taskId}/complete`);

    // Verify u_o2 (100 PTS) ranks above u_o1 (60 PTS)
    const hallRes = await get('/api/hall-of-fame');
    const topOperative = hallRes.json.allTime[0];
    ctx.assertEqual(topOperative.id, 'u_o2', 'u_o2 (100 PTS) should be #1 on leaderboard');
  });

  await runTest(ctx, 'T3_11: Flexible Login (Phone) + Task Upvote — Login via phone and upvote task', async () => {
    const authRes = await post('/api/auth/login', { identifier: '9990004444', password: 'pass123' });
    ctx.assertEqual(authRes.status, 200, 'Phone login status 200');

    const upRes = await post('/api/tasks/market1/upvote');
    ctx.assertEqual(upRes.status, 200, 'Upvote status 200');
  });

  await runTest(ctx, 'T3_12: Student Leader Rotation + Task Assignment — Leader 02 assigns task', async () => {
    const authRes = await post('/api/auth/login', { identifier: 'sarah_lead', password: 'pass123' });
    ctx.assertEqual(authRes.status, 200, 'Leader 02 login status 200');

    const sugRes = await post('/api/tasks/suggest', { title: 'Leader 2 Task', description: 'Assigned by Sarah', total_points: 25 });
    const assignRes = await post(`/api/tasks/${sugRes.json.taskId}/assign`, { team_id: 't2' });
    ctx.assertEqual(assignRes.status, 200, 'Assign status 200');
  });

  await runTest(ctx, 'T3_13: Theme Toggle + Hall of Fame Granite Styling — Verify style.css rules for theme wrapper', async () => {
    const cssRes = await get('/css/style.css');
    ctx.assertContains(cssRes.text, '.hall-of-fame-wrapper', 'style.css defines hall-of-fame-wrapper');
    ctx.assertContains(cssRes.text, '[data-theme="dark"] .hall-of-fame-wrapper', 'style.css defines dark theme hall-of-fame-wrapper override');
  });

  await runTest(ctx, 'T3_14: 4-Member Squad Onboarding + Auto-Dissolve — Create 4-member squad, complete task, verify dissolution', async () => {
    const teamRes = await post('/api/teams', { name: 'Cohort Squad 4', captain_id: 'u_o1', member_ids: ['u_o1', 'u_o2', 'u_o3', 'u_o4'] });
    const teamId = teamRes.json.teamId;

    const taskRes = await post('/api/tasks/suggest', { title: 'Cohort Challenge', description: 'Challenge for 4 members', total_points: 80 });
    const taskId = taskRes.json.taskId;

    await post(`/api/tasks/${taskId}/assign`, { team_id: teamId });
    const compRes = await post(`/api/tasks/${taskId}/complete`);
    ctx.assertEqual(compRes.json.auto_dissolved, true, '4-member team auto-dissolves upon completion');
  });

  await runTest(ctx, 'T3_15: Stealth Dev User Creation + Login — Create stealth dev, login, check mapped role', async () => {
    const newUserRes = await post('/api/users', { name: 'Shadow Dev', username: 'shadow_dev', email: 'shadow@forge.local', role: 'DEV_STEALTH' });
    ctx.assertEqual(newUserRes.status, 200, 'User creation status 200');

    const authRes = await post('/api/auth/login', { identifier: 'shadow_dev', password: 'pass123' });
    ctx.assertEqual(authRes.status, 200, 'Login status 200');
    ctx.assertEqual(authRes.json.user.public_role, 'OPERATIVE', 'Created stealth dev public_role must be OPERATIVE');
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
