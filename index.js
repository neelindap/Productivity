const electron = require('electron')
const url = require('url')
const path = require('path')

const { app, BrowserWindow, Menu, ipcMain, Tray } = electron

//Electron JSON storage
const os = require('os')
const storage = require('electron-json-storage')

let mainWindow;
let developerWindow;

// For notifications
let notificationTimer
let timer
let type
let appIcon = null

//Listen to app to be ready
app.on('ready', function () {

    // JSON storage path
    storage.setDataPath(path.join(__dirname, '/data'));
    const dataPath = storage.getDataPath();

    mainWindow = new BrowserWindow({
        width: 500,
        height: 400,
        icon: (__dirname, '/images/icon.png')
    })

    // Load html in window
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, '/html/index.html'),
        protocol: 'file:',
        slashes: true
    }));


    // Get time from json
    storage.get('time', function (error, data) {
        if (error) throw error;

        mainWindow.webContents.on('did-finish-load', function () {
            mainWindow.webContents.send('time:data', data);
        });

        timer = data.work * 60 * 1000
        // timer = 6000
        notificationTimer = timer
        type = 'Work'

        notify()
    });

    appIcon = new Tray('./images/icon.ico');
    let contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show App', 
            click: function () {
                mainWindow.show();
            }
        },
        {
            label: 'Quit', 
            click: function () {
                app.isQuitting = true;
                app.quit();
            }
        }
    ]);
    appIcon.setToolTip('Productivity');
    appIcon.setContextMenu(contextMenu);

    //Quit app when closed
    mainWindow.on('closed', function () {
        app.quit();
    })

    mainWindow.on('minimize', function (event) {
        event.preventDefault()
        mainWindow.hide();
    });

    //Build menu from template
    const mainMenu = Menu.buildFromTemplate(mainMenuTemplate)

    Menu.setApplicationMenu(mainMenu)
});

// Intercept data from window
ipcMain.on('time:data', function (e, data) {
    // Update data in storage
    storage.set('time', data, function (error) {
        if (error) throw error;
    });

    // Reset timer on update
    notify()
})

// Notify
function notify() {
    let eNotify = require('electron-notify');
    eNotify.setConfig({
        appIcon: path.join(__dirname, '/images/icon.png'),
        displayTime: 6000,
    });

    clearInterval(notificationTimer)

    notificationTimer = setInterval(function () {
        createNotification(eNotify)
    }, timer)
}

// Notification
function createNotification(eNotify) {
    if (type == 'Work') {
        eNotify.notify({
            title: 'Work time over!',
            text: 'Hey there! You\'ve been working for '+ timer / (60 * 1000) +' minutes. Time for a break!',
        });
        
        type = 'break'
        timer = data.rest * 60 * 1000
        
    } else {
        eNotify.notify({
            title: 'Break time over!',
            text: 'Hey there! Break time over. Time to get back to work!',
        });
        type = 'Work'
        timer = data.work * 60 * 1000
    
    }
    notify()
}

//About developer
function showDeveloperDetails() {

    aboutWindow = new BrowserWindow({
        width: 400,
        height: 250,
        title: 'About Developer'
    })

    // Load html in window
    aboutWindow.loadURL(url.format({
        pathname: path.join(__dirname, '/html/about.html'),
        protocol: 'file:',
        slashes: true
    }));

    // Clear memory on close
    aboutWindow.on('close', function () {
        aboutWindow = null;
    })
}

//Create menu template
const mainMenuTemplate = [
    {
        label: 'File',
        submenu: [{
            label: 'Quit',
            accelerator:
            process.platform == 'darwin' ? 'Command+Q' : 'Ctrl+Q',
            click() {
                app.quit()
            }
        }]
    },
    {
        label: 'About',
        submenu: [{
            label: 'About Developer',
            click() {
                showDeveloperDetails()
            }
        }]
    }
];

//Add empty menu object for mac
if (process.platform == 'darwin') {
    mainMenuTemplate.unshift({})
}

// Dev tools for non-prod env
if (process.env.NODE_ENV !== 'production') {
    mainMenuTemplate.push({
        label: 'Dev Tools',
        submenu: [{
            label: 'Toogle DevTools',
            accelerator:
            process.platform == 'darwin' ? 'Command+I' : 'Ctrl+I',
            click(item, focusedwindow) {
                focusedwindow.toggleDevTools()
            }
        },
        {
            role: 'reload'
        }]
    });
}
