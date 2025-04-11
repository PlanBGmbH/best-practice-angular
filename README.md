# PlanbAngularTemplate

This repository contains a sample project for Angular applications how we develop them at PlanB. It has the basic application, a correct setup for commit messages and down below in the `Git Configuration` section you find a sample git config for your git repository setting.

## Make it yours

If you starting a new project for a customer based on this project please run these commands:

1. Update the name of the angular project:

```bash
node scripts/update_project_name.js --project-name=YOUR_PROJECT_NAME
```

Make sure that you don't have any whitespaces in your project name.

2. Re-init the git for your needs (so that the customer does not have the history of this git repository)

```bash
npm run setup:git
```

3. Let's go and develop things!

## Git Configuration

This repository contains a script called `setup:git` which add recommended settings to the `.git/config` file.
If you don't want to use GPG signing for your commits (using it is recommended), you can disable it by removing this line:

```bash
[commit]
 gpgSign = true
```
