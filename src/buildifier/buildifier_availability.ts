// Copyright 2019 The Bazel Authors. All rights reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as child_process from "child_process";
import * as vscode from "vscode";
import * as which from "which";

import { getDefaultBuildifierExecutablePath } from "./buildifier";

/** The URL to load for buildifier's releases. */
const BUILDTOOLS_RELEASES_URL =
  "https://github.com/bazelbuild/buildtools/releases";

/**
 * Checks whether buildifier is available (either at the system PATH or a
 * user-specified path, depending on the value in Settings).
 *
 * If not available, a warning message will be presented to the user with a
 * Download button that they can use to go to the GitHub releases page.
 */
export function checkBuildifierIsAvailable() {
  const buildifierExecutable = getDefaultBuildifierExecutablePath();
  which(buildifierExecutable, async (err, _) => {
    if (err) {
      await showBuildifierDownloadPrompt("Buildifier was not found");
      return;
    }

    // If we found it, make sure it's a compatible version by running
    // buildifier on an empty input and see if it exits successfully and the
    // output parses.
    const process = child_process.execFile(
      buildifierExecutable,
      ["--format=json", "--mode=check"],
      {},
      (error: Error, stdout: string, stderr: string) => {
        if (!error && stdout) {
          try {
            JSON.parse(stdout);
            return;
          } catch {
            // Swallow the error; we'll display the prompt below.
          }
        }
        // If we didn't get valid JSON back, we don't have a compatible version.
        // tslint:disable-next-line:no-floating-promises
        showBuildifierDownloadPrompt(
          "Buildifier is too old (0.25.1 or higher is needed)",
        );
      },
    );
    process.stdin.end();
  });
}

/**
 * Show a warning to the user that Buildifier was not found or is not
 * compatible, and give them the option to download it.
 *
 * @param reason The reason that Buildifier was not valid, which is displayed
 *     to the user.
 */
async function showBuildifierDownloadPrompt(reason: string) {
  const item = await vscode.window.showWarningMessage(
    `${reason}; linting and formatting of Bazel files ` +
      "will not be available. Please download it from " +
      `${BUILDTOOLS_RELEASES_URL} and install it ` +
      "on your system PATH or set its location in Settings.",
    { title: "Download" },
  );

  if (item && item.title === "Download") {
    vscode.commands.executeCommand(
      "vscode.open",
      vscode.Uri.parse(BUILDTOOLS_RELEASES_URL),
    );
  }
}
