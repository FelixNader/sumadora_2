const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(
    /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
  )
);

type Config = {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
};

let controllerRefreshPending = false;
let updateHooksRegistered = false;

export function register(config?: Config): void {
  if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
    const publicUrl = new URL(process.env.PUBLIC_URL, window.location.href);
    if (publicUrl.origin !== window.location.origin) {
      return;
    }

    window.addEventListener('load', () => {
      const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

      if (isLocalhost) {
        checkValidServiceWorker(swUrl, config);

        navigator.serviceWorker.ready.then(() => {
          console.log('PWA ready in localhost mode.');
        });
      } else {
        registerValidSW(swUrl, config);
      }
    });
  }
}

function registerValidSW(swUrl: string, config?: Config): void {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      attachAutomaticUpdateChecks(registration);
      attachControllerReload();

      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              if (config && config.onUpdate) {
                config.onUpdate(registration);
              } else {
                activateUpdate(registration);
              }
            } else if (config && config.onSuccess) {
              config.onSuccess(registration);
            }
          }
        };
      };
    })
    .catch((error) => {
      console.error('Service worker registration failed:', error);
    });
}

function attachAutomaticUpdateChecks(
  registration: ServiceWorkerRegistration
): void {
  if (updateHooksRegistered) {
    return;
  }

  updateHooksRegistered = true;

  const updateRegistration = () => {
    registration.update().catch(() => {
      console.log('Unable to refresh the installed PWA version.');
    });
  };

  window.addEventListener('focus', updateRegistration);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      updateRegistration();
    }
  });

  updateRegistration();
}

function attachControllerReload(): void {
  if (controllerRefreshPending) {
    return;
  }

  controllerRefreshPending = true;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}

function activateUpdate(registration: ServiceWorkerRegistration): void {
  if (registration.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    return;
  }

  registration.update().catch(() => {
    console.log('Unable to activate the latest PWA version.');
  });
}

function checkValidServiceWorker(swUrl: string, config?: Config): void {
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then((response) => {
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log('No internet connection found. App is running in offline mode.');
    });
}

export function unregister(): void {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}
