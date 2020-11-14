const core = require('@actions/core');
const github = require('@actions/github');
const semver = require('semver');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');

dayjs.extend(utc);

try {
  const token = core.getInput('token');
  const repo = core.getInput('repo').split('/');
  const expected = core.getInput('version');
  const constraint = core.getInput('constraint');
  const days = core.getInput('max_age');
  const limit = dayjs().utc().subtract(days, 'day');
  const labels = (core.getInput('labels') || '').split(',');

  const octokit = github.getOctokit(token);

  octokit.repos.listReleases({
    owner: repo[0],
    repo: repo[1],
  }).then((releases) => {
    for (const release of releases.data) {
      const date = dayjs(release.published_at);
      if (date.isBefore(limit)) {
        console.log('skipping by date', release.id, date, limit);
        continue;
      }

      if (release.draft || release.prerelease) {
        console.log('skipping pre-release', release.id);
        continue;
      }

      const release_ver = semver.clean(release.tag_name);
      if (!semver.valid(release_ver)) {
        console.log('invalid tag', release.tag_name);
        continue;
      }

      if (constraint && !semver.satisfies(release_ver, constraint)) {
        console.log('skipping, does not satisfy constraint', release.id, release_ver, constraint);
        continue;
      }

      if (semver.gt(release_ver, expected)) {
        return release;
      }
    }
  }).then((release) => {
    if (!release) {
      return;
    }

    core.setOutput('release_url', release.url);

    octokit.issues.create({
      ...github.context.repo,
      title: `${repo[0]}/${repo[1]} ${release.tag_name}`,
      body: release.body,
      labels,
    }).then((issue) => {
      core.setOutput('issue_url', issue.data.url);
    });
  });
} catch (error) {
  core.setFailed(error.message);
}
