
var vscode = require('vscode');

exports.locateGitProjects = (projectsDirList, callBack) => {
    var locator = require('filewalker');
    var path = require('path');
    var dirList = [];

    function addToList(dirPath, repoName) {
        var obj = {
            dir: dirPath,
            repo: repoName
        };
        dirList.push(obj);
        return;
    }

    function extractRepoInfo(basePath) {
        var cp = require('child_process');
        cp.exec('git remote show origin -n', { cwd: basePath }, (error, stdout, stderr) => {
            if (error) {
                return;
            };

            var arr = stdout.toString('utf-8').split('\n');
            for (var i = 0; i < arr.length; i++) {
                var line = arr[i];
                var repoPath = 'Fetch URL: ';
                var idx = line.indexOf(repoPath);
                if (idx == -1) continue;

                addToList(path.normalize(basePath + path.sep + '..'), line.trim().replace(repoPath, ''));
                break;
            }
        });
    }

    function processDirectory(relPath, fsOptions, absPath) {
        var currentDir = path.basename(absPath);
        vscode.window.setStatusBarMessage(absPath);
        if (currentDir == '.git') {
            var fileName = path.join(absPath, 'config');
            var fs = require('fs');

            fs.exists(fileName, (exists) => {
                if (!exists) return;
                extractRepoInfo(absPath);
            });

        }
    }

    function handleError(err) {
        console.log('Error walker:', err);
    }


    var promises = [];

    var fs = require('fs');
    projectsDirList.forEach((projectBasePath) => {
        if (!fs.existsSync(projectBasePath)) {
            vscode.window.showWarningMessage('Directory ' + projectBasePath + ' do not exists.');
        }
        
        var promise = new Promise((resolve, reject) => {
            try {
                locator(projectBasePath)
                    .on('dir', processDirectory)
                    .on('error', handleError)
                    .on('done', () => {
                        resolve();
                    })
                    .walk();                  
            } catch (error) {
                reject(error);
            }
          
        });
        promises.push(promise);
    });
    
    Promise.all(promises).then(
        () => { callBack(dirList); }, 
        (error) => { vscode.window.showErrorMessage('Error while loading Git Projects.');});

};