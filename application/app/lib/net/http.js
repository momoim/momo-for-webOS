net.Ajax = { Request: Ajax.Request };

net.Ajax.chainCallbacks = function(originalCallbacks, newCallbacks) {
  if (!originalCallbacks) {
    return newCallbacks;
  }

  for (var handler in newCallbacks) {
    if (!newCallbacks.hasOwnProperty(handler)) {
      continue;
    }

    buildHandler(originalCallbacks[handler], newCallbacks[handler]);
  }

  function buildHandler(originalHandler, newHandler) {
    if (originalHandler) {
      originalCallbacks[handler] = function() {
        newHandler.apply(this, arguments);
        originalHandler.apply(this, arguments);
      }
    } else {
      originalCallbacks[handler] = newHandler;
    }
  }

  return originalCallbacks;
};

net.Http = function() {
  var timeoutInSeconds = net.Http.DEFAULT_TIMEOUT_IN_SECONDS;

  this.setTimeoutInSeconds = function(seconds) {
    timeoutInSeconds = seconds || timeoutInSeconds;
  };

  this.get = function(url, parameters, headers, callbacks) {
    var timeout = {};
    var request = new net.Ajax.Request(url, buildRequestOptions('GET', parameters, headers, callbacks, timeout));

    request.abort = generateAbortFunction(request, timeout, callbacks);

    timeout.id = window.setTimeout(onTimeoutFunction(request, callbacks), timeoutInSeconds * 1000);

    return request;
  };

  this.post = function(url, parameters, headers, callbacks) {
    var timeout = {};
    var request = new net.Ajax.Request(url, buildRequestOptions('POST', parameters, headers, callbacks, timeout));

    timeout.id = window.setTimeout(onTimeoutFunction(request, callbacks), timeoutInSeconds * 1000);

    request.abort = generateAbortFunction(request, timeout, callbacks);

    return request;
  };

  function generateOnCompleteFunction(timeout, onComplete) {
    return function(response) {
      window.clearTimeout(timeout.id);
      if (onComplete) {
        onComplete(response);
      }
    }
  }

  function generateAbortFunction(request, timeout, callbacks) {
    return function() {
      window.clearTimeout(timeout.id);
      abortRequest(request);
      if (callbacks.onComplete) {
        callbacks.onComplete();
      }
    }
  }

  function onTimeoutFunction(request, callbacks) {
    return function onTimeout() {
      abortRequest(request);
      if (callbacks.onFailure) {
        callbacks.onFailure({});
      }

      if (callbacks.onComplete) {
        callbacks.onComplete({status: 500, request: { success: function() {
          return false;
        }}});
      }
    };
  }

  function buildRequestOptions(method, parameters, headers, callbacks, timeout) {
    var requestOptions = $H(callbacks || {}).clone().toObject();
    Object.extend(requestOptions, {
      method: method,
      //parameters: parameters,
      postBody: parameters,
      requestHeaders: headers,
      onComplete: generateOnCompleteFunction(timeout, requestOptions.onComplete),
      onSuccess: generateOnCompleteFunction(timeout, requestOptions.onSuccess),
      onFailure: generateOnCompleteFunction(timeout, requestOptions.onFailure)
    });
    return requestOptions;
  }

  function abortRequest(request) {
    // prevent state-change callbacks from being issued
    request.transport.onreadystatechange = Prototype.emptyFunction;

    request.transport.abort();
    if (Ajax.activeRequestCount > 0) {
      Ajax.activeRequestCount--;
    }
  }
};

net.Http.DEFAULT_TIMEOUT_IN_SECONDS = 30;

