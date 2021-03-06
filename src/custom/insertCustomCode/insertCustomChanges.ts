import {updateCustomCode} from './updateCustomCode'
import * as path from 'path'
import {CustomCodeRepository} from 'magicalstrings'
const {singularName} = require('magicalstrings').inflections

const chalk = require('chalk')

import execa = require('execa');
import {fs} from './updateCustomCodeForFile'
import {Configuration} from 'magicalstrings'

async function updateCode(
  fileName: string,
  sedString: string,
) {
  await execa('sed',
    ['-i', '-e ' + sedString, fileName],).catch((error: any) => {
    throw new Error(`${chalk.red('error inserting added code.')} Here is the error reported:\n${error}`)
  },)
}

async function updateRemovedImports(customCode: CustomCodeRepository, testDir: string) {
  const {removedCode} = customCode
  Object.keys(removedCode).map(unit => {
    const unitInfo = removedCode[unit]
    Object.keys(unitInfo).map(comp => {
      const compInfo = unitInfo[comp]
      Object.keys(compInfo).map(async location => {
        const fileName = `${testDir}/src/components/${singularName(unit)}/${comp}/index.jsx`
        const sedString = `s/^\\(\\s*\\)import ${location}/\\1\\/\\/ns__remove_import ${location}/g`
        await updateCode(fileName, sedString)
      })
    })
  })
}

export const insertCustomChanges = async (
  rootDir: string,
  addedCodeDoc: string,
  config: Configuration,
) => {
  const baseDir = path.resolve(process.cwd(), rootDir)

  const existsComponents = await fs.pathExists(addedCodeDoc)

  let customCode: CustomCodeRepository = {
    addedCode: {},
    replacedCode: {},
    removedCode: {},
  }
  if (!existsComponents) {
    try {
      await fs.writeJson(addedCodeDoc, customCode)
    } catch (error) {
      throw error
    }
    return
  }

  customCode = await fs.readJson(addedCodeDoc)
  await updateCustomCode(
    customCode, baseDir, config
  )

  if (Object.keys(customCode).length === 0) {
    // no added code to add
    return
  }

  // TODO: decide whether I want to do this
  await updateRemovedImports(customCode, rootDir)

  // await Promise.all(Object.keys(customCode.addedCode))
}
