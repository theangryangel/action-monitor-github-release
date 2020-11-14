const core = require('@actions/core');
const github = require('@actions/github');
const semver = require('semver');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');

dayjs.extend(utc);

function coerce_metadata(string) {
  return string.replace("+", "-");
}

try {
  const token = core.getInput('token');
  const repo = core.getInput('repo').split('/');
  let expected = core.getInput('version');
  const constraint = core.getInput('constraint');
  const days = parseInt(core.getInput('max_age'), 10);
  const limit = dayjs().utc().subtract(days, 'days');
  const labels = (core.getInput('labels') || '').split(',');
  const coerce = core.getInput('coerce_release_label');

  if (coerce) {
    expected = coerce_metadata(expected);
  }

  const octokit = github.getOctokit(token);

  octokit.repos.listReleases({
    owner: repo[0],
    repo: repo[1],
  }).then((releases) => {
    for (const release of releases.data) {

      console.log(release.tag_name);

      const date = dayjs(release.published_at);
      if (date.isBefore(limit)) {
        console.log('skipping by date', release.tag_name, date.format(), limit.format());
        continue;
      }

      if (release.draft || release.prerelease) {
        console.log('skipping pre-release', release.tag_name);
        continue;
      }

      let release_ver = release.tag_name.replace(/^v/, "");

      if (coerce) {
        release_ver = coerce_metadata(release_ver);
      }

      if (!semver.valid(release_ver)) {
        console.log('invalid tag', release.tag_name);
        continue;
      }

      if (constraint && !semver.satisfies(release_ver, constraint)) {
        console.log('skipping, does not satisfy constraint', release.tag_name, release_ver, constraint);
        continue;
      }

      if (semver.gt(release_ver, expected)) {
        return release;
      }

      console.log("skipped", release.tag_name, release_ver);
    }
  }).then((release) => {
    if (!release) {
      return;
    }

    console.log("creating release", release.tag_name);

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
