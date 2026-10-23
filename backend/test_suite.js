const http = require('http');

const request = (path, method = 'GET', body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (body) headers['Content-Length'] = Buffer.byteLength(postData);

    const req = http.request(
      {
        host: '127.0.0.1',
        port: 5000,
        path: `/api${path}`,
        method,
        headers
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = data;
          }
          resolve({ status: res.statusCode, body: parsed });
        });
      }
    );

    req.on('error', reject);
    if (body) req.write(postData);
    req.end();
  });
};

async function runTests() {
  console.log('=================================================================');
  console.log('       CollabWorkers Hackathon Full-Stack Verification Suite     ');
  console.log('=================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
    }
  }

  // 1. Health check
  console.log('1. Basic API Health Check:');
  const health = await request('/health');
  assert(health.status === 200 && health.body.status === 'ok', 'GET /api/health returns 200 OK');

  // 2. Authentication for all 4 roles
  console.log('\n2. Authentication Verification (All 4 Seeded Roles):');
  const roles = [
    { role: 'Admin', email: 'admin@neostats.com', pass: 'Admin@123' },
    { role: 'Project Manager', email: 'pm@neostats.com', pass: 'Pm@123' },
    { role: 'Team Member', email: 'dev@neostats.com', pass: 'Dev@123' },
    { role: 'Viewer', email: 'viewer@neostats.com', pass: 'Viewer@123' }
  ];

  const tokens = {};
  for (const r of roles) {
    const res = await request('/auth/login', 'POST', { email: r.email, password: r.pass });
    assert(
      res.status === 200 && res.body.token && res.body.user.role === r.role,
      `Login ${r.role} (${r.email}) returns JWT and role "${r.role}"`
    );
    tokens[r.role] = res.body.token;
  }

  // Wrong password
  const badLogin = await request('/auth/login', 'POST', { email: 'admin@neostats.com', password: 'WrongPassword' });
  assert(badLogin.status === 401, 'Invalid password returns 401 Unauthorized');

  // 3. Authorization Tests
  console.log('\n3. Server-Side Authorization Checks:');

  // No token
  const noToken = await request('/projects');
  assert(noToken.status === 401, 'Request without token returns 401 Unauthorized');

  // Admin users endpoint
  const adminUsers = await request('/users', 'GET', null, tokens['Admin']);
  assert(adminUsers.status === 200 && Array.isArray(adminUsers.body.data), 'Admin can access GET /api/users');

  const pmUsers = await request('/users', 'GET', null, tokens['Project Manager']);
  assert(pmUsers.status === 403, 'Project Manager blocked from /api/users with 403 Forbidden');

  const devUsers = await request('/users', 'GET', null, tokens['Team Member']);
  assert(devUsers.status === 403, 'Team Member blocked from /api/users with 403 Forbidden');

  // Projects visibility
  const adminProjects = await request('/projects', 'GET', null, tokens['Admin']);
  assert(adminProjects.status === 200 && adminProjects.body.count === 3, 'Admin sees all 3 projects');

  const coreBankingProject = adminProjects.body.data.find((p) => p.title.includes('Core Banking'));
  const cloudProject = adminProjects.body.data.find((p) => p.title.includes('Cloud Infrastructure'));

  // Team member accessing unassigned project
  const devAccessCloud = await request(`/projects/${cloudProject._id}`, 'GET', null, tokens['Team Member']);
  assert(devAccessCloud.status === 403, 'Team Member blocked from unassigned project with 403 Forbidden');

  // Viewer read-only check
  const coreTasks = await request(`/projects/${coreBankingProject._id}/tasks`, 'GET', null, tokens['Viewer']);
  assert(coreTasks.status === 200, 'Viewer can read tasks in project they belong to');

  const targetTask = coreTasks.body.data.find((t) => t.assignee && t.assignee.email === 'dev@neostats.com') || coreTasks.body.data[0];
  const assignedToPmTask = coreTasks.body.data.find((t) => !t.assignee || t.assignee.email !== 'dev@neostats.com') || coreTasks.body.data[coreTasks.body.data.length - 1];

  const viewerEdit = await request(`/tasks/${targetTask._id}`, 'PUT', { title: 'Viewer Edit', version: targetTask.version }, tokens['Viewer']);
  assert(viewerEdit.status === 403, 'Viewer blocked from updating task with 403 Forbidden');

  const viewerComment = await request(`/tasks/${targetTask._id}/comments`, 'POST', { content: 'Viewer comment' }, tokens['Viewer']);
  assert(viewerComment.status === 403, 'Viewer blocked from posting comment with 403 Forbidden');

  // Team member updating unassigned task
  const devUpdateUnassigned = await request(
    `/tasks/${assignedToPmTask._id}`,
    'PUT',
    { title: 'Dev Attempt', status: 'DONE', version: assignedToPmTask.version },
    tokens['Team Member']
  );
  assert(devUpdateUnassigned.status === 403, 'Team Member blocked from updating task not assigned to them (403)');

  // 4. Concurrent Task Updates & HTTP 409 Conflict
  console.log('\n4. Optimistic Concurrency Control (HTTP 409):');

  // Missing version check
  const noVersion = await request(
    `/tasks/${targetTask._id}`,
    'PUT',
    { title: 'Missing Version' },
    tokens['Team Member']
  );
  assert(noVersion.status === 400, 'Update without version returns 400 Bad Request');

  // Valid update with current version
  const validUpdate = await request(
    `/tasks/${targetTask._id}`,
    'PUT',
    { title: 'JWT Middleware - In Progress', status: 'IN_PROGRESS', version: targetTask.version },
    tokens['Team Member']
  );
  assert(validUpdate.status === 200 && validUpdate.body.data.version === targetTask.version + 1, `Valid update increments version to v${targetTask.version + 1}`);

  // Stale update with old version -> 409
  const staleUpdate = await request(
    `/tasks/${targetTask._id}`,
    'PUT',
    { title: 'Stale Edit', status: 'DONE', version: targetTask.version },
    tokens['Team Member']
  );
  assert(staleUpdate.status === 409 && staleUpdate.body.isConflict === true, 'Stale update correctly rejected with HTTP 409 Conflict');

  // Simultaneous concurrent updates simulation
  const currentTaskRes = await request(`/tasks/${targetTask._id}`, 'GET', null, tokens['Admin']);
  const currentVer = currentTaskRes.body.data.version;

  const [reqA, reqB] = await Promise.all([
    request(`/tasks/${targetTask._id}`, 'PUT', { title: 'Simultaneous A', status: 'DONE', version: currentVer }, tokens['Admin']),
    request(`/tasks/${targetTask._id}`, 'PUT', { title: 'Simultaneous B', status: 'IN_PROGRESS', version: currentVer }, tokens['Admin'])
  ]);

  const hasSuccess = reqA.status === 200 || reqB.status === 200;
  const hasConflict = reqA.status === 409 || reqB.status === 409;
  assert(hasSuccess && hasConflict, 'Simultaneous race condition handled: exactly one succeeds (200) and one receives 409 Conflict');

  // 5. Admin Project Deletion & Cascade Clean-up
  console.log('\n5. Project Deletion (Admin Only):');

  // Non-admin attempting to delete project
  const pmDelete = await request(`/projects/${coreBankingProject._id}`, 'DELETE', null, tokens['Project Manager']);
  assert(pmDelete.status === 403, 'Project Manager blocked from deleting project with 403 Forbidden');

  // Admin creating a temporary project then deleting it
  const tempProject = await request(
    '/projects',
    'POST',
    { title: 'Temporary Deletion Test Project', description: 'To be deleted by Admin' },
    tokens['Admin']
  );
  assert(tempProject.status === 201, 'Admin created temporary test project');

  // Add task to temp project
  const tempTask = await request(
    `/projects/${tempProject.body.data._id}/tasks`,
    'POST',
    { title: 'Task to be cascade deleted' },
    tokens['Admin']
  );
  assert(tempTask.status === 201, 'Created task in temporary project');

  // Delete project as Admin
  const adminDelete = await request(`/projects/${tempProject.body.data._id}`, 'DELETE', null, tokens['Admin']);
  assert(adminDelete.status === 200, 'Admin deleted project with 200 OK');

  // Confirm project and task are deleted
  const checkProj = await request(`/projects/${tempProject.body.data._id}`, 'GET', null, tokens['Admin']);
  assert(checkProj.status === 404, 'Deleted project returns 404 Not Found');

  const checkTask = await request(`/tasks/${tempTask.body.data._id}`, 'GET', null, tokens['Admin']);
  assert(checkTask.status === 404, 'Associated task was cascade-deleted (returns 404)');

  console.log('\n=================================================================');
  console.log(`  Tests Completed: ${passed} / ${total} assertions PASSED (${Math.round((passed / total) * 100)}%)`);
  console.log('=================================================================\n');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
