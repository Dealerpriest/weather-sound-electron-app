import { app, BrowserWindow } from 'electron';
import dotenv from 'dotenv';
dotenv.config();
import WebSocket from 'ws';
import OSC from 'osc-js';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;
let mainWindowLoaded = false;

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 600,
    height: 800,
  });

  mainWindow.setMenu(null);

  // and load the index.html of the app.
  mainWindow.loadURL(`file://${__dirname}/index.html`);

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();

  // Emitted when the window is closed.
  mainWindow.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
    mainWindowLoaded = false;
  });

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindowLoaded = true;
    start();
    setInterval(checkSocket, 5000);
  })
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
let latestWeatherPacket = null;


const osc = new OSC({
  plugin: new OSC.DatagramPlugin({ send: { port: 12000, host: '127.0.0.1' } })
});

let ws = null;
let server = process.env.SERVER;
let port = process.env.PORT;
let clientToken = process.env.ELECTRONAPPTOKEN;

function start(){

  // Open the osc socket. 
  osc.open();
  osc.on('open', () => {
    console.log('osc port opened');
  });

  openWebsocket();
}

function openWebsocket(){
  try{
    console.log('trying to create a websocket');
    let url = server + ':' + port + '?token=' + clientToken
    if(mainWindowLoaded){
      mainWindow.webContents.send('websocketStatus', `trying to connect to <strong>${url}</strong>`);
    }
    ws = new WebSocket(url, {
      perMessageDeflate: false
    });
  } catch(err){
    console.log(err);
    return;
  }

  ws.on('error', () =>{
    console.log('error');
    if(mainWindowLoaded){
      mainWindow.webContents.send('websocketStatus', `connection error!`);
    }
  });

  ws.on('open', function open() {
    console.log('connected to websocket');
    if(mainWindowLoaded){
      mainWindow.webContents.send('websocketStatus', `connected to <strong>${server}</strong> on port <strong>${port}</strong> with access token <strong>${clientToken}</strong>`);
    }
  });
  
  ws.on('close', function close() {
    console.log('disconnected from websocket');
    if(mainWindowLoaded){
      mainWindow.webContents.send('websocketStatus', `connection lost`);
    }
    openWebsocket();
  });
  
  ws.on('message', function incoming(data) {
    latestWeatherPacket = JSON.parse(data);

    if(mainWindowLoaded){
      mainWindow.webContents.send('weatherData', latestWeatherPacket);
    }

    const bundle = new OSC.Bundle(Date.now() + 500);
    let message = null;
    console.log('received weather message');
    for(let [key , value] of Object.entries(latestWeatherPacket)){
      if(value !== null){
        console.log(`    ${key}: ${value}`);
        message = new OSC.Message(`/weather/${key}`, value);
        bundle.add(message);
      }
    }

    if (osc.status() === OSC.STATUS.IS_OPEN) {
      osc.send(bundle);
    }    
  });
  
  ws.on('ping', function ping(){
    console.log("recieved a ping");
  });
}

function checkSocket(){
  if(!ws || ws.readyState == 3){
    console.log('socket not open');
    openWebsocket();
  }
}

// start();