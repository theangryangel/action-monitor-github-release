import * as core from '@actions/core';
import * as github from '@actions/github';
import * as semver from 'semver';
import * as helpers from './helpers';

async function run() {
  try {
    const inputs = helpers.getInputs();

    const octokit = github.getOctokit(inputs.token);

    const releases = await octokit.repos.listReleases({
      owner: inputs.repo[0],
      repo: inputs.repo[1],
    })

    for (const release of releases.data) {
      const date = helpers.dayjs(release.published_at);
      if (date.isBefore(inputs.limit)) {
        console.info('Skipping %s because %s is before %s', release.tag_name, date.format(), inputs.limit.format());
        continue;
      }

      if (release.draft || release.prerelease) {
        console.info('Skipping %s because it is marked as pre-release/draft', release.tag_name);
        continue;
      }

      let release_ver = release.tag_name.replace(/^v/, "");

      if (inputs.coerce) {
        release_ver = helpers.coerceMetadata(release_ver);
      }

      if (!semver.valid(release_ver)) {
        console.info('Skipping %s because it seems to be invalid semver', release.tag_name);
        continue;
      }

      if (inputs.constraint && !semver.satisfies(release_ver, inputs.constraint)) {
        console.info('Skipping %s, because %s does not satisfy the constraint %s', release.tag_name, release_ver, inputs.constraint);
        continue;
      }

      if (!semver.gt(release_ver, inputs.expected)) {
        console.info("Skipping %s, because it is less than %s", release.tag_name, release_ver, inputs.expected);
        continue;
      }

      console.info("Creating release %s", release.tag_name);
      core.setOutput('release_url', release.url);
      core.setOutput('release_id', release.id);

      const issue = await octokit.issues.create({
        ...github.context.repo,
        title: `${inputs.repo[0]}/${inputs.repo[1]} ${release.tag_name}`,
        body: release.body,
        labels: inputs.labels,
      });

      core.setOutput('issue_url', issue.data.url);
      core.setOutput('issue_id', issue.data.id);
      return release;
    }

    return undefined;
  } catch(error) {
    core.setFailed(error);
  }
}

run();
