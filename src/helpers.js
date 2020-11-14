import * as core from '@actions/core';
import * as dayjs from 'dayjs';
import * as utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

function coerceMetadata(string) {
  return string.replace('+', '-');
}

function getInputs() {
  const token = core.getInput('token');

  if (!token) {
    throw 'Missing token';
  }

  const repo = (core.getInput('repo') || '') .split('/');

  if (repo.length != 2) {
    throw 'Malformed repo. Expected in the form owner/repo';
  }

  let expected = core.getInput('version');

  if (!expected) {
    throw 'No expected version provided';
  }

  const constraint = core.getInput('constraint');
  const days = parseInt(core.getInput('max_age') || "1", 10);
  const limit = dayjs().utc().subtract(days, 'days');
  const labels = (core.getInput('labels') || '').split(',');
  const coerce = core.getInput('coerce_release_label');

  if (coerce) {
    expected = coerceMetadata(expected);
  }

  return {
    token,
    repo,
    expected,
    limit,
    labels,
    coerce,
    constraint,
  };
}

export {
  getInputs,
  coerceMetadata,
  dayjs,
};
