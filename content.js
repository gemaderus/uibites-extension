let status = {
  show: false,
  token: null,
  blob: null,
  url: null
}

const ID = 'ui-bites-extension';
const SELECTION = 'ui-bites-extension-selection';
const CSS = 'ui-bites-extension-css';
const IMAGE = 'ui-bites-extension-preview';
const LOGOUT = 'ui-bites-extension-logout';
const BASE_URL = 'http://localhost:3000';

let selectionElement;
let startPos;

const hasToken = () => {
  return status.token != null;
}

const getToken = () => {
  return status.token;
}

const closeExtension = () => {
  const el = `#${ID}`;
  $(el).remove();
}

//cambiamos el cursor y empezamos a escuchar cuando el usuario pincha en el documento
const startScreenshotMode = () => {
  console.log('start screenshot');
  //change cursor
  document.body.style.cursor = 'crosshair';
  $(document).on('mousedown', mouseDown);
}

const stopScreenshotMode = () => {
  console.log('stop screenshot');
  //change cursor
  document.body.style.cursor = 'default';
  $(document).off('mousedown', mouseDown);
}

// Quitamos la cruz del cursor y dejamos de escuchar el mouseDown
// y pasamos a background js las coordenadas
const endScreenshot = (coords) => {
  stopScreenshotMode();
  chrome.runtime.sendMessage({type: 'coords', coords: coords});
}

//nos guardamos donde el usario ha pinchado y esta es la posición inicial
const mouseDown = (e) => {
  e.preventDefault();

  startPos = {
    x: e.pageX,
    y: e.pageY
  };

  //Ayuda visual para saber el área que estas seleccionando
  selectionElement = $(`<div id="${SELECTION}"></div>`);
  selectionElement.appendTo('body');
  selectionElement.css({
    background: 'blue',
    opacity: 0.1,
    position: 'absolute',
    left: e.pageX,
    top: e.pageY,
    width: 0,
    height: 0,
    zIndex: 1000000000
  });

  //Escuchamos cada vez que se mueve el ratón
  $(document).on('mousemove', mouseMove);
  $(document).on('mouseup', mouseUp);
}

//Cambiarle el tamaño a ese cuadrado
const mouseMove = (e) => {
  e.preventDefault();

  selectionElement.css({
    width: e.pageX - startPos.x,
    height: e.pageY - startPos.y
  });
}

//Te dice cuando has terminado de arrastrar.
const mouseUp = (e) => {
  e.preventDefault();

  $(document).off('mousemove', mouseMove);
  $(document).off('mouseup', mouseUp);

  //Eliminamos el cuadro de la selección
  selectionElement.remove();

  //Cojo las coordenadas y se la paso a la función endScreenshot
  setTimeout(() => {
    var coords = {
      w: e.pageX - startPos.x,
      h: e.pageY - startPos.y,
      x: startPos.x,
      y: startPos.y
    };

    //Esta se la transmite de nuevo a background js
    endScreenshot(coords);
  }, 50);

  return false;
}

const dataURItoBlob = (dataURI) => {
  // convert base64/URLEncoded data component to raw binary data held in a string
  var byteString;
  if (dataURI.split(',')[0].indexOf('base64') >= 0) {
    byteString = atob(dataURI.split(',')[1]);
  } else {
    byteString = unescape(dataURI.split(',')[1]);
  }

  // separate out the mime component
  var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

  // write the bytes of the string to a typed array
  var ia = new Uint8Array(byteString.length);
  for (var i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }

  return new Blob([ia], {type:mimeString});
}

//Crea un elemento y lo añade al body y lo usamos de contenedor para los html estaticos.
const openExtension = () => {
  const el = `<div id="${ID}" class="ui-bites-extension-container"></div>`;
  $(el).appendTo('body');
  //Si hay token, mostramos el formulario
  if (hasToken()) {
    showSaveForm();
    startScreenshotMode();
  } else {
    showLogin();
  }
}

const showLogin = () => {
  const el = `#${ID}`;
  $(el).empty();

  $.get(chrome.extension.getURL('html/login.html'), (data) => {
    $($.parseHTML(data)).appendTo(el);

    $('#ui-bites-extension-login').on('click', e => {
      e.preventDefault();

      let form = {
        email: $('#ui-bites-extension-email').val(),
        password: $('#ui-bites-extension-password').val()
      }

      $.ajax({
        type: 'POST',
        url: `${BASE_URL}/api/auth/login`,
        data: JSON.stringify(form),
        contentType: "application/json; charset=utf-8",
        dataType: 'json',
        processData : false,
        success: (data) => {
          chrome.storage.sync.set({'auth_token': data.token});
          status.token = data.token;
          showSaveForm();
        },
        error: (xhr, status, error) => {
          console.error(error);
        }
      });
    });
  });
}

//Borramos el contenido del contenedor(sombra) y cargamos el html que tenemos estático
//y das eventos a los botones.
const showSaveForm = () => {
  const el = `#${ID}`;
  $(el).empty();

  $.get(chrome.extension.getURL('html/card.html'), (data) => {
    $($.parseHTML(data)).appendTo(el);

    $('#ui-bites-extension-logout').on('click', (e) => {
      e.preventDefault();
      chrome.storage.sync.remove(['auth_token'], (items) => {
        status.token = null;
        showLogin();
      });

    });

    $('#ui-bites-extension-submit').on('click', (e) => {
      e.preventDefault();
      saveForm();
    });
  });
}

const saveForm = () => {

  //generamos un form data para enviarlos por Ajax,
  //multipart: tiene datos y ficheros
  var multipart = new FormData();

  multipart.append('title', $('#ui-bites-extension-title').val());
  multipart.append('description', $('#ui-bites-extension-description').val());
  multipart.append('url', status.url);
  multipart.append('tags', $('#ui-bites-extension-tags').val());
  multipart.append('file', status.blob, `${Date.now()}.png`);

  $.ajax({
    type : 'POST',
    url : `${BASE_URL}/api/dashboard/cards`,
    data : multipart,
    processData: false,
    contentType: false,
    cache: false,
    headers: {
      'Authorization': status.token
    },
    success : (data) => {
      closeExtension();
    },
    error : (xhr, status, error) => {
      console.error(error);
    }
  });
}

//esto lo injectamos en la página para darle estilos al forms
const injectCSS = (css, id) => {
  const path = chrome.extension.getURL(css);
  if ($(`#${id}`).length === 0) {
    $('head').append($('<link>')
      .attr('rel','stylesheet')
      .attr('type','text/css')
      .attr('id', id)
      .attr('href', path));
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === "clicked_browser_action" ) {
    status.show = !status.show;
    status.url = request.url;
    status.show ? openExtension() : closeExtension();
  }

  //generamos el blob es un formato byte para la imagen
  //y cargamos la previsualización en el form
  //ahora el usuario tendrá que rellenar los campos
  if (request.message === "capture_screenshot" ) {
    status.blob = dataURItoBlob(request.dataUri);
    const imageContainer = $(`#${IMAGE}`);
    const image = $("<img />", {
      "src": request.dataUri
    });
    imageContainer.html(image);
  }
});

chrome.storage.sync.get(['auth_token'], function(items) {
  status.token = items.auth_token;
});

injectCSS('styles/uibites.css', CSS);
