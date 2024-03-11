const vscode = require('vscode');
const axios = require('axios');
const fs = require('fs').promises; // Use fs.promises for async operations
const path = require('path');

// Helper function to convert repo URL to API URL
function convertRepoUrlToApiUrl(repoUrl) {
    const repoPath = repoUrl
        .replace('https://gitlab.com/', '') // Remove the base URL
        .replace('.git', ''); // Remove the .git extension
    const encodedRepoPath = encodeURIComponent(repoPath); // URL-encode the repository path
    return 'https://gitlab.com/api/v4/projects/usefulgroup%2Fdevelopment%2Fcomponent-library';
}

async function checkGitLabConnection() {
  const settings = vscode.workspace.getConfiguration('gitlabFolderImporter');
  const repoUrl = settings.get('repositoryUrl');
  const accessToken = settings.get('accessToken');
  const apiUrl = convertRepoUrlToApiUrl(repoUrl);

  try {
      // Fetch project details as a way to check the connection
      const response = await axios.get(`${apiUrl}`, { // The apiUrl should include /projects/:id
          headers: { 'PRIVATE-TOKEN': accessToken }
      });
      
      if (response.status === 200) {
          return true; // Connection successful
      } else {
          console.error('GitLab connection check failed with status:', response.status);
          return false; // Treat any non-200 response as failure to connect
      }
  } catch (error) {
      console.error('Failed to connect to GitLab:', error);
      return false; // Connection failed
  }
}


async function fetchGitLabFolders() {
    const settings = vscode.workspace.getConfiguration('gitlabFolderImporter');
    const repoUrl = settings.get('repositoryUrl');
    const accessToken = settings.get('accessToken');
    const apiUrl = convertRepoUrlToApiUrl(repoUrl);

    try {
        const response = await axios.get(`https://gitlab.com/api/v4/projects/usefulgroup%2Fdevelopment%2Fcomponent-library/repository_tree
        `, {
            headers: { 'Private-Token': accessToken },
        });

        return response.data
            .filter(item => item.type === 'tree') // Only directories
            .map(folder => folder.name);
    } catch (error) {
        console.error('Error fetching folders from GitLab:', error);
        return null;
    }
}

async function importFolderContents(folderName, targetPath) {
  const settings = vscode.workspace.getConfiguration('gitlabFolderImporter');
  const repoUrl = settings.get('repositoryUrl');
  const accessToken = settings.get('accessToken');
  const apiUrl = convertRepoUrlToApiUrl(repoUrl);

  try {
      // Fetch the contents of the folder
      const response = await axios.get(`https://gitlab.com/api/v4/projects/usefulgroup%2Fdevelopment%2Fcomponent-library/repository_tree
      `, {
          params: {
              path: folderName,
              ref: 'main', // You might need to dynamically specify the branch here
          },
          headers: { 'Private-Token': accessToken },
      });

      // Iterate over each item in the folder
      for (const item of response.data) {
          if (item.type === 'blob') { // Handle files
              const fileResponse = await axios.get(`${apiUrl}/repository/files/${encodeURIComponent(item.path)}/raw`, {
                  params: {
                      ref: 'main',
                  },
                  headers: { 'Private-Token': accessToken },
                  responseType: 'arraybuffer', // Important for binary files
              });

              const filePath = path.join(targetPath, item.path.replace(folderName + '/', '')); // Adjust path as needed
              await fs.mkdir(path.dirname(filePath), { recursive: true }); // Ensure the directory exists
              await fs.writeFile(filePath, Buffer.from(fileResponse.data), 'binary');
          } // Add else if here for 'tree' type if handling nested folders
      }

      vscode.window.showInformationMessage(`Imported ${folderName} contents to ${targetPath}`);
  } catch (error) {
      console.error('Error importing folder contents from GitLab:', error);
      vscode.window.showErrorMessage('Failed to import folder contents. See console for details.');
  }
}


// Export your functions as before
module.exports = {
    fetchGitLabFolders,
    importFolderContents, // Ensure this function is implemented
    checkGitLabConnection
};
