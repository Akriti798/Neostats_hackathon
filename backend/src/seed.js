require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Project = require('./models/Project');
const Task = require('./models/Task');
const Comment = require('./models/Comment');

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/neostats_db';
    console.log(`[Seed] Connecting to MongoDB: ${mongoUri}...`);
    await mongoose.connect(mongoUri);

    console.log('[Seed] Clearing existing collections...');
    await Promise.all([
      User.deleteMany({}),
      Project.deleteMany({}),
      Task.deleteMany({}),
      Comment.deleteMany({})
    ]);

    console.log('[Seed] Creating demo users for all 4 roles...');
    const users = await User.create([
      {
        name: 'Alex Morgan',
        email: 'admin@neostats.com',
        password: 'Admin@123',
        role: 'Admin',
        isActive: true
      },
      {
        name: 'Sarah Jenkins',
        email: 'pm@neostats.com',
        password: 'Pm@123',
        role: 'Project Manager',
        isActive: true
      },
      {
        name: 'David Chen',
        email: 'dev@neostats.com',
        password: 'Dev@123',
        role: 'Team Member',
        isActive: true
      },
      {
        name: 'Emily Watson',
        email: 'viewer@neostats.com',
        password: 'Viewer@123',
        role: 'Viewer',
        isActive: true
      }
    ]);

    const [admin, pm, dev, viewer] = users;

    console.log('[Seed] Creating sample projects...');
    const projects = await Project.create([
      {
        title: 'Core Banking API Integration',
        description: 'Secure REST API adapters connecting legacy ledger systems with high-throughput settlement rails.',
        status: 'Active',
        manager: pm._id,
        members: [
          { user: pm._id, role: 'Manager' },
          { user: dev._id, role: 'Member' },
          { user: viewer._id, role: 'Viewer' }
        ]
      },
      {
        title: 'Customer Operations Portal',
        description: 'Responsive enterprise workspace for client onboarding, compliance checks, and workflow management.',
        status: 'Active',
        manager: pm._id,
        members: [
          { user: pm._id, role: 'Manager' },
          { user: dev._id, role: 'Member' }
        ]
      },
      {
        title: 'Cloud Infrastructure Audit',
        description: 'Comprehensive evaluation of access policies, container security, and network segmentations.',
        status: 'Archived',
        manager: admin._id,
        members: [
          { user: admin._id, role: 'Manager' },
          { user: pm._id, role: 'Member' }
        ]
      }
    ]);

    const [project1, project2] = projects;

    console.log('[Seed] Creating sample tasks with version numbers...');
    const tasks = await Task.create([
      {
        project: project1._id,
        title: 'Implement JWT Authorization Middleware',
        description: 'Validate Bearer tokens, active account status, and enforce project membership on every request.',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        assignee: dev._id,
        version: 1
      },
      {
        project: project1._id,
        title: 'Handle Concurrent Updates with HTTP 409',
        description: 'Store document version and reject stale modifications with HTTP 409 Conflict.',
        status: 'TODO',
        priority: 'HIGH',
        assignee: dev._id,
        version: 1
      },
      {
        project: project1._id,
        title: 'Verify Project Archival Flow',
        description: 'Confirm that archived projects prevent task additions and enforce read-only semantics.',
        status: 'DONE',
        priority: 'MEDIUM',
        assignee: pm._id,
        version: 1
      },
      {
        project: project2._id,
        title: 'Enterprise Layout & Theme Polish',
        description: 'Clean typography, responsive tables, role-based badges, and accessible color contrast.',
        status: 'DONE',
        priority: 'LOW',
        assignee: dev._id,
        version: 1
      }
    ]);

    console.log('[Seed] Creating discussion comments...');
    await Comment.create([
      {
        task: tasks[0]._id,
        author: pm._id,
        content: 'Please verify project membership before checking task edit rights.'
      },
      {
        task: tasks[0]._id,
        author: dev._id,
        content: 'Implemented and tested. Viewer accounts are rejected with 403 Forbidden.'
      }
    ]);

    console.log('\n[Seed Success] Database populated successfully!');
    console.log('--------------------------------------------------');
    console.log('Demo Credentials for Evaluators:');
    console.log('  Admin:           admin@neostats.com  |  Admin@123');
    console.log('  Project Manager: pm@neostats.com     |  Pm@123');
    console.log('  Team Member:     dev@neostats.com    |  Dev@123');
    console.log('  Viewer:          viewer@neostats.com |  Viewer@123');
    console.log('--------------------------------------------------');

    process.exit(0);
  } catch (error) {
    console.error('[Seed Error] Failed to populate database:', error.message);
    process.exit(1);
  }
};

seedData();
