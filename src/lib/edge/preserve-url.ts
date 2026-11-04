/**
 * Next's app router rewrites the address bar to the URL baked into a static
 * page. Public GIF and category URLs reuse one shell, so the first history
 * update has to keep the URL the visitor actually requested.
 * Later navigations run after Shell sets window.__gifmemeReady.
 */
declare global {
  interface Window {
    __gifmemeReady?: boolean;
  }
}

export const PRESERVE_URL_SCRIPT = `(function(){var real=location.pathname+location.search+location.hash;var push=history.pushState;var replace=history.replaceState;function wrap(orig){return function(state,title,url){if(!window.__gifmemeReady){return orig.call(history,state,title,real);}return orig.call(history,state,title,url);};}history.pushState=wrap(push);history.replaceState=wrap(replace);})();`;
