import {
  appendFileSync,
  existsSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync
} from "node:fs"
import { dirname, resolve } from "node:path"

const RELEASE_ARCHIVE_PREFIX = "anime-bt-batch-downloader-chrome-mv3"

function parseArguments(argv) {
  const argumentsMap = new Map()

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]

    if (!token.startsWith("--")) {
      continue
    }

    const value = argv[index + 1]

    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${token}`)
    }

    argumentsMap.set(token.slice(2), value)
    index += 1
  }

  return argumentsMap
}

function normalizeTagToVersion(tagName) {
  if (!/^v\d+\.\d+\.\d+$/u.test(tagName)) {
    throw new Error(`Expected a semantic version tag like v1.2.3, received ${tagName}`)
  }

  return tagName.slice(1)
}

function extractVersionNotes(changelogContent, version) {
  const normalizedLines = changelogContent.replace(/\r\n/g, "\n").split("\n")
  const heading = `## ${version}`
  const startIndex = normalizedLines.findIndex((line) => line.trim() === heading)

  if (startIndex === -1) {
    throw new Error(`Missing changelog section for version ${version}`)
  }

  let endIndex = normalizedLines.length

  for (let index = startIndex + 1; index < normalizedLines.length; index += 1) {
    if (/^##\s+/u.test(normalizedLines[index])) {
      endIndex = index
      break
    }
  }

  const notes = normalizedLines.slice(startIndex + 1, endIndex).join("\n").trim()

  if (!notes) {
    throw new Error(`Changelog section for version ${version} is empty`)
  }

  return `${notes}\n`
}

function renameArchive(archivePath, version) {
  const resolvedArchivePath = resolve(archivePath)

  if (!existsSync(resolvedArchivePath)) {
    throw new Error(`Packaged archive not found: ${resolvedArchivePath}`)
  }

  const renamedArchivePath = resolve(
    dirname(resolvedArchivePath),
    `${RELEASE_ARCHIVE_PREFIX}-v${version}.zip`
  )

  if (renamedArchivePath !== resolvedArchivePath) {
    rmSync(renamedArchivePath, { force: true })
    renameSync(resolvedArchivePath, renamedArchivePath)
  }

  return renamedArchivePath
}

function writeGitHubOutputs(outputPath, outputs) {
  const serializedOutputs = Object.entries(outputs)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n")

  appendFileSync(outputPath, `${serializedOutputs}\n`, "utf8")
}

try {
  const argumentsMap = parseArguments(process.argv.slice(2))
  const tagName = argumentsMap.get("tag")
  const archivePath = argumentsMap.get("archive")
  const changelogPath = argumentsMap.get("changelog")
  const notesOutputPath = argumentsMap.get("notes-out")
  const githubOutputPath = argumentsMap.get("github-output")

  if (!tagName || !archivePath || !changelogPath || !notesOutputPath) {
    throw new Error(
      "Expected --tag, --archive, --changelog, and --notes-out arguments"
    )
  }

  const version = normalizeTagToVersion(tagName)
  const changelogContent = readFileSync(resolve(changelogPath), "utf8")
  const notes = extractVersionNotes(changelogContent, version)
  const renamedArchivePath = renameArchive(archivePath, version)
  const resolvedNotesOutputPath = resolve(notesOutputPath)

  writeFileSync(resolvedNotesOutputPath, notes, "utf8")

  if (githubOutputPath) {
    writeGitHubOutputs(resolve(githubOutputPath), {
      asset_path: renamedArchivePath,
      notes_path: resolvedNotesOutputPath
    })
  }

  process.stdout.write(
    `Prepared release assets for ${tagName}\nasset_path=${renamedArchivePath}\nnotes_path=${resolvedNotesOutputPath}\n`
  )
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  process.stderr.write(`${message}\n`)
  process.exit(1)
}
