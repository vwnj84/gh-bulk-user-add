require('dotenv').config()
const fs = require('fs')
const program = '-- Bulk GH User Add --'
const commandLineArgs = require('command-line-args')
const commandLineUsage = require('command-line-usage')
const { Octokit } = require('@octokit/core')
const { retry } = require('@octokit/plugin-retry')
const { throttling } = require('@octokit/plugin-throttling')
const MyOctokit = Octokit.plugin(retry, throttling)
const github = new MyOctokit({
    auth: process.env.GITHUB_TOKEN,
    baseUrl: process.env.BASE_URL,
    throttle: {
        onRateLimit: (retryAfter, options) => {
            github.log.warn(
                `[${new Date().toISOString()}] ${program} Request quota exhausted for request, will retry in ${retryAfter}`
            )
            return true
        },
        onSecondaryRateLimit: (retryAfter, options) => {
            github.log.warn(
                `[${new Date().toISOString()}] ${program} Abuse detected for request, will retry in ${retryAfter}`
            )
            return true
        }
    }
})

const sections = [
    {
        header: 'Permission Management App',
        content: `NodeJS Application to add users in bulk to a repo. `
    },
    {
        header: 'Options',
        optionList: [
            {
                name: 'help',
                description: 'Display this usage guide.',
                alias: 'h',
                type: Boolean
            },
            {
                name: 'add',
                description: 'adds users to repo',
                alias: 'a',
                type: Boolean
            },
            {
                name: 'org',
                description: 'Org name',
                alias: 'o',
                type: String
            },
            {
                name: 'repo',
                description: 'To which repo to add users',
                alias: 'r',
                type: String
            },
            {
                name: 'file',
                description: 'Name of file containing acount list, one account per line',
                alias: 'f',
                type: String
            },
            {
                name: 'permission',
                description: 'Permission for users on repo - pull, push, admin, maintain, triage',
                alias: 'p',
                type: String
            }
        ]
    }
]
const usage = commandLineUsage(sections)

const optionDefinitions = [
    { name: 'help', alias: 'h', type: Boolean },
    { name: 'add', alias: 'a', type: Boolean },
    { name: 'org', alias: 'o', type: String },
    { name: 'repo', alias: 'r', type: String },
    { name: 'file', alias: 'f', type: String },
    { name: 'permission', alias: 'p', type: String }
]

const options = commandLineArgs(optionDefinitions)
console.log(JSON.stringify(options))
const valid = (options.help || (options.add && options.org && options.repo && options.file && options.permission))

if (!valid || options.help) {
    console.log(usage)
    process.exit(0)
}

const readFileLines = filename =>
  fs
    .readFileSync(filename)
    .toString('UTF8')
    .split('\n');
  
  
// Driver code
let accounts = readFileLines(options.file);
console.log(accounts)
console.log(options.repo)
let adds = []
for (let account of accounts){
    adds.push(addAccount(account))
}
(async () => {
    await Promise.all(adds)
})()

async function addAccount(accountName){
    return await github.rest.repos.addCollaborator({
        owner: options.org,
        repo: options.repo,
        username: accountName,
    //     permission: options.permission
    }).then(res => {
        console.log(`Successfully added ${accountName}`)
    }).catch(e => {
        console.log(adds[0])
        console.log(`Error adding ${accountName} to repo ${options.repo} in org ${options.org} => ${e}`)
    })

}