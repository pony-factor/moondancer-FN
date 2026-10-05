<p align="center" style="margin: 0">
  <a href="https://github.com/pony-factor/moondancer-FN"><img src="./assets/markdown-footnote.png" alt="Moondancer FN" width="80" /></a>
</p>
<h1 align="center" style="margin-top: 0">Moondancer FN</h1>

[![CI](https://github.com/pony-factor/moondancer-FN/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/pony-factor/moondancer-FN/actions/workflows/ci.yml)

`[^1]` [footnote syntax](https://www.markdownguide.org/extended-syntax/#footnotes) support to VS Code's Markdown editor and preview.


> This repository is a maintained fork of [houkanshan/vscode-markdown-footnote](https://github.com/houkanshan/vscode-markdown-footnote) by Mai Hou. The upstream work was distributed under the MIT License; its original copyright and permission notice are retained in [`LICENSE-base`](./LICENSE-base). This fork and its modifications are distributed under the GNU Affero General Public License version 3 or, at your option, any later version; see [`LICENSE`](./LICENSE).

## Features


- Hover to preview and jump between footnote reference and content by <kbd>cmd</kbd> / <kbd>ctrl</kbd> + <kbd>click</kbd>.

  ![Hover preview](assets/hover.png)

- Peek editor for quick editing and preview.

  ![Peek footnote content](assets/peek-content.png)

  ![Peek footnote references](assets/peek-references.png)

- Command for inserting new footnote

  ![Click to create a new footnote](assets/click-to-create.png)

  ![Use command to insert a footnote](assets/command-to-insert.png)

- Edit footnotes in a synchronized side editor. Run **Open Footnote Editor** to keep the current Markdown file's footnotes open beside your draft. Inserting a new footnote keeps the Markdown cursor at the reference and moves focus directly to the new footnote in the side editor. The side editor remembers its scroll/cursor position, and new definitions are placed beside the last footnote you were editing instead of always being appended to the end. Multiline footnote content is supported, including indented continuation lines, as originally requested in [upstream PR #14](https://github.com/houkanshan/vscode-markdown-footnote/pull/14).

- Optionally store footnote definitions in a separate sibling file. Enable `vscode-markdown-footnote.separateFootnoteFile` to keep references such as `[^1]` in the source document while definitions are read from and written to `footnotes.md`. The definition file is created automatically when a footnote is first inserted. `vscode-markdown-footnote.footnoteFileName` can change the file name. Hover, go-to-definition, reference lookup, clickable links, and the synchronized side editor follow the definitions across files.

- Render footnotes in the built-in markdown preview.

  ![Preview](assets/preview.png)

### Separate footnote file

Separate-file storage is opt-in and defaults to off, so existing Markdown documents keep their current same-file behavior. VS Code's built-in Markdown preview only receives the source document text, so external definitions are not currently merged into preview rendering; editor navigation and the Footnotes side editor do resolve them.

### TODO

- Support `pandoc-citeproc` format [citations](https://crsh.github.io/papaja_man/writing.html#citations)

## Build and use this fork locally

This fork does not need to be published to the VS Code Marketplace. You can run it directly from the source checkout while developing, or package it as a local `.vsix` and install it into your normal VS Code profile.

### Prerequisites

Install:

- [Visual Studio Code](https://code.visualstudio.com/)
- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) with npm

### 1. Clone and install dependencies

```sh
git clone https://github.com/pony-factor/moondancer-FN.git
cd moondancer-FN
npm install
```

### 2. Compile the extension

```sh
npx tsc -p .
```

The compiled JavaScript is written to the `out/` directory.

### 3. Run it directly for development

Open the repository in VS Code:

```sh
code .
```

Then press <kbd>F5</kbd>, or open **Run and Debug** and choose **Run Extension**.

VS Code will compile the extension and open a separate **Extension Development Host** window with this checkout loaded. You can test the extension there without installing or publishing anything.

After changing the source, stop the development host and press <kbd>F5</kbd> again to rebuild and relaunch it.

### 4. Install this fork into your normal VS Code

Package the current checkout as a local VS Code extension:

```sh
npx vsce package --out markdown-footnote-local.vsix
```

Install that file:

```sh
code --install-extension markdown-footnote-local.vsix --force
```

If the `code` command is not available in your shell, open VS Code, go to the **Extensions** view, open the **...** menu, choose **Install from VSIX...**, and select `markdown-footnote-local.vsix`.

Reload VS Code after installation if prompted.

### Rebuild after making changes

To replace the locally installed copy with a new build:

```sh
npx tsc -p .
npx vsce package --out markdown-footnote-local.vsix
code --install-extension markdown-footnote-local.vsix --force
```

No Marketplace publishing step is required.

## Contributing

- File bugs and feature requests in [GitHub Issues](https://github.com/pony-factor/moondancer-FN/issues).

### Dev

- Fork this repository
- `npm install`
- Create your feature branch: `git checkout -b my-new-feature`
- Make changes and add tests
- `npm run test:watch` and check your changes by pressing `F5`
- Commit your changes: `git commit -am 'feat: Add some feature'`
- Push to the branch: `git push origin my-new-feature`
- Submit a pull request

## Thanks

- [Mai Hou's original VSCode Markdown Footnote project](https://github.com/houkanshan/vscode-markdown-footnote)
- [Markdown Footnotes](https://github.com/mjbvz/vscode-markdown-footnotes)
- [Markdown Memo](https://github.com/svsool/vscode-memo)

## License

This fork is licensed under the [GNU Affero General Public License v3.0 or later](./LICENSE).

The upstream code by Mai Hou was originally distributed under the MIT License. Its original copyright and permission notice are preserved in [`LICENSE-base`](./LICENSE-base).

## Changelog

See changelog [here](./CHANGELOG.md).
