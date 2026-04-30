# Tealium UI Kit

## Standards

**File Structure**
This repo utilizes [Atomic Design](https://bradfrost.com/blog/post/atomic-web-design/), thus components are categorized by atoms, molecules, organisms, templates and pages. Underneath that folder, component folders and files are named in PascalCase.

Example: **\<TableToolbar/>** component is classified as a molecule, and thus it's path would be **_src/components/molecules/TableToolbar/TableToolbar.jsx_**

The top level src has a components folder for components, and folders for shared common types used throughout the repository (hooks, css, utils, etc).

**Makeup of a component**
Each component shall have at least 3 files, contained in their own folder:

1.  Source file (*.js)
2.  Storybook stories file (*.stories.jsx)
3.  Unit test file (*.test.jsx)
4.  (optional) Styles file (*.styles.jsx) -- This allows us to separate CSS from the inline business logic.

**Code Coverage**
The repository enforces a 98% overall code coverage. Pre-commit hooks and a Jenkins pipeline tests these, along with pre-release checks.

**Other standards tools used**
Also utilized are standards tools Prettier and ESLint. Checks are done on pre-push as well as in Jenkins pipelines ensure standards are met.

**Component Generator**
A [component generator](https://tealium.atlassian.net/wiki/spaces/ENGSD/pages/1278869850/Component+Generator) was created for both VSCode and Intellij. This takes the guess work out of creating the new files and folders manually.

## How to Contribute

### --> Reference the [Contribution Guide](https://tealium.atlassian.net/wiki/spaces/ENGSD/pages/2927101149/UI+Kit+Contribution+Process+Chromatic) ###

### Commit Message

Before pushing your commit, make note that this repository uses a convention that allows us to do semantic versioning automatically. It's loosely based on the [angular commit messages convention](https://www.conventionalcommits.org/en/v1.0.0/).

**Convention**

    <type>(<scope>): <subject>
    <blank line>
    <body>
    <blank line>
    <footer>

**Accepted Commit [Type Enums](https://github.com/conventional-changelog/commitlint/tree/master/%40commitlint/config-conventional#type-enum)**

-   build
-   chore
-   ci
-   docs
-   feat (increments the minor version)
-   fix (increments the patch version)
-   perf
-   refactor
-   revert
-   style
-   test

**Patch Release Example (i.e. v1.0.0 -> v1.0.1)**
Use type _fix_ to release a patch version. Common use cases are for fixing existing code, or updating styles or prop-types.

    fix(radio): updated radiobutton styles

**Minor/Feature Release Example (i.e. v1.0.0 -> v1.1.0)**
Use types _feat_, _perf_ for a minor/feature release. This is mainly used for new features, or to update performance on existing code.

    feat(toggle): add triple state option to component

**Major/Breaking Release Example (i.e. v1.0.0 -> v2.0.0)**

> **IF YOU NEED TO DO A BREAKING CHANGE, YOU MUST CONSULT THE CORE UI/UX TEAM**

You can use any type for this, but as your footer, you need to add _BREAKING CHANGE: \<reason>_. Only use this if interfaces on a component will drastically change, thus making consumers refactor their code in order for it to work. The general format should be _WHY_ the change was made and _WHAT_ the change does. Extra information can be included as well, if needed.

    fix(table): updated table to accept different type of data object for cells

    BREAKING CHANGE: The original interface was too complicated, and added a lot of complexity in running.
    This change allows for more readability and better performance.  Existing consumers need to update
    existing code to reflect changes.

### IMPORTANT!!! index.js for named exports

In order for a newly made component to be importable, be sure to add the named export into src/index.js. **This is very important to allow your component to be consumed, please do not forget this step.**

### Code Reviews/Pull Requests

Merging to the main branch is managed by approved reviewers, see the `CODEOWNERS` file. After the code is reviewed, they will approve and merge the request.

### Symbolic Links

> THIS IS OUT OF DATE, NPM 6 BREAKS THIS METHOD.  UNTIL WE CAN MOVE FORWARD TO NPM 8, THE INSTRUCTIONS ARE DIFFERENT.

To test your changes as the consumer of the repository in UTUI for example, use [symbolic links](https://tealium.atlassian.net/wiki/spaces/ENGSD/pages/1270481958/Symbolic+links+with+UTUI) to accomplish this.

## Jenkins Pipeline

Please refer to the [confluence page](https://tealium.atlassian.net/wiki/spaces/ENGSD/pages/1430192495/Jenkins+Pipeline) for information on how the pipeline currently is implemented.
