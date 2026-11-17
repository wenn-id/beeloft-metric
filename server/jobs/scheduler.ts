import { publishPostToConnectedNetworks } from '../services/oauthAndSocial.js';
import { evaluateUserTrialStatus } from '../workspaceTemplate.js';
import type { EdgeEnv, PlatformRepository } from '../types.js';

export interface SchedulerRunSummary {
  checkedUsers: number;
  publishedCount: number;
  failedCount: number;
  expiredTrialsCount: number;
  executedAt: string;
}

export async function runScheduledJobs(
  repo: PlatformRepository,
  _env?: EdgeEnv
): Promise<SchedulerRunSummary> {
  const nowIso = new Date().toISOString();
  const nowMinute = nowIso.slice(0, 16); // YYYY-MM-DDTHH:mm
  const users = await repo.listUsers();

  let publishedCount = 0;
  let failedCount = 0;
  let expiredTrialsCount = 0;

  for (const summary of users) {
    const user = await repo.getUserById(summary.userId);
    if (!user || user.status !== 'ACTIVE') continue;

    let mutated = false;
    if (evaluateUserTrialStatus(user)) {
      mutated = true;
      expiredTrialsCount += 1;
    }
    for (const post of user.workspace.plannerPosts) {
      if (post.status === 'SCHEDULED' && post.scheduledAt.slice(0, 16) <= nowMinute) {
        const res = await publishPostToConnectedNetworks({
          repo,
          workspace: user.workspace,
          post
        });
        mutated = true;
        if (res.allSucceeded) {
          publishedCount += 1;
          user.workspace.notifications.unshift({
            id: `ntf-pub-${post.id}-${Date.now()}`,
            title: 'Scheduled post published',
            body: `"${post.text.slice(0, 64)}" (${res.summaryNote})`,
            category: 'update',
            createdAt: nowIso,
            read: false
          });
        } else {
          failedCount += 1;
          user.workspace.notifications.unshift({
            id: `ntf-fail-${post.id}-${Date.now()}`,
            title: 'Scheduled post failed',
            body: `"${post.text.slice(0, 64)}" failed: ${res.summaryNote}`,
            category: 'unread',
            createdAt: nowIso,
            read: false
          });
        }
      }
    }

    if (mutated) {
      user.workspace.notifications = user.workspace.notifications.slice(0, 50);
      await repo.saveUser(user);
    }
  }

  return {
    checkedUsers: users.length,
    publishedCount,
    failedCount,
    expiredTrialsCount,
    executedAt: nowIso
  };
}
