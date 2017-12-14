//Crop the photo

const cropData = (str, coords, callback) => {
  var img = new Image();

  img.onload = () => {
    var canvas = document.createElement('canvas');
    canvas.width = coords.w;
    canvas.height = coords.h;

    var ctx = canvas.getContext('2d');

    ctx.drawImage(img, coords.x, coords.y, coords.w, coords.h, 0, 0, coords.w, coords.h);

    callback({
      dataUri: canvas.toDataURL()
    });
  };

  img.src = str;

  document.body.appendChild(img);
}

//captureVisibleTab api de chrome captura la región visible de la tab (de la pestaña en la que esté)
//Cropdata pilla la imagen que me devuelve el api la cargo en un canvas
//en función de las coordenadas que le ha mandado el front hace el recorte y
//devuelve la imagen en base64, se la mandamos al content.js con el mensaje.
//background tiene los permisos para interactuar con el navegador por medio de la api

const capture = (coords) => {
  chrome.tabs.captureVisibleTab(null, {format: "png"}, (data) => {
    cropData(data, coords, (data) => {
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        const activeTab = tabs[0];
        chrome.tabs.sendMessage(activeTab.id, {
          'message': 'capture_screenshot',
          'dataUri': data.dataUri
        });
      });
    });
  });
}

// 1º Called when the user clicks on the browser action.
//Manda un mensaje a content que es el clicked_browser_action
chrome.browserAction.onClicked.addListener((tab) => {
  // Send a message to the active tab
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    const activeTab = tabs[0];
    chrome.tabs.sendMessage(activeTab.id, {
      'message': 'clicked_browser_action',
      'url': activeTab.url
    });
  });
});

//Escuchamos los eventos, en este caso coords que es el que nos envía el front
chrome.extension.onMessage.addListener((request) => {
  //Si la respuesta es coords, hacemos la captura
  if (request.type == "coords") {
    capture(request.coords);
  }
});
