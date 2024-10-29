const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

const WITH_BASIC_INIT_VALUE = {
  '8c302956-21b2-47f7-8806-7a53070ab1bf': {
    id: '8c302956-21b2-47f7-8806-7a53070ab1bf',
    value: [
      {
        id: 'aa7e2b8c-bb9a-4788-bc36-bafcaa5c6464',
        type: 'paragraph',
        children: [
          {
            text: 'Start writing here...',
          },
        ],
        props: {
          nodeType: 'block',
        },
      },
    ],
    type: 'Paragraph',
    meta: {
      order: 0,
      depth: 0,
    },
  },
};

let currentPanel = undefined;


function activate(context) {

  vscode.window.registerWebviewPanelSerializer('aptusNotebook', {
    async deserializeWebviewPanel(webviewPanel, state) {
      currentPanel = webviewPanel;
      
      webviewPanel.webview.options = getWebviewOptions(context);
      webviewPanel.webview.html = getWebviewContent(context, webviewPanel.webview);
      
      attachMessageHandlers(webviewPanel, context);
      restorePanelData(context);
      
      handleDisposal(context);
    }
  });

  let disposable = vscode.commands.registerCommand('aptus.openNotebook', async function() {
    // If we already have a panel, show it instead of creating a new one
    if (currentPanel) {
      currentPanel.reveal(vscode.ViewColumn.One);
      return;
    }

    const panel = createWebviewPanel(context);
    currentPanel = panel;
    context.workspaceState.update('aptus-opened', true);

    // Pin the editor tab automatically
    await vscode.commands.executeCommand('workbench.action.pinEditor');

    // Set the webview's initial html content
    panel.webview.html = getWebviewContent(context, panel.webview);

    restorePanelData(context);
    attachMessageHandlers(panel, context);

    handleDisposal(context);
  });



  context.subscriptions.push(disposable);
}

function restorePanelData(context) {
  // Restore the state
  const savedState = context.workspaceState.get('aptus-state', '');
  currentPanel.webview.postMessage({
    command: 'savedState',
    savedState: Object.keys(savedState).length > 0 ? savedState : WITH_BASIC_INIT_VALUE
  });
}

function createWebviewPanel(context) {
  const panel = vscode.window.createWebviewPanel(
    'aptusNotebook',
    'Aptus Notebook',
    vscode.ViewColumn.One,
    getWebviewOptions(context)
  );

  return panel;
}

function attachMessageHandlers(panel, context) {
  // Handle messages from the webview
  panel.webview.onDidReceiveMessage(
    message => {
      switch (message.command) {
        case 'saveState':
          context.workspaceState.update('aptus-state', message.state);
          break;
      }
    },
    undefined,
    context.subscriptions
  );
}

function getWebviewOptions(context) {
  return {
    enableScripts: true,
    localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'webview-ui', 'dist'))],
    retainContextWhenHidden: true,
  };
}

function handleDisposal(context) {
  currentPanel.onDidDispose(() => {
    currentPanel = undefined;
    context.workspaceState.update('aptus-opened', false);
  }, null, context.subscriptions);
}

function getWebviewContent(context, webview) {
  const webviewUiFolder = path.join(context.extensionPath, 'webview-ui', 'dist', 'assets');
  
  // Read the contents of the dist folder
  const files = fs.readdirSync(webviewUiFolder);

  // Find the main JavaScript and CSS files
  const scriptFile = files.find(file => file.endsWith('.js'));
  const styleFile = files.find(file => file.endsWith('.css'));

  if (!scriptFile || !styleFile) {
    return 'Error: Unable to load the webview content' + files + scriptFile + styleFile;
  }

  const isDarkTheme = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Dark;

  const scriptUri = webview.asWebviewUri(vscode.Uri.file(path.join(webviewUiFolder, scriptFile)));
  const styleUri = webview.asWebviewUri(vscode.Uri.file(path.join(webviewUiFolder, styleFile)));

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link rel="stylesheet" type="text/css" href="${styleUri}">
      <title>Aptus</title>
      <style>
        ::selection {
          background-color: ${isDarkTheme ? '#ffffff3d' : '#add8e6'} !important;
          color: ${isDarkTheme ? '#ffffff' : '#000000'} !important;
        }

        ::-moz-selection {
          background-color: ${isDarkTheme ? '#ffffff3d' : '#add8e6'} !important;
          color: ${isDarkTheme ? '#ffffff' : '#000000'} !important;
        }
      </style>
    </head>
    <body class="${isDarkTheme ? 'dark' : 'light'}" style="color-scheme: ${isDarkTheme ? 'dark' : 'light'};">
      <div id="root"></div>
      <script type="module" src="${scriptUri}"></script>
      <script>
        const vscode = acquireVsCodeApi();
     
        window.addEventListener('saveData', (event) => {
          vscode.postMessage({ command: 'saveState', state: event.detail.value });
        });
      </script>
    </body>
    </html>
  `;
}

function deactivate() {}

module.exports = {
  activate,
  deactivate
}