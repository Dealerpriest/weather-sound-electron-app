import {ipcRenderer} from 'electron';

ipcRenderer.on('weatherData', (event, message) => {
    
    let str = ''; // '<dl class="table-display">';
    for(let [key , value] of Object.entries(message)){
        if(value !== null){
            str += `<dt>${key}</dt><dd>${value}</dd>`;
        }
    }
    // str += '</dl>'
    document.getElementById("weather-paragraph").innerHTML = str;
    // console.log(message)  // Prints 'whoooooooh!'
});

ipcRenderer.on('websocketStatus', (event, message) =>{
    document.getElementById("websocket-status").innerHTML = `Connection status: ${message}`;
});