/**
 * SchoolAutocomplete
 * A lightweight, accessible autocomplete widget for school name search.
 * No external dependencies — pure vanilla JS.
 *
 * Usage:
 *   new SchoolAutocomplete({
 *     inputId:    'modalElementarySchool',
 *     endpoint:   'php/search_schools.php',
 *     onSelect:   (value) => { ... }
 *   });
 */
class SchoolAutocomplete {
  /**
   * @param {Object} opts
   * @param {string}   opts.inputId   - ID of the text input element
   * @param {string}   opts.endpoint  - URL of the PHP search endpoint
   * @param {Function} [opts.onSelect]- Callback when user selects a school
   * @param {number}   [opts.debounce=300] - ms to wait before firing fetch
   * @param {number}   [opts.minChars=2]   - min chars before search fires
   * @param {number}   [opts.limit=10]     - max results shown
   */
  constructor(opts = {}) {
    this.inputId = opts.inputId;
    this.endpoint = opts.endpoint;
    this.onSelect = opts.onSelect || null;
    this.debounce = opts.debounce ?? 300;
    this.minChars = opts.minChars ?? 2;
    this.limit = opts.limit ?? 10;

    this._timer = null;
    this._activeIdx = -1;
    this._results = [];
    this._isOpen = false;
    this._abortCtrl = null;

    this._input = document.getElementById(this.inputId);
    if (!this._input) {
      console.warn(`SchoolAutocomplete: input #${this.inputId} not found`);
      return;
    }

    this._build();
    this._bind();
  }

  /** Build the dropdown wrapper and list */
  _build() {
    // Wrap the input
    const parent = this._input.parentNode;
    this._wrapper = document.createElement('div');
    this._wrapper.className = 'school-ac-wrapper relative';
    parent.insertBefore(this._wrapper, this._input);
    this._wrapper.appendChild(this._input);

    // Spinner icon inside the input
    this._spinner = document.createElement('span');
    this._spinner.className = 'school-ac-spinner hidden absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none';
    this._spinner.innerHTML = `<svg class="animate-spin h-4 w-4 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
    </svg>`;
    this._wrapper.appendChild(this._spinner);

    // Dropdown list
    this._list = document.createElement('ul');
    this._list.className = [
      'school-ac-list',
      'absolute z-50 left-0 right-0 bg-white border border-gray-200 rounded-lg',
      'shadow-xl mt-1 max-h-56 overflow-y-auto hidden',
      'divide-y divide-gray-50 text-sm'
    ].join(' ');
    this._list.setAttribute('role', 'listbox');
    this._wrapper.appendChild(this._list);

    // Ensure input doesn't trigger browser autocomplete
    this._input.setAttribute('autocomplete', 'off');
    this._input.setAttribute('aria-autocomplete', 'list');
    this._input.setAttribute('aria-haspopup', 'listbox');
    this._input.setAttribute('aria-expanded', 'false');
  }

  /** Attach event listeners */
  _bind() {
    this._input.addEventListener('input', () => this._onInput());
    this._input.addEventListener('keydown', (e) => this._onKeydown(e));
    this._input.addEventListener('blur', () => {
      // Small delay so click on item fires first
      setTimeout(() => this._close(), 150);
    });

    document.addEventListener('click', (e) => {
      if (!this._wrapper.contains(e.target)) this._close();
    });
  }

  _onInput() {
    clearTimeout(this._timer);
    const val = this._input.value.trim();

    if (val.length < this.minChars) {
      this._close();
      return;
    }

    this._timer = setTimeout(() => this._fetch(val), this.debounce);
  }

  _onKeydown(e) {
    if (!this._isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this._activeIdx = Math.min(this._activeIdx + 1, this._results.length - 1);
        this._highlight();
        break;
      case 'ArrowUp':
        e.preventDefault();
        this._activeIdx = Math.max(this._activeIdx - 1, 0);
        this._highlight();
        break;
      case 'Enter':
        e.preventDefault();
        if (this._activeIdx >= 0) this._select(this._results[this._activeIdx]);
        break;
      case 'Escape':
        this._close();
        break;
    }
  }

  async _fetch(query) {
    // Cancel any in-flight request
    if (this._abortCtrl) this._abortCtrl.abort();
    this._abortCtrl = new AbortController();

    this._showSpinner(true);

    try {
      const url = `${this.endpoint}?q=${encodeURIComponent(query)}&limit=${this.limit}`;
      const res = await fetch(url, { signal: this._abortCtrl.signal });
      if (!res.ok) throw new Error('Network error');
      const data = await res.json();
      this._results = Array.isArray(data) ? data : [];
      this._activeIdx = -1;
      this._render();
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('SchoolAutocomplete fetch error:', err);
      }
    } finally {
      this._showSpinner(false);
    }
  }

  _render() {
    this._list.innerHTML = '';

    if (!this._results.length) {
      // If no results from server, show free-text use option + School Not Found
      const query = this._input.value.trim();
      if (query.length >= this.minChars) {
        this._renderFreeTextOption(query);
        this._renderNotFoundOption();
        this._open();
      } else {
        this._close();
      }
      return;
    }

    const query = this._input.value.trim();
    const exactMatch = this._results.some(s => s.toLowerCase() === query.toLowerCase());

    // If typed value isn't an exact match, show free-text option first
    if (!exactMatch && query && query !== 'School Not Found') {
      this._renderFreeTextOption(query);
    }

    this._results.forEach((school, idx) => {
      const li = document.createElement('li');
      li.setAttribute('role', 'option');
      li.dataset.idx = idx;

      const isNotFound = school === 'School Not Found';

      li.className = [
        'px-4 py-2.5 cursor-pointer flex items-center gap-2',
        'transition-colors duration-100',
        isNotFound ? 'text-amber-600 font-medium border-t border-dashed border-gray-200 bg-amber-50 hover:bg-amber-100'
          : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-700'
      ].join(' ');

      if (isNotFound) {
        li.innerHTML = `<i class="fas fa-exclamation-circle text-amber-500 text-xs"></i> ${school}`;
      } else {
        li.innerHTML = `<i class="fas fa-school text-indigo-300 text-xs"></i> ${this._highlight_text(school, this._input.value.trim())}`;
      }

      li.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this._select(school);
      });

      this._list.appendChild(li);
    });

    this._open();
  }

  /** Render a "use as typed" free-text option */
  _renderFreeTextOption(query) {
    const li = document.createElement('li');
    li.setAttribute('role', 'option');
    li.className = 'px-4 py-2.5 cursor-pointer flex items-center gap-2 text-indigo--700 bg-indigo-50 hover:bg-indigo-100 font-medium border-b border-indigo-100 transition-colors duration-100';
    li.innerHTML = `<i class="fas fa-pencil-alt text-indigo-400 text-xs"></i> Use: "<strong>${query}</strong>"`;
    li.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this._select(query);
    });
    this._list.appendChild(li);
  }

  /** Render the standard School Not Found option */
  _renderNotFoundOption() {
    const li = document.createElement('li');
    li.setAttribute('role', 'option');
    li.className = 'px-4 py-2.5 cursor-pointer flex items-center gap-2 text-amber-600 font-medium bg-amber-50 hover:bg-amber-100 transition-colors duration-100';
    li.innerHTML = `<i class="fas fa-exclamation-circle text-amber-500 text-xs"></i> School Not Found`;
    li.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this._select('School Not Found');
    });
    this._list.appendChild(li);
  }

  /** Bold the matched portion of the school name */
  _highlight_text(text, query) {
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      text.substring(0, idx) +
      `<strong class="text-indigo-600">${text.substring(idx, idx + query.length)}</strong>` +
      text.substring(idx + query.length)
    );
  }

  _highlight() {
    const items = this._list.querySelectorAll('li');
    items.forEach((li, i) => {
      if (i === this._activeIdx) {
        li.classList.add('bg-indigo-50', 'text-indigo-700');
        li.scrollIntoView({ block: 'nearest' });
      } else {
        li.classList.remove('bg-indigo-50', 'text-indigo-700');
      }
    });
  }

  _select(value) {
    this._input.value = value;
    this._close();

    // Visual confirmation flash
    this._input.classList.add('border-green-500');
    setTimeout(() => this._input.classList.remove('border-green-500'), 1500);

    if (typeof this.onSelect === 'function') this.onSelect(value);

    // Trigger change event so saveFormData picks it up
    this._input.dispatchEvent(new Event('input', { bubbles: true }));
  }

  _open() {
    this._list.classList.remove('hidden');
    this._input.setAttribute('aria-expanded', 'true');
    this._isOpen = true;
  }

  _close() {
    this._list.classList.add('hidden');
    this._input.setAttribute('aria-expanded', 'false');
    this._isOpen = false;
    this._activeIdx = -1;
  }

  _showSpinner(show) {
    if (show) this._spinner.classList.remove('hidden');
    else this._spinner.classList.add('hidden');
  }

  /** Re-initialize (e.g. after DOM changes) */
  destroy() {
    clearTimeout(this._timer);
    if (this._abortCtrl) this._abortCtrl.abort();
    this._wrapper.replaceWith(this._input);
    this._input.removeAttribute('autocomplete');
    this._input.removeAttribute('aria-autocomplete');
    this._input.removeAttribute('aria-haspopup');
    this._input.removeAttribute('aria-expanded');
  }
}

// Expose globally
window.SchoolAutocomplete = SchoolAutocomplete;
