import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const HEAD = await readFile(resolve('.git/HEAD'), {
  encoding: 'utf8'
})
const refPath = HEAD.trim().slice(5)
const ref = await readFile(resolve('.git', refPath), {
  encoding: 'utf8'
})
const commitID = ref.trim()
const commitShortID = commitID.slice(0, 7)

export { commitID , commitShortID }
