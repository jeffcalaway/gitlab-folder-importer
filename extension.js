const vscode = require('vscode');
const { fetchGitLabFolders, importFolderContents, checkGitLabConnection } = require('./gitlabIntegration');

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    let statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    context.subscriptions.push(statusBar);

    vscode.window.showInformationMessage('Checking GitLab connection...');

    checkGitLabConnection().then(isConnected => {
        if (isConnected) {
            statusBar.text = `$(check) GitLab Connection Successful`;
            statusBar.tooltip = "The connection to the GitLab repository was successful.";
            statusBar.show();
            vscode.window.showInformationMessage('Connected to GitLab repository successfully.');
        } else {
            statusBar.text = `$(alert) GitLab Connection Failed`;
            statusBar.tooltip = "The connection to the GitLab repository failed. Check your settings.";
            statusBar.show();
            vscode.window.showErrorMessage('Failed to connect to GitLab repository. Check your settings.');
        }
    });

    console.log('GitLab Folder Importer is now active!');

    let disposable = vscode.commands.registerCommand('gitlabFolderImporter.insertComponent', async function (context) {
        // Fetch folders from GitLab repo
        const folders = await fetchGitLabFolders();
        console.log('Fetched folders:', folders); // Log the fetched folders array

        if (!folders) {
            vscode.window.showErrorMessage('Failed to fetch folders from GitLab.');
            return;
        }

        // Show quick pick with folders
        const selectedFolder = await vscode.window.showQuickPick(folders, {
            placeHolder: 'Select a component to insert',
        });

        if (selectedFolder) {
            await importFolderContents(selectedFolder, context.fsPath);
        }
    });

    context.subscriptions.push(disposable);
}

function deactivate() {}

exports.activate = activate;
exports.deactivate = deactivate;
