import * as core from '@actions/core'
import * as exec from '@actions/exec'
import {Status} from './status-model'

/**
 * Runs various `git` subcommands in order to prepare the workspace
 * for committing and pushing refactorings and tests.
 *
 * @param status the status to be updated and saved.
 */
export async function prepare(status: Status): Promise<void> {
  core.startGroup('Prepare')
  core.info('Preparing git clone for committing and pushing tests.')

  const missing: string[] = []
  const name = core.getInput('user-name')
  if (!name) {
    missing.push(`'user-name'`)
  }
  const email = core.getInput('user-email')
  if (!email) {
    missing.push(`'user-email'`)
  }
  if (missing.length > 0) {
    throw new Error(
      `Unable to prepare git workspace due to missing configuration: ${missing.join(
        ', '
      )}`
    )
  }

  await exec.exec('git', ['remote', '--verbose'])
  await exec.exec('git', ['config', 'user.name', name])
  await exec.exec('git', ['config', 'user.email', email])
  await exec.exec('git', ['fetch', 'origin', status.ref, '--deepen', '10'])
  await exec.exec('git', ['checkout', status.sha])
  core.endGroup()
}

/**
 * Runs `git commit` to commit modified files.
 *
 * @param status the status to be updated and saved.
 */
export async function commit(status: Status, message: string): Promise<void> {
  const result = await exec.getExecOutput('git', [
    'status',
    '--untracked-files=all',
    '--porcelain'
  ])
  const charIndexOfFile = 3
  const filesToAdd = result.stdout
    .split(/\r?\n/)
    .map(file => file.substring(charIndexOfFile))
    .filter(file => !file.startsWith('.diffblue/'))
    .filter(file => !file.includes('/.diffblue/'))
    .filter(file => file !== '')
  if (filesToAdd && filesToAdd.length > 0) {
    await exec.exec('git', ['add', ...filesToAdd])
    await exec.exec('git', ['commit', '--message', message])
  }
}

/**
 * Runs `git push` to push changes up.
 *
 * @param status the status to be updated and saved.
 */
export async function push(status: Status): Promise<void> {
  await exec.exec('git', ['push', 'origin', `HEAD:${status.ref}`])
}
