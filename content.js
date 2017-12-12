let status = {
  show: false,
  token: null
}

const ID = 'ui-bites-extension';
const CSS = 'ui-bites-extension-css';

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

const openExtension = () => {
  const el = `<div id="${ID}" class="ui-bites-extension-container"></div>`;
  $(el).appendTo('body');

  if (hasToken()) {
    showSaveForm();
  } else {
    showLogin();
  }
}

const showLogin = () => {
  const el = `#${ID}`;
  $(el).empty();

  $.get(chrome.extension.getURL('html/login.html'), (data) => {
    $($.parseHTML(data)).appendTo(el);

    $('.js-ui-bites-extension-form').on('submit', e => {
      e.preventDefault();

      let form = {
        email: $('.js-ui-bites-extension-email').val(),
        password: $('.js-ui-bites-extension-password').val()
      }

      $.ajax({
        type: 'POST',
        url: 'http://localhost:3000/api/auth/login',
        data: JSON.stringify(form),
        contentType: "application/json; charset=utf-8",
        dataType: 'json',
        processData : false,
        success: (data) => {
          chrome.storage.sync.set({'auth_token': data.token});
          status.token = data.token;
        },
        error: (xhr, status, error) => {
          console.error(error);
        }
      });
    });
  });
}

const showSaveForm = () => {
  const el = `#${ID}`;
  $(el).empty();

  $.get(chrome.extension.getURL('html/card.html'), (data) => {
    $($.parseHTML(data)).appendTo(el);
  });
}

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
      status.show ? openExtension() : closeExtension();
    }
  }
);

chrome.storage.sync.get(['auth_token'], function(items) {
  status.token = items.auth_token;
});

injectCSS('styles/uibites.css', CSS);
