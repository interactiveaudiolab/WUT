// adapted from https://github.com/hakimel/audioUploadModal
class Modal {
  constructor(generalModalActive, active, cover, ready, open, close) {
    document.getElementById(open).addEventListener('click', () => this.show())
    document.getElementById(close, '#').addEventListener('click', () => this.hide())

    this.container = document.body;
    this.cover = document.querySelector(this._makeSelector(cover, '.'));
    this.generalModalActive = generalModalActive;
    this.active = active;

    this.container.classList.add(ready);

    // listeners below added on show
    // hide on esc
    this.onKeyUp = (event) => { if(event.keyCode === 27) { this.hide(); } }
    // hide on click outside
    this.onClick = (event) => { if(event.target === this.cover) { this.hide(); } }
  }

  show() {
    this._setListeners(true)
    this.container.classList.add(this.active);
    this.container.classList.add(this.generalModalActive);
  }

  hide(dontClean) {
    this._setListeners(false)
    this.container.classList.remove(this.active);
    this.container.classList.remove(this.generalModalActive);

    // cleaner removes unwanted state on modal (such as checked checkboxes)
    if(!dontClean) { this.clean() }
  }

  clean() { if(this.onHideCleaner) this.onHideCleaner() }

  // add function to perform cleanup (such as unchecking checkboxes) on hide
  addOnHideCleaner(cleaner) { this.onHideCleaner = cleaner; }

  // allow user to specify a series of click targets
  // and elements to hide/show with those targets
  // input format: listof objects with target, hide and show fields
  // [{ target: 'id', hide: [listof ids], show: [listof [ids, display_style]] }, ...]
  setNaivePageTransitions(path) {
    for (let { target, hide, show } of path) {
      let targElem = document.getElementById(target);
      targElem.addEventListener('click', () => {
        if(!targElem.classList.contains('disabled')) {
          for(let h of hide) { document.getElementById(h).setAttribute('style', 'display: none;') }
          for(let [s, styl] of show) { document.getElementById(s).setAttribute('style', styl) }
        }
      })
    }
  }

  _setListeners(active) {
    if(active) {
      document.addEventListener('keyup', this.onKeyUp);
      document.addEventListener('click', this.onClick);
      document.addEventListener('touchstart', this.onClick);
    } else {
      document.removeEventListener('keyup', this.onKeyUp);
      document.removeEventListener('click', this.onClick);
      document.removeEventListener('touchstart', this.onClick);
    }
  }

  _makeSelector(clss, pref) { return clss[0] === pref ? clss : `${pref}${clss}` }

  // makes this a more powerful class
  // also definitely harder to debug/understand
  // probably would be good to subclass in future instead
  // just adding arbitrary callbacks/functions
  _addArbitraryFunction(anon, args) { anon(...args); }
}