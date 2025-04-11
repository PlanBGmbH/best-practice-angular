# PlanbAngularTemplate

This repository contains a sample project for Angular applications how we develop them at PlanB. It has the basic application, a correct setup for commit messages and down below in the `Git Configuration` section you find a sample git config for your git repository setting.

## Git Configuration

This repository contains a script called `setup:git` which add recommended settings to the `.git/config` file.
If you don't want to use GPG signing for your commits (using it is recommended), you can disable it by removing this line:

```bash
[commit]
 gpgSign = true
```
