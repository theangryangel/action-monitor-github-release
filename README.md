# GitHub Release to Issue

Monitors the releases for a given repo. Ignoring drafts and pre-releases, it
compares the tag on the release to a version you provide using semver.

The first matched release that is newer is used to create issue against the
target repository.

Useful for things where dependabot does not yet understand.

## Inputs

### `token`
**Required** GitHub token

### `repo`

**Required** Monitored repo, in the form org/repo (org may be a user).

### `version`
**Required** Current version. Any release must be newer than this one. Assumed to be valid semver.

### `constraint`
Optional constraint to place on the comparison. i.e. if you are pinned to an older version.

### `max_age`
**Required** How many days to consider on the feed. If you are running this action on a schedule you want this to match the interval.

### `labels`
Optional labels to use on the created issue, comma separated.

## Outputs

### `release_url`

API URL to the release

### `issue_url`

API URL to the created issue

## Example usage

uses: actions/action-monitor-github-release@v1.0
with:
  repo: 'gravitation/teleport'
  version: '4.0.0'
  max_age: 1
  target_repo: 'your/repo'
  labels: "release,teleport"
